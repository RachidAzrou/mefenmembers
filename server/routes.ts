import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage as firestoreStorage } from "./firestore-storage"; // Firestore implementatie
import { rtdbStorage } from "./rtdb-storage"; // Realtime Database implementatie
import { insertMemberSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { setupEmergencyRoutes } from "./emergency-entry";

// We maken een interface die alle gedeelde eigenschappen bevat
// Dit helpt TypeScript te begrijpen dat beide implementaties compatibel zijn
interface IDatabaseStorage {
  firestore: any;
  rtdb: any;
  getMember(id: string): Promise<any>;
  listMembers(): Promise<any[]>;
  createMember(member: any): Promise<any>;
  updateMember(id: string, member: any): Promise<any>;
  deleteMember(id: string): Promise<void>;
  generateMemberNumber(): Promise<number>;
  addDeletedMemberNumber(memberNumber: number): Promise<any>;
  getDeletedMemberNumbers(): Promise<any[]>;
  getNextAvailableMemberNumber(): Promise<number>;
  removeDeletedMemberNumber(memberNumber: number): Promise<void>;
  sessionStore: any;
}

// Bepaal welke storage implementatie te gebruiken
// Voorkeursvolgorde: 1) Firestore, 2) Realtime Database
// In productieomgeving moeten beide werken, maar RTDB is eenvoudiger
let storage: IDatabaseStorage = firestoreStorage; // Default naar Firestore

// Als Firestore niet beschikbaar is (vooral in Vercel), val terug op RTDB
if (!firestoreStorage.firestore && rtdbStorage.rtdb) {
  console.log('[ROUTES] Firestore niet beschikbaar, gebruik Realtime Database als fallback');
  storage = rtdbStorage;
} else if (!firestoreStorage.firestore && !rtdbStorage.rtdb) {
  console.error('[ROUTES] KRITIEKE FOUT: Geen database beschikbaar (Firestore en RTDB allebei onbeschikbaar)');
} else {
  console.log('[ROUTES] Gebruik Firestore als primaire database');
}

// Debug voor Vercel deployment
const isVercel = !!process.env.VERCEL;
console.log('[Server Routes] Draait in Vercel omgeving:', isVercel);
console.log('[Server Routes] NODE_ENV:', process.env.NODE_ENV);

export async function registerRoutes(app: Express): Promise<Server> {
  // Activeer noodfunctionaliteit (altijd ingeschakeld, ongeacht omgeving)
  // Deze routes werken altijd, zelfs als Firebase initialisatie volledig mislukt
  setupEmergencyRoutes(app);
  
  // Vercel debug functies verwijderd om build probleem op te lossen
  // Members routes
  // Generate unique member number (moet vóór /api/members/:id komen)
  app.get("/api/members/generate-number", async (_req: Request, res: Response) => {
    try {
      const rawNumber = await storage.generateMemberNumber();
      
      // Format lidnummer met voorloopnullen: 0001, 0002, etc.
      const memberNumber = rawNumber.toString().padStart(4, '0');
      
      res.json({ memberNumber });
    } catch (error) {
      console.error("Error generating member number:", error);
      res.status(500).json({ error: "Failed to generate member number" });
    }
  });

  app.get("/api/members", async (_req: Request, res: Response) => {
    try {
      // Controleer of een database-implementatie beschikbaar is
      if (!storage.firestore && !storage.rtdb) {
        console.error("[API] CRITICAL: Geen database service is beschikbaar!");
        
        if (process.env.VERCEL) {
          // Als we in productie zijn en geen toegang hebben tot beide databases,
          // stuur een duidelijk geformatteerde foutmelding
          return res.status(503).json({ 
            error: "Database service is tijdelijk niet beschikbaar.",
            vercelDeployment: true,
            message: "Geen van beide databases (Firestore en RTDB) is toegankelijk. Dit is waarschijnlijk een configuratieprobleem met Vercel.",
            suggestion: "Controleer of de Firebase-geheimen correct zijn geconfigureerd in de Vercel dashboard."
          });
        } else {
          return res.status(500).json({ error: "Geen database service is beschikbaar" });
        }
      }
      
      const members = await storage.listMembers();
      res.json(members);
    } catch (error) {
      console.error("[API] Error fetching members:", error);
      
      if (error instanceof Error) {
        console.error("[API] Error name:", error.name);
        console.error("[API] Error message:", error.message);
      }
      
      res.status(500).json({ 
        error: "Failed to fetch members",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : null) : undefined
      });
    }
  });

  app.get("/api/members/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      // Voor Firestore is ID een string, dus we hoeven het niet meer te parseren
      
      const member = await storage.getMember(id);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      res.json(member);
    } catch (error) {
      console.error("Error fetching member:", error);
      res.status(500).json({ error: "Failed to fetch member" });
    }
  });

  app.post("/api/members", async (req: Request, res: Response) => {
    try {
      console.log("[API] POST /api/members - Start request");
      console.log("[API] Request body:", JSON.stringify(req.body));
      
            // Controleer de beschikbaarheid van een database service
      // Met de RTDB-fallback zou dit eigenlijk niet nodig moeten zijn,
      // behalve als beide databaseservices onbeschikbaar zijn
      if ((storage.firestore === null || storage.firestore === undefined) && 
          (storage.rtdb === null || storage.rtdb === undefined)) {
        console.error("[API] CRITICAL: Geen database service is beschikbaar!");
        return res.status(500).json({ 
          error: "Database service is niet beschikbaar. Controleer server configuratie.", 
          code: "DATABASE_UNAVAILABLE" 
        });
      }
      
      const validationResult = insertMemberSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        console.log("[API] Validation failed:", errorMessage);
        return res.status(400).json({ error: errorMessage });
      }
      
      console.log("[API] Validation successful");

      try {
        // Altijd een lidnummer genereren voor nieuwe leden (zelfs als er een is meegegeven)
        console.log("[API] Generating member number...");
        const rawNumber = await storage.generateMemberNumber();
        console.log("[API] Generated member number:", rawNumber);
        
        // We moeten het ruwe nummer gebruiken omdat we in de database integers opslaan
        // Het nummer wordt bij weergave in de UI als string met voorloop-nullen weergegeven
        const memberNumber = rawNumber;
        
        // Voeg het lidnummer toe aan de data
        const memberData = {
          ...validationResult.data,
          memberNumber
        };
        
        // Zorg dat de registratiedatum goed is ingesteld
        if (!memberData.registrationDate) {
          memberData.registrationDate = new Date();
        }
        
        console.log("[API] Creating member with data:", JSON.stringify(memberData));
        
        // Geoptimaliseerde verwerking met minder SQL-queries
        const member = await storage.createMember(memberData);
        console.log("[API] Member created with ID:", member.id);
        
        // Stuur direct een 201 Created status met minimale data terug
        // voor snellere respons, met alleen de essentiële velden
        res.status(201).json({
          id: member.id,
          memberNumber: member.memberNumber,
          firstName: member.firstName,
          lastName: member.lastName,
        });
        
        console.log("[API] POST /api/members - Request completed successfully");
      } catch (memberError) {
        console.error("[API] Error tijdens lid toevoegen:", memberError);
        
        // Gedetailleerde foutinformatie voor debugging
        if (memberError instanceof Error) {
          console.error("[API] Error type:", memberError.constructor.name);
          console.error("[API] Error name:", memberError.name);
          console.error("[API] Error message:", memberError.message);
          console.error("[API] Error stack:", memberError.stack);
        }
        
        throw memberError; // Doorgooien naar de buitenste catch
      }
    } catch (error) {
      console.error("[API] TOP-LEVEL Error creating member:", error);
      
      // Gedetailleerde foutinformatie voor debugging
      if (error instanceof Error) {
        console.error("[API] TOP-LEVEL Error name:", error.name);
        console.error("[API] TOP-LEVEL Error message:", error.message);
        console.error("[API] TOP-LEVEL Error stack:", error.stack);
      }
      
      // Stuur een gedetailleerde foutmelding terug om de diagnose te vergemakkelijken
      res.status(500).json({ 
        error: "Failed to create member", 
        message: error instanceof Error ? error.message : "Unknown error",
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        vercel: !!process.env.VERCEL
      });
    }
  });

  app.put("/api/members/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      // Voor Firestore is ID een string, dus we hoeven het niet meer te parseren

      // Valideer alleen de velden die worden bijgewerkt
      const validationResult = insertMemberSchema.partial().safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ error: errorMessage });
      }
      
      const member = await storage.getMember(id);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      const updatedMember = await storage.updateMember(id, validationResult.data);
      res.json(updatedMember);
    } catch (error) {
      console.error("Error updating member:", error);
      res.status(500).json({ error: "Failed to update member" });
    }
  });

  app.delete("/api/members/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      // Voor Firestore is ID een string, dus we hoeven het niet meer te parseren

      const member = await storage.getMember(id);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      await storage.deleteMember(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting member:", error);
      res.status(500).json({ error: "Failed to delete member" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
