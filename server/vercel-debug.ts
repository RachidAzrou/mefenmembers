// Vercel Debugger Helper
// Deze file helpt bij het debuggen van Firebase initialisatie problemen in Vercel
import { Request, Response } from 'express';

export function setupVercelDebugging(app: any) {
  app.get('/api/debug/vercel', async (req: Request, res: Response) => {
    try {
      // Controleer welke omgevingsvariabelen bestaan (zonder de waarden te onthullen)
      const envVarsExist = {
        // Server-side Firebase Admin SDK vars
        FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
        FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
        FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
        FIREBASE_DATABASE_URL: !!process.env.FIREBASE_DATABASE_URL,
        
        // Client-side Firebase SDK vars
        VITE_FIREBASE_API_KEY: !!process.env.VITE_FIREBASE_API_KEY,
        VITE_FIREBASE_APP_ID: !!process.env.VITE_FIREBASE_APP_ID,
        VITE_FIREBASE_PROJECT_ID: !!process.env.VITE_FIREBASE_PROJECT_ID,
        
        // Overige vars
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: !!process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL_REGION: process.env.VERCEL_REGION,
        VERCEL_URL: process.env.VERCEL_URL
      };
      
      // Controleer de formattering van FIREBASE_PRIVATE_KEY
      let privateKeyInfo = {
        exists: !!process.env.FIREBASE_PRIVATE_KEY,
        length: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.length : 0,
        containsQuotes: false,
        containsNewlines: false,
        beginsWithDashes: false,
        firstChars: '',
        lastChars: ''
      };
      
      if (process.env.FIREBASE_PRIVATE_KEY) {
        const key = process.env.FIREBASE_PRIVATE_KEY;
        
        privateKeyInfo.containsQuotes = key.includes('"');
        privateKeyInfo.containsNewlines = key.includes('\\n') || key.includes('\n');
        privateKeyInfo.beginsWithDashes = key.includes('-----BEGIN PRIVATE KEY-----');
        
        if (key.length > 0) {
          privateKeyInfo.firstChars = key.substring(0, Math.min(20, key.length));
          privateKeyInfo.lastChars = key.substring(Math.max(0, key.length - 20));
        }
      }
      
      // Bundle veilige debug info samen
      const debugInfo = {
        timestamp: new Date().toISOString(),
        environment: {
          isVercel: !!process.env.VERCEL,
          nodeEnv: process.env.NODE_ENV,
          vercelEnv: process.env.VERCEL_ENV
        },
        envVarsExist,
        privateKeyInfo,
        request: {
          url: req.url,
          method: req.method,
          headers: req.headers
        }
      };
      
      // Stuur debug info terug
      res.json({
        success: true,
        message: 'Debug info verzameld',
        debug: debugInfo
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Kon debug info niet verzamelen',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  console.log('[Vercel Debug] Debug endpoints geactiveerd op /api/debug/vercel');
}