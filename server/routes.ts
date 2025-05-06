import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMemberSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { syncMemberToFirebase } from "./firebase-logger";

export async function registerRoutes(app: Express): Promise<Server> {
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

  app.get("/api/members", async (req: Request, res: Response) => {
    try {
      // Als er een id parameter is, dan halen we een specifiek lid op
      if (req.query.id) {
        const id = parseInt(req.query.id as string);
        if (isNaN(id)) {
          return res.status(400).json({ error: "Invalid ID format" });
        }
        
        const member = await storage.getMember(id);
        if (!member) {
          return res.status(404).json({ error: "Member not found" });
        }

        return res.json(member);
      }

      // Anders halen we alle leden op
      const members = await storage.listMembers();
      res.json(members);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  app.post("/api/members", async (req: Request, res: Response) => {
    try {
      const validationResult = insertMemberSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ error: errorMessage });
      }

      // Altijd een lidnummer genereren voor nieuwe leden (zelfs als er een is meegegeven)
      // Dit is een snelle database bewerking die potentiële dubbele nummers voorkomt
      const rawNumber = await storage.generateMemberNumber();
      
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
      
      // Geoptimaliseerde verwerking met minder SQL-queries
      const member = await storage.createMember(memberData);
      
      // Synchroniseer het nieuwe lid met Firebase en log de activiteit
      syncMemberToFirebase(member, 'create').catch(err => 
        console.error('Firebase sync error on create:', err)
      );
      
      // Stuur direct een 201 Created status met minimale data terug
      // voor snellere respons, met alleen de essentiële velden
      res.status(201).json({
        id: member.id,
        memberNumber: member.memberNumber,
        firstName: member.firstName,
        lastName: member.lastName,
      });
    } catch (error) {
      console.error("Error creating member:", error);
      res.status(500).json({ error: "Failed to create member" });
    }
  });

  app.put("/api/members", async (req: Request, res: Response) => {
    try {
      const id = req.query.id ? parseInt(req.query.id as string) : undefined;
      if (!id || isNaN(id)) {
        return res.status(400).json({ error: "Invalid or missing ID parameter" });
      }

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
      
      // Synchroniseer de bijgewerkte lidgegevens met Firebase en log de activiteit
      syncMemberToFirebase(updatedMember, 'update').catch(err => 
        console.error('Firebase sync error on update:', err)
      );
      
      res.json(updatedMember);
    } catch (error) {
      console.error("Error updating member:", error);
      res.status(500).json({ error: "Failed to update member" });
    }
  });

  app.delete("/api/members", async (req: Request, res: Response) => {
    try {
      const id = req.query.id ? parseInt(req.query.id as string) : undefined;
      if (!id || isNaN(id)) {
        return res.status(400).json({ error: "Invalid or missing ID parameter" });
      }

      const member = await storage.getMember(id);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Registreer verwijdering in Firebase voordat we het lid verwijderen
      syncMemberToFirebase(member, 'delete').catch(err => 
        console.error('Firebase sync error on delete:', err)
      );
      
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
