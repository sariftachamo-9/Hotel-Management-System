import { useRef, useEffect, useState } from 'react';
import { Camera, AlertCircle, CheckCircle2, MapPin, ScanFace } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
}

export default function CameraCapture({ onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const requestPermissions = async () => {
    setIsRequesting(true);
    setError('');
    try {
      // Request location first
      await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported by your browser'));
        } else {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        }
      });

      // Then request camera/mic
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (e) {
        console.warn("Failed to get audio, trying video only");
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    } catch (err: any) {
      console.error("Error accessing permissions.", err);
      if (err.code === 1 || err.message.includes('denied')) {
        setError('Camera, Microphone, or Location access denied. Please allow permissions in your browser settings and try again.');
      } else {
        setError('Failed to access required permissions. Please ensure your device supports them.');
      }
    } finally {
      setIsRequesting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        
        // Simulate validation
        setIsValidating(true);
        setTimeout(() => {
          setIsValidating(false);
          onCapture(dataUrl);
        }, 2000);
      }
    }
  };

  if (!hasPermission) {
    return (
      <div className="flex flex-col items-center space-y-4 p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
        <div className="flex gap-4 mb-2">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
            <Camera className="w-8 h-8 text-gray-500" />
          </div>
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
            <MapPin className="w-8 h-8 text-gray-500" />
          </div>
        </div>
        <h4 className="font-semibold text-gray-800 text-center">Permissions Required</h4>
        <p className="text-sm text-gray-600 text-center max-w-xs">
          To verify your identity as a seller, we need to take a live photo and verify your location.
        </p>
        
        {error && (
          <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 p-3 rounded text-left w-full">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        
        <button 
          type="button" 
          onClick={requestPermissions}
          disabled={isRequesting}
          className="w-full bg-[#f85606] text-white px-6 py-2.5 rounded font-bold hover:bg-[#d04805] transition-colors disabled:opacity-70 flex justify-center"
        >
          {isRequesting ? 'Requesting...' : 'Allow Access'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="w-full bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
        <div className="w-16 h-16 shrink-0 rounded overflow-hidden border-2 border-green-500 relative">
          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop" alt="Sample valid photo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          <div className="absolute bottom-0 right-0 bg-green-500 rounded-tl p-0.5">
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
        </div>
        <div className="text-sm text-gray-700">
          <p className="font-semibold mb-1 text-gray-900">Valid Photo Requirements:</p>
          <ul className="list-disc pl-4 space-y-0.5 text-xs">
            <li>Face clearly visible and well-lit</li>
            <li>No sunglasses or hats</li>
            <li>Look directly at the camera</li>
          </ul>
        </div>
      </div>

      <div className="relative w-full max-w-sm aspect-video bg-black rounded overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        
        {/* Face guide overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-32 h-40 border-2 border-dashed border-white/50 rounded-[40%]"></div>
        </div>

        {isValidating && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white z-10">
            <ScanFace className="w-12 h-12 animate-pulse text-[#f85606] mb-3" />
            <p className="font-medium animate-pulse">Analyzing liveness & clarity...</p>
          </div>
        )}
      </div>
      
      <button 
        type="button" 
        onClick={handleCapture}
        disabled={isValidating}
        className="bg-[#f85606] text-white px-6 py-2 rounded font-bold hover:bg-[#d04805] transition-colors flex items-center gap-2 disabled:opacity-70"
      >
        <Camera className="w-5 h-5" />
        {isValidating ? 'Processing...' : 'Capture Photo'}
      </button>
    </div>
  );
}
