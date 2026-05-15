import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Initialize Firebase Admin
const setupFirebaseAdmin = () => {
  try {
    if (getApps().length === 0) {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        initializeApp({
          projectId: config.projectId,
        });
        console.log('Firebase Admin initialized with Project ID:', config.projectId);
      } else {
        initializeApp();
        console.log('Firebase Admin initialized with default credentials');
      }
    }
    return getFirestore();
  } catch (error) {
    console.error('Firebase Admin init error:', error);
    return null;
  }
};

const firestore = setupFirebaseAdmin();
const authAdmin = getAuth();

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for Cloud Run
  app.set('trust proxy', 1);

  // Relaxed helmet for iframe/CORS compatibility
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    frameguard: false, // Allow iframes
  }));
  
  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
  });
  app.use('/api/', limiter);

  // Auth Middleware
  const authenticateToken = async (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Missing token' });

    try {
      const decodedToken = await authAdmin.verifyIdToken(token);
      req.user = decodedToken;
      next();
    } catch (error: any) {
      console.error('Auth check failed:', error.message);
      res.status(401).json({ error: 'Invalid token', details: error.message });
    }
  };

  app.get('/api/ping', (req, res) => {
    res.json({ message: 'pong' });
  });

  // API Routes
  app.post('/api/chat', authenticateToken, async (req: any, res: any) => {
    const { message, history, attachments } = req.body;
    if (!message && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Message or attachment is required' });
    }

    try {
      // Set headers for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Map history to Gemini format: [{ role: 'user' | 'model', parts: [{ text: string }] }]
      // Limit to last 10 messages for speed and token efficiency
      const formattedHistory = (history || []).slice(-10).map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview', // Speed
        config: {
          systemInstruction: 'You are Mani AI, a professional full-stack tech assistant. Provide clean, production-ready code, architectural guidance, and technical explanations. Always format code blocks with language tags.',
        },
        history: formattedHistory,
      });

      // Prepare multi-modal parts
      const parts: any[] = [];
      if (message) parts.push({ text: message });
      
      if (attachments && Array.isArray(attachments)) {
        attachments.forEach((file: any) => {
          if (file.base64 && file.mimeType) {
            parts.push({
              inlineData: {
                data: file.base64,
                mimeType: file.mimeType
              }
            });
          }
        });
      }

      const result = await chat.sendMessageStream({ 
        message: parts.length > 1 ? parts : message 
      });
      
      for await (const chunk of result) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error('Gemini error:', error);
      // If we already started streaming, we can't send a normal error JSON
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'AI Service failed', 
          details: error.message 
        });
      } else {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Unhandled Error:', err);
    res.status(err.status || 500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
