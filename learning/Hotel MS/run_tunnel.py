import subprocess
import time
import re

print("Starting cloudflared...")
process = subprocess.Popen(
    ['cloudflared.exe', 'tunnel', '--url', 'http://127.0.0.1:5000'],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    encoding='utf-8',
    errors='ignore'
)

start_time = time.time()
found_url = None

while time.time() - start_time < 30: # Wait up to 30 seconds
    line = process.stdout.readline()
    if not line:
        break
    print(f"DEBUG: {line.strip()}")
    match = re.search(r'https?://[a-zA-Z0-9-]+\.trycloudflare\.com', line)
    if match:
        found_url = match.group(0)
        print(f"\nFOUND URL: {found_url}")
        # Keep running but we found the URL
        break

if not found_url:
    print("\nURL NOT FOUND IN 30 SECONDS")
else:
    # URL found, keep printing lines
    try:
        while True:
            line = process.stdout.readline()
            if not line:
                break
            print(f"DEBUG: {line.strip()}")
    except KeyboardInterrupt:
        pass
    finally:
        process.terminate()
