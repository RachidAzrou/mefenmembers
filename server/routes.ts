import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMemberSchema, insertMemberRequestSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

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
      
      console.log("Updating member with ID:", id);
      console.log("Received update data:", req.body);
      
      // Maak een kopie van de request body
      let requestData = { ...req.body };
      console.log("Original request data:", requestData);
      
      // Verwerk de geboortedatum als deze aanwezig is
      if (requestData.birthDate !== undefined) {
        try {
          // Als birthDate een lege string is, zet deze op null
          if (requestData.birthDate === "") {
            console.log("Empty birthDate received, setting to null");
            requestData.birthDate = null;
          } 
          // Als het een string is, probeer deze te parsen naar een Date object
          else if (typeof requestData.birthDate === 'string') {
            console.log("String birthDate received:", requestData.birthDate);
            const date = new Date(requestData.birthDate);
            
            // Valideer of het een geldige datum is
            if (isNaN(date.getTime())) {
              console.log("Invalid date string received:", requestData.birthDate);
              return res.status(400).json({ error: "Ongeldige datum format. Gebruik DD/MM/YYYY of YYYY-MM-DD." });
            }
            
            // Alles is in orde, we laten Zod de conversie doen
            console.log("Valid date string received, will be processed by schema");
          }
          // Als het al een Date object is, gebruik het direct
          else if (requestData.birthDate instanceof Date) {
            console.log("Date object received:", requestData.birthDate);
            // Niets te doen, Zod handelt dit af
          }
          // Als het null is, accepteer dit
          else if (requestData.birthDate === null) {
            console.log("Null birthDate received, accepting as is");
          }
          // Onbekend formaat
          else {
            console.log("Unknown birthDate format received:", typeof requestData.birthDate);
            return res.status(400).json({ error: "Onbekend datum format. Gebruik een string of null." });
          }
        } catch (dateError) {
          console.error("Error processing birthDate:", dateError);
          return res.status(400).json({ error: "Fout bij verwerken van geboortedatum. Controleer het format." });
        }
      } else {
        console.log("No birthDate field in request");
      }
      
      // Valideer alleen de velden die worden bijgewerkt
      const validationResult = insertMemberSchema.partial().safeParse(requestData);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        console.error("Validation error:", errorMessage);
        return res.status(400).json({ error: errorMessage });
      }
      
      const member = await storage.getMember(id);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      console.log("Validated data to update:", validationResult.data);
      const updatedMember = await storage.updateMember(id, validationResult.data);
      console.log("Member updated successfully:", updatedMember);
      
      res.json(updatedMember);
    } catch (error) {
      console.error("Error updating member:", error);
      res.status(500).json({ error: "Failed to update member: " + (error instanceof Error ? error.message : String(error)) });
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

      await storage.deleteMember(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting member:", error);
      res.status(500).json({ error: "Failed to delete member" });
    }
  });

  // Member request routes
  app.get("/api/member-requests", async (req: Request, res: Response) => {
    try {
      // Als er een id parameter is, dan halen we een specifiek verzoek op
      if (req.query.id) {
        const id = parseInt(req.query.id as string);
        if (isNaN(id)) {
          return res.status(400).json({ error: "Ongeldig ID formaat" });
        }
        
        const request = await storage.getMemberRequest(id);
        if (!request) {
          return res.status(404).json({ error: "Aanvraag niet gevonden" });
        }

        return res.json(request);
      }

      // Anders halen we alle verzoeken op
      const requests = await storage.listMemberRequests();
      res.json(requests);
    } catch (error) {
      console.error("Fout bij ophalen lidmaatschapsaanvragen:", error);
      res.status(500).json({ error: "Kon lidmaatschapsaanvragen niet ophalen" });
    }
  });

  // Publieke route voor het indienen van een lidmaatschapsaanvraag (geen authenticatie vereist)
  app.post("/api/member-requests", async (req: Request, res: Response) => {
    try {
      const validationResult = insertMemberRequestSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ error: errorMessage });
      }

      // Voeg IP-adres toe voor veiligheid (indien beschikbaar)
      const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      
      const requestData = {
        ...validationResult.data,
        ipAddress: ipAddress as string | null
      };
      
      const request = await storage.createMemberRequest(requestData);
      
      res.status(201).json({
        id: request.id,
        message: "Uw aanvraag is succesvol ingediend en wordt zo spoedig mogelijk verwerkt."
      });
    } catch (error) {
      console.error("Fout bij aanmaken lidmaatschapsaanvraag:", error);
      res.status(500).json({ error: "Kon lidmaatschapsaanvraag niet aanmaken" });
    }
  });

  // Route voor het bijwerken van een aanvraagstatus (alleen voor beheerders)
  app.put("/api/member-requests/status", async (req: Request, res: Response) => {
    try {
      const id = req.query.id ? parseInt(req.query.id as string) : undefined;
      if (!id || isNaN(id)) {
        return res.status(400).json({ error: "Ongeldig of ontbrekend ID" });
      }

      const { status, processedBy, notes } = req.body;
      
      if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: "Ongeldige status. Gebruik 'pending', 'approved' of 'rejected'" });
      }

      const request = await storage.getMemberRequest(id);
      if (!request) {
        return res.status(404).json({ error: "Aanvraag niet gevonden" });
      }

      const updatedRequest = await storage.updateMemberRequestStatus(
        id, 
        status as 'pending' | 'approved' | 'rejected',
        processedBy ? parseInt(processedBy as string) : undefined,
        notes
      );
      
      res.json(updatedRequest);
    } catch (error) {
      console.error("Fout bij bijwerken aanvraagstatus:", error);
      res.status(500).json({ error: "Kon aanvraagstatus niet bijwerken" });
    }
  });

  // VOLLEDIG HERSCHREVEN: Route voor het goedkeuren en omzetten van een aanvraag naar een lid
  app.post("/api/member-requests/approve", async (req: Request, res: Response) => {
    try {
      console.log("===== START GOEDKEURING PROCEDURE =====");
      console.log("Request body:", JSON.stringify(req.body));
      console.log("Query params:", req.query);
      
      // Stap 1: ID parameter valideren
      const id = req.query.id ? parseInt(req.query.id as string) : undefined;
      if (!id || isNaN(id)) {
        console.error("Fout: Ongeldig ID", req.query.id);
        return res.status(400).json({ 
          error: "Ongeldig of ontbrekend ID", 
          success: false 
        });
      }
      
      // Stap 2: We halen de verplichte velden uit de bestaande aanvraag
      // Dit is de nieuwe aanpak waarbij de client alleen het ID stuurt
      // en de server de rest ophaalt
      console.log("De nieuwe clientcode stuurt alleen ID en processedBy, we halen alle gegevens op uit storage");
      
      // Stap 3: Ophalen bestaande aanvraag om te controleren of deze al verwerkt is
      const existingRequest = await storage.getMemberRequest(id);
      if (!existingRequest) {
        console.error(`Fout: Aanvraag ${id} niet gevonden`);
        return res.status(404).json({ 
          error: "Aanvraag niet gevonden", 
          success: false 
        });
      }

      console.log(`Bestaande aanvraag gevonden: ${existingRequest.firstName} ${existingRequest.lastName} (status: ${existingRequest.status})`);
      
      // Stap 4: Controleer of de aanvraag al verwerkt is
      if (existingRequest.status === 'approved') {
        console.log(`Aanvraag ${id} is al goedgekeurd, stuur bestaande gegevens terug`);
        
        // Controleer of we alle nodige informatie hebben
        if (existingRequest.memberId && existingRequest.memberNumber) {
          return res.status(200).json({
            message: "Aanvraag was al goedgekeurd",
            memberId: existingRequest.memberId,
            memberNumber: existingRequest.memberNumber,
            success: true,
            alreadyApproved: true
          });
        }
        
        // Als de aanvraag approved is maar we geen memberNumber hebben, is er iets mis
        console.warn(`Aanvraag ${id} is gemarkeerd als approved maar mist memberNumber`);
      }
      
      if (existingRequest.status === 'rejected') {
        console.error(`Aanvraag ${id} is al afgewezen en kan niet meer worden goedgekeurd`);
        return res.status(409).json({
          error: "Aanvraag is al afgewezen en kan niet worden goedgekeurd",
          success: false
        });
      }
      
      // Stap 5: Verwerk de aanvraag - gebruik de gegevens uit het verzoek voor het geval dat
      // ze zijn bijgewerkt ten opzichte van de opgeslagen versie
      console.log(`Verwerken van goedkeuring voor aanvraag ${id}`);
      
      const processedBy = typeof req.body.processedBy === 'number' 
        ? req.body.processedBy 
        : (typeof req.body.processedBy === 'string' 
          ? parseInt(req.body.processedBy)
          : 1); // Default waarde
      
      try {
        // Gebruik de gecombineerde data (origineel + updates)
        const requestData = {
          ...existingRequest,  // Begin met bestaande data als basis
          ...req.body,         // Overschrijf met eventuele updates
          id                   // Zorg dat ID niet wordt overschreven
        };
        
        // Zorg ervoor dat velden het juiste type hebben
        if (typeof requestData.id !== 'number') requestData.id = id;
        
        console.log("Aanroepen approveMemberRequest met gecombineerde data");
        const member = await storage.approveMemberRequest(id, processedBy);
        
        console.log(`Aanvraag succesvol goedgekeurd: lid #${member.id} met nummer ${member.memberNumber} aangemaakt`);
        
        // Stuur een complete en consistente response terug
        return res.status(201).json({
          message: "Aanvraag goedgekeurd en lid aangemaakt",
          memberId: member.id,
          memberNumber: member.memberNumber,
          member: member,      // Stuur het volledige lid mee voor extra controle
          success: true
        });
      } catch (approvalError) {
        console.error("Fout tijdens goedkeuring:", approvalError);
        throw approvalError;  // Doorsturen naar de algemene error handler
      }
    } catch (error) {
      console.error("FOUT BIJ GOEDKEURING:", error);
      
      // Verbeterde foutafhandeling
      let statusCode = 500;
      let errorMessage = "Kon aanvraag niet goedkeuren";
      
      if (error instanceof Error) {
        errorMessage += ": " + error.message;
        
        if (error.message.includes("niet gevonden")) {
          statusCode = 404;
        } else if (error.message.includes("is al")) {
          statusCode = 409;
        } else if (error.message.includes("verplicht")) {
          statusCode = 400;
        }
      } else {
        errorMessage += ": " + String(error);
      }
      
      console.error(`Status ${statusCode} wordt teruggestuurd: ${errorMessage}`);
      
      return res.status(statusCode).json({ 
        error: errorMessage,
        success: false
      });
    } finally {
      console.log("===== EINDE GOEDKEURING PROCEDURE =====");
    }
  });

  // Route voor het verwijderen van een aanvraag
  app.delete("/api/member-requests", async (req: Request, res: Response) => {
    try {
      const id = req.query.id ? parseInt(req.query.id as string) : undefined;
      if (!id || isNaN(id)) {
        return res.status(400).json({ error: "Ongeldig of ontbrekend ID" });
      }

      const request = await storage.getMemberRequest(id);
      if (!request) {
        return res.status(404).json({ error: "Aanvraag niet gevonden" });
      }

      await storage.deleteMemberRequest(id);
      res.status(204).end();
    } catch (error) {
      console.error("Fout bij verwijderen lidmaatschapsaanvraag:", error);
      res.status(500).json({ error: "Kon lidmaatschapsaanvraag niet verwijderen" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
