import { Request, Response } from 'express';

// Deze speciale route zal werken zelfs als Firebase Admin initialisatie mislukt
export function setupEmergencyRoutes(app: any) {
  // Een eenvoudige noodroute die altijd werkt
  app.get('/api/emergency/health', (_req: Request, res: Response) => {
    res.json({
      status: 'online',
      message: 'Emergency route is working',
      timestamp: new Date().toISOString()
    });
  });
  
  // Een route die informatie verzamelt voor diagnostiek, maar geen Firebase gebruikt
  app.get('/api/emergency/diagnostics', (_req: Request, res: Response) => {
    // Verzamel alle belangrijke omgevingsinformatie
    const diagnostics = {
      time: new Date().toISOString(),
      environment: {
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        env: process.env.NODE_ENV || 'undefined'
      },
      environmentVariables: {
        // Controleer alleen of variabelen bestaan, niet hun waarden
        FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
        FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
        FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
        FIREBASE_PRIVATE_KEY_length: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.length : 0,
        FIREBASE_DATABASE_URL: !!process.env.FIREBASE_DATABASE_URL,
        VITE_FIREBASE_API_KEY: !!process.env.VITE_FIREBASE_API_KEY,
        VITE_FIREBASE_APP_ID: !!process.env.VITE_FIREBASE_APP_ID,
        VITE_FIREBASE_PROJECT_ID: !!process.env.VITE_FIREBASE_PROJECT_ID,
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: !!process.env.VERCEL
      },
      // Controleer of de private key correct is geformatteerd
      privateKey: {
        exists: !!process.env.FIREBASE_PRIVATE_KEY,
        length: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.length : 0,
        startsWithQuote: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.startsWith('"') : false,
        endsWithQuote: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.endsWith('"') : false,
        containsBeginTag: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.includes('BEGIN PRIVATE KEY') : false,
        containsEndTag: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.includes('END PRIVATE KEY') : false,
        containsNewlines: process.env.FIREBASE_PRIVATE_KEY ? (
          process.env.FIREBASE_PRIVATE_KEY.includes('\\n') || 
          process.env.FIREBASE_PRIVATE_KEY.includes('\n')
        ) : false
      },
      moduleResolution: {
        // Controleer of belangrijke modules beschikbaar zijn
        firebase_admin: tryResolveModule('firebase-admin'),
        express: tryResolveModule('express'),
        zod: tryResolveModule('zod')
      }
    };
    
    // Stuur de diagnostische informatie terug
    res.json({
      success: true,
      message: 'Diagnostische informatie verzameld',
      data: diagnostics
    });
  });
  
  // Test voor het decoderen van de Firebase private key
  app.get('/api/emergency/decrypt-key', (_req: Request, res: Response) => {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    let processedKey = '';
    let decodedSuccessfully = false;
    let sanitizedKey = '';
    
    try {
      if (privateKey) {
        // Vervang escaped newlines door echte newlines
        processedKey = privateKey.replace(/\\n/g, '\n');
        
        // Verwijder quotes aan begin en einde indien aanwezig
        if (processedKey.startsWith('"') && processedKey.endsWith('"')) {
          processedKey = processedKey.substring(1, processedKey.length - 1);
        }
        
        // Controleer of het key formaat correct is
        decodedSuccessfully = 
          processedKey.includes('-----BEGIN PRIVATE KEY-----') && 
          processedKey.includes('-----END PRIVATE KEY-----');
          
        // Maak een veilige versie voor output (toon alleen begin en einde)
        if (processedKey.length > 0) {
          const parts = processedKey.split('\n');
          if (parts.length > 2) {
            sanitizedKey = `${parts[0]}\n${parts[1].substring(0, 5)}...[truncated]...${parts[parts.length-2].substring(parts[parts.length-2].length - 5)}\n${parts[parts.length-1]}`;
          } else {
            sanitizedKey = '[Invalid key format]';
          }
        }
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Kon de key niet verwerken',
        message: error instanceof Error ? error.message : String(error)
      });
    }
    
    return res.json({
      success: true,
      message: decodedSuccessfully ? 'Key lijkt correct geformatteerd' : 'Key heeft niet het juiste formaat',
      format: {
        wasProcessed: !!privateKey,
        newlinesReplaced: privateKey ? privateKey.includes('\\n') : false,
        quotesRemoved: privateKey ? (privateKey.startsWith('"') && privateKey.endsWith('"')) : false,
        containsHeaders: decodedSuccessfully,
        length: privateKey ? processedKey.length : 0
      },
      sanitizedKey
    });
  });
  
  console.log('[Emergency] Noodroutes geactiveerd op /api/emergency/...');
}

// Helper functie om te controleren of modules beschikbaar zijn
function tryResolveModule(moduleName: string): { available: boolean; error?: string } {
  try {
    require.resolve(moduleName);
    return { available: true };
  } catch (error) {
    return { 
      available: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}