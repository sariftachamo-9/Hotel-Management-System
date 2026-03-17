import express from 'express';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import axios from 'axios';
import twilio from 'twilio';
import nodemailer from 'nodemailer';
import compression from 'compression';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for easier integration with external scripts if needed, or configure specifically
}));
app.use(compression());
app.use(express.json());
app.use(cookieParser());

// In-memory store for OTPs (in production, use Redis or DB)
const otpStore = new Map<string, { otp: string, expiresAt: number }>();

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD
  }
});

// Twilio Client (Lazy initialized)
let twilioClient: twilio.Twilio | null = null;
function getTwilioClient() {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !accountSid.startsWith('AC') || !authToken) {
      throw new Error('Twilio credentials missing or invalid. accountSid must start with AC.');
    }
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

// --- OTP Routes ---
app.post('/api/auth/otp/send', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number or email required' });

    const isEmail = phone.includes('@');
    
    // Generate 4-digit OTP (Real for email, 1234 for testing SMS)
    const otp = isEmail ? Math.floor(1000 + Math.random() * 9000).toString() : "1234";
    
    // Store OTP with 5-minute expiry
    otpStore.set(phone, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    if (isEmail) {
      // Send via Email (SMTP)
      const mailOptions = {
        from: process.env.SMTP_EMAIL,
        to: phone,
        subject: 'Your Verification Code',
        text: `Your Second Hand Market verification code is: ${otp}`,
        html: `<p>Your Second Hand Market verification code is: <strong>${otp}</strong></p>`
      };
      
      await transporter.sendMail(mailOptions);
      console.log(`[SMTP EMAIL] Sent OTP ${otp} to ${phone}`);
      return res.json({ success: true, simulated: false });
    } else {
      // Send via SMS (Twilio)
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
      
      // Validate Twilio credentials. If missing or invalid, use simulated SMS.
      if (!accountSid || !accountSid.startsWith('AC') || !authToken || !twilioPhone) {
         console.log(`[SIMULATED SMS] To: ${phone}, OTP: ${otp}`);
         return res.json({ success: true, simulated: true, otp });
      }

      const client = getTwilioClient();
      await client.messages.create({
        body: `Your Second Hand Market verification code is: ${otp}`,
        from: twilioPhone,
        to: phone.startsWith('+') ? phone : `+977${phone}`
      });

      return res.json({ success: true, simulated: false });
    }
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: error.message || 'Failed to send OTP' });
  }
});

app.post('/api/auth/otp/verify', (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

  const record = otpStore.get(phone);
  if (!record) {
    return res.status(400).json({ error: 'No OTP requested for this number' });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(phone);
    return res.status(400).json({ error: 'OTP expired' });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  // OTP is valid
  otpStore.delete(phone);
  res.json({ success: true });
});

// --- Google OAuth Routes ---
// --- General Mail Route ---
app.post('/api/mail/send', async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;
    if (!to || !subject) return res.status(400).json({ error: 'To and subject required' });

    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to,
      subject,
      text: text || '',
      html: html || ''
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`[SMTP EMAIL] Sent email to ${to} with subject: ${subject}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

app.post('/api/mail/welcome', async (req, res) => {
  try {
    const { to, name, isNewUser } = req.body;
    if (!to || !name) return res.status(400).json({ error: 'To and name required' });

    const greeting = getGreeting();
    const subject = isNewUser ? 'Welcome to Second Hand Market!' : 'Welcome back to Second Hand Market!';
    
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <p>Dear ${name},</p>
        <p><strong>${greeting}!</strong></p>
        <p>Welcome ${isNewUser ? 'to' : 'back to'} Second Hand Market! We are absolutely thrilled to have you here. Our platform is designed to provide you with the best deals on high-quality second-hand products, and we encourage you to visit us daily to discover new items and amazing discounts.</p>
        <p>We deeply value your presence in our community. With unlimited access to our ever-growing inventory, there is always something new waiting for you. There is no limit to what you can explore and achieve on our website.</p>
        <p>Thank you for choosing us, and we look forward to serving you every single day!</p>
        <p>Best regards,<br>The Second Hand Market Team</p>
      </div>
    `;

    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to,
      subject,
      html
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`[SMTP EMAIL] Sent welcome/login email to ${to}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error sending welcome email:', error);
    res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});

app.post('/api/mail/broadcast-offer', async (req, res) => {
  try {
    const { users, offerTitle, offerDescription } = req.body;
    if (!users || !Array.isArray(users) || !offerTitle) {
      return res.status(400).json({ error: 'Users array and offer details required' });
    }

    const greeting = getGreeting();
    const subject = `Special Offer: ${offerTitle}`;

    // Send emails in parallel (in a real app, use a queue for large numbers)
    const promises = users.map(user => {
      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <p>Dear ${user.name},</p>
          <p><strong>${greeting}!</strong></p>
          <p>We have an exciting new offer for you at Second Hand Market: <strong>${offerTitle}</strong> - ${offerDescription}</p>
          <p>We value your continued support and want to make sure you get the best deals possible. Log in today to take advantage of this special discount. We encourage you to use our website daily, as we constantly update our inventory with amazing new finds.</p>
          <p>Remember, there are no limitations on our platform—you have unlimited access to explore, buy, and sell.</p>
          <p>See you on the platform!</p>
          <p>Best regards,<br>The Second Hand Market Team</p>
        </div>
      `;

      return transporter.sendMail({
        from: process.env.SMTP_EMAIL,
        to: user.email,
        subject,
        html
      }).catch(err => console.error(`Failed to send offer to ${user.email}:`, err));
    });

    await Promise.all(promises);
    console.log(`[SMTP EMAIL] Broadcasted offer to ${users.length} users`);
    res.json({ success: true, count: users.length });
  } catch (error: any) {
    console.error('Error broadcasting offer:', error);
    res.status(500).json({ error: error.message || 'Failed to broadcast offer' });
  }
});

app.get('/api/auth/google/url', (req, res) => {
  const redirectUri = `${req.headers.origin}/api/auth/google/callback`;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  // Validate that the client ID and Secret exist
  if (!clientId || !clientId.includes('.apps.googleusercontent.com') || !clientSecret) {
    // Fallback to a simulated OAuth popup if keys are not configured
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return res.json({ url: `${protocol}://${host}/api/auth/google/mock` });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'email profile',
    access_type: 'offline',
    prompt: 'consent'
  });

  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
});

app.get('/api/auth/google/mock', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Sign in with Google (Simulated)</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f0f2f5; margin: 0; }
          .card { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
          .btn { background: #4285F4; color: white; border: none; padding: 12px 24px; border-radius: 4px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 20px; width: 100%; transition: background 0.2s; }
          .btn:hover { background: #3367D6; }
          .icon { width: 48px; height: 48px; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <svg class="icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <h2>Simulated Google Login</h2>
          <p style="color: #5f6368; font-size: 14px; line-height: 1.5;">Since the real GOOGLE_CLIENT_ID is not configured in the app settings, this is a simulated Google login screen.</p>
          <button class="btn" onclick="login()">
            Continue as Test User
          </button>
        </div>
        <script>
          function login() {
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                user: { 
                  email: 'test.user' + Math.floor(Math.random() * 1000) + '@gmail.com', 
                  name: 'Google Test User', 
                  picture: 'https://ui-avatars.com/api/?name=Google+Test+User&background=4285F4&color=fff' 
                }
              }, '*');
              window.close();
            } else {
              document.body.innerHTML = '<h3>Authentication successful. You can close this window.</h3>';
            }
          }
        </script>
      </body>
    </html>
  `);
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    // Determine the origin from the request headers or construct it
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });

    const { access_token } = tokenResponse.data;

    // Get user info
    const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const userInfo = userInfoResponse.data;

    // Send success message to parent window
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                user: {
                  email: '${userInfo.email}',
                  name: '${userInfo.name}',
                  picture: '${userInfo.picture}'
                }
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('OAuth error:', error.response?.data || error.message);
    res.status(500).send('Authentication failed');
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      logLevel: 'silent'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

startServer();
