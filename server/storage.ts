import { 
  members,
  memberRequests,
  deletedMemberNumbers,
  type Member,
  type InsertMember,
  type MemberRequest,
  type InsertMemberRequest,
  type DeletedMemberNumber,
  type InsertDeletedMemberNumber
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, asc, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Member operations
  getMember(id: number): Promise<Member | undefined>;
  listMembers(): Promise<Member[]>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: number, member: Partial<InsertMember>): Promise<Member>;
  deleteMember(id: number): Promise<void>;
  generateMemberNumber(): Promise<number>;
  
  // Verwijderde lidnummers beheer
  addDeletedMemberNumber(memberNumber: number): Promise<DeletedMemberNumber>;
  getDeletedMemberNumbers(): Promise<DeletedMemberNumber[]>;
  getNextAvailableMemberNumber(): Promise<number>;
  removeDeletedMemberNumber(memberNumber: number): Promise<void>;
  
  // Lidmaatschapsaanvragen beheer
  getMemberRequest(id: number): Promise<MemberRequest | undefined>;
  listMemberRequests(): Promise<MemberRequest[]>;
  createMemberRequest(request: InsertMemberRequest): Promise<MemberRequest>;
  updateMemberRequestStatus(id: number, status: 'pending' | 'approved' | 'rejected', processedBy?: number): Promise<MemberRequest>;
  deleteMemberRequest(id: number): Promise<void>;
  approveMemberRequest(id: number, processedBy: number): Promise<Member>;

  // Session store for authentication
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // Member operations
  async getMember(id: number): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.id, id));
    return member;
  }

  async listMembers(): Promise<Member[]> {
    return await db.select().from(members);
  }

  async createMember(member: InsertMember): Promise<Member> {
    // Zorg dat het lid een lidnummer heeft
    if (!member.memberNumber) {
      member.memberNumber = await this.generateMemberNumber();
      console.log(`Nieuw lidnummer toegewezen: ${member.memberNumber}`);
    }
    
    // We gaan de variabele niet meer gebruiken, de code is overbodig geworden
    // Het was oorspronkelijk bedoeld om de velden voor te bereiden voor database-invoer
    // maar dat doen we nu direct in memberData
    
    // Verzamel alle velden die we willen invoegen
    const memberData = {
      memberNumber: member.memberNumber!,
      firstName: member.firstName,
      lastName: member.lastName,
      phoneNumber: member.phoneNumber,
      gender: member.gender || null,
      birthDate: member.birthDate ? new Date(member.birthDate) : null,
      nationality: member.nationality || null,
      email: member.email || null,
      street: member.street || null,
      houseNumber: member.houseNumber || null,
      busNumber: member.busNumber || null,
      postalCode: member.postalCode || null,
      city: member.city || null,
      membershipType: member.membershipType || "standaard",
      startDate: member.startDate ? new Date(member.startDate) : new Date(),
      endDate: member.endDate ? new Date(member.endDate) : null,
      autoRenew: member.autoRenew !== undefined ? member.autoRenew : true,
      paymentTerm: member.paymentTerm || "jaarlijks",
      paymentMethod: member.paymentMethod || "cash",
      accountNumber: member.accountNumber || null,
      bicSwift: member.bicSwift || null,
      accountHolderName: member.accountHolderName || null,
      paymentStatus: member.paymentStatus || false,
      registrationDate: member.registrationDate || new Date(),
      privacyConsent: member.privacyConsent || false,
      notes: member.notes || null
    };
    
    // Voeg het lid toe
    // Drizzle ORM verwacht een array van objecten bij .values(), dus gebruik [memberData]
    const [created] = await db.insert(members).values([memberData] as any).returning();
    return created;
  }

  async updateMember(id: number, member: Partial<InsertMember>): Promise<Member> {
    // Maak een expliciete update object dat alleen de gedefinieerde waarden bevat
    const updateObj: Record<string, any> = {};
    
    // Voeg alleen de velden toe die worden bijgewerkt met de juiste types
    // Basis velden
    if (member.firstName !== undefined) updateObj.firstName = member.firstName;
    if (member.lastName !== undefined) updateObj.lastName = member.lastName;
    if (member.phoneNumber !== undefined) updateObj.phoneNumber = member.phoneNumber;
    if (member.memberNumber !== undefined) updateObj.memberNumber = member.memberNumber;
    
    // Persoonsgegevens
    if (member.gender !== undefined) updateObj.gender = member.gender || null;
    if (member.nationality !== undefined) updateObj.nationality = member.nationality || null;
    
    // Contactgegevens
    if (member.email !== undefined) updateObj.email = member.email || null;
    if (member.street !== undefined) updateObj.street = member.street || null;
    if (member.houseNumber !== undefined) updateObj.houseNumber = member.houseNumber || null;
    if (member.busNumber !== undefined) updateObj.busNumber = member.busNumber || null;
    if (member.postalCode !== undefined) updateObj.postalCode = member.postalCode || null;
    if (member.city !== undefined) updateObj.city = member.city || null;
    
    // Lidmaatschap
    if (member.membershipType !== undefined) updateObj.membershipType = member.membershipType;
    if (member.startDate !== undefined) updateObj.startDate = member.startDate instanceof Date ? member.startDate : new Date(member.startDate);
    if (member.endDate !== undefined) updateObj.endDate = member.endDate ? (member.endDate instanceof Date ? member.endDate : new Date(member.endDate)) : null;
    if (member.autoRenew !== undefined) updateObj.autoRenew = member.autoRenew;
    if (member.paymentTerm !== undefined) updateObj.paymentTerm = member.paymentTerm;
    if (member.paymentMethod !== undefined) updateObj.paymentMethod = member.paymentMethod;
    
    // Bankgegevens
    if (member.bicSwift !== undefined) updateObj.bicSwift = member.bicSwift || null;
    if (member.accountHolderName !== undefined) updateObj.accountHolderName = member.accountHolderName || null;
    
    // Overig
    if (member.paymentStatus !== undefined) updateObj.paymentStatus = member.paymentStatus;
    if (member.privacyConsent !== undefined) updateObj.privacyConsent = member.privacyConsent;
    if (member.notes !== undefined) updateObj.notes = member.notes || null;
    
    // Behandel datums en complexe types met speciale logica
    if (member.registrationDate !== undefined) {
      updateObj.registrationDate = member.registrationDate;
    }
    
    if (member.birthDate !== undefined) {
      // Behandel de birthDate met extra voorzorgsmaatregelen
      if (member.birthDate === null) {
        // Als null is doorgegeven, gebruik null
        updateObj.birthDate = null;
      } else if (member.birthDate instanceof Date) {
        // Als het al een Date is, gebruik deze direct
        updateObj.birthDate = member.birthDate;
      } else if (member.birthDate === "") {
        // Als het een lege string is, gebruik null
        updateObj.birthDate = null;
      } else if (typeof member.birthDate === 'string') {
        // Als het een string is, probeer deze te parsen
        try {
          const parsedDate = new Date(member.birthDate);
          if (isNaN(parsedDate.getTime())) {
            console.error("Invalid date string in storage:", member.birthDate);
            // Als het een ongeldige datum is, gebruik null
            updateObj.birthDate = null;
          } else {
            updateObj.birthDate = parsedDate;
          }
        } catch (error) {
          console.error("Error parsing date in storage:", error);
          updateObj.birthDate = null;
        }
      } else {
        // In het geval dat we een onbekend type krijgen
        console.warn("Unknown type for birthDate in storage:", typeof member.birthDate);
        updateObj.birthDate = null;
      }
    }
    
    if (member.accountNumber !== undefined) {
      updateObj.accountNumber = member.accountNumber || null;
    }
    
    // Voer de update uit
    const [updated] = await db
      .update(members)
      .set(updateObj)
      .where(eq(members.id, id))
      .returning();
    
    return updated;
  }

  async deleteMember(id: number): Promise<void> {
    // Haal eerst het lid op om het lidnummer te kunnen bewaren
    const member = await this.getMember(id);
    if (member) {
      // Verwijder het lid
      await db.delete(members).where(eq(members.id, id));
      
      // Voeg het lidnummer toe aan de lijst van verwijderde nummers voor hergebruik
      console.log(`Voeg lidnummer ${member.memberNumber} toe aan de lijst van verwijderde nummers`);
      await this.addDeletedMemberNumber(member.memberNumber);
    }
  }

  async generateMemberNumber(): Promise<number> {
    // Gebruik de getNextAvailableMemberNumber functie die nu alle logica bevat
    // voor zowel het hergebruiken van nummers als het genereren van nieuwe nummers
    return this.getNextAvailableMemberNumber();
  }
  
  // Methodes voor het beheren van verwijderde lidnummers
  async addDeletedMemberNumber(memberNumber: number): Promise<DeletedMemberNumber> {
    console.log(`Toevoegen van lidnummer ${memberNumber} aan de deleted_member_numbers tabel`);
    
    try {
      // Voeg alleen toe als het niet al in de deleted_member_numbers tabel zit
      const existing = await db.select()
        .from(deletedMemberNumbers)
        .where(eq(deletedMemberNumbers.memberNumber, memberNumber))
        .limit(1);
        
      if (existing && existing.length > 0) {
        console.log(`Lidnummer ${memberNumber} is al in de deleted_member_numbers tabel`);
        return existing[0];
      }
      
      // Nieuw verwijderd nummer toevoegen
      const [created] = await db.insert(deletedMemberNumbers)
        .values({ memberNumber })
        .returning();
      
      console.log(`Lidnummer ${memberNumber} toegevoegd aan deleted_member_numbers, ID: ${created.id}`);
      return created;
    } catch (error) {
      console.error(`Fout bij het toevoegen van lidnummer ${memberNumber} aan deleted_member_numbers:`, error);
      throw error;
    }
  }
  
  async getDeletedMemberNumbers(): Promise<DeletedMemberNumber[]> {
    return await db.select()
      .from(deletedMemberNumbers)
      .orderBy(asc(deletedMemberNumbers.memberNumber));
  }
  
  async getNextAvailableMemberNumber(): Promise<number> {
    console.log("Zoeken naar het volgende beschikbare lidnummer");
    
    try {
      // Stap 1: Controleer eerst of er verwijderde lidnummers beschikbaar zijn
      const deletedNumbers = await db.select()
        .from(deletedMemberNumbers)
        .orderBy(asc(deletedMemberNumbers.deletedAt));
      
      console.log(`Aantal gevonden verwijderde lidnummers: ${deletedNumbers.length}`);
      
      // Stap 2: Als er verwijderde nummers zijn, gebruik het oudste verwijderde nummer
      if (deletedNumbers.length > 0) {
        const oldestDeletedNumber = deletedNumbers[0];
        console.log(`Poging tot hergebruik verwijderd lidnummer: ${oldestDeletedNumber.memberNumber} (ID: ${oldestDeletedNumber.id})`);
        
        // Stap 3: Controleer of het lidnummer niet al in gebruik is (extra veiligheidscheck)
        const existingMember = await db.select()
          .from(members)
          .where(eq(members.memberNumber, oldestDeletedNumber.memberNumber))
          .limit(1);
        
        if (existingMember.length > 0) {
          console.log(`Let op: Lidnummer ${oldestDeletedNumber.memberNumber} is al in gebruik! Verwijder dit uit de deleted_member_numbers tabel.`);
          
          // Verwijder dit nummer uit de lijst van verwijderde nummers, omdat het al in gebruik is
          await this.removeDeletedMemberNumber(oldestDeletedNumber.memberNumber);
          
          // Probeer het opnieuw (recursief) voor het volgende beschikbare nummer
          return this.getNextAvailableMemberNumber();
        }
        
        // Stap 4: Als het nummer niet in gebruik is, verwijder het uit de tabel met verwijderde nummers
        console.log(`Hergebruik verwijderd lidnummer: ${oldestDeletedNumber.memberNumber}`);
        await this.removeDeletedMemberNumber(oldestDeletedNumber.memberNumber);
        
        // Stap 5: Retourneer het beschikbare nummer
        return oldestDeletedNumber.memberNumber;
      }
      
      // Stap 6: Als er geen verwijderde nummers zijn, zoek het hoogste lidnummer in de database
      console.log("Geen verwijderde nummers gevonden, zoeken naar hoogste bestaande lidnummer");
      const allMemberNumbers = await db.select({ memberNumber: members.memberNumber })
        .from(members)
        .orderBy(desc(members.memberNumber));
      
      // Verzamel alle lidnummers om een gat in de nummerreeks te vinden
      const usedNumbers = allMemberNumbers.map(m => m.memberNumber).sort((a, b) => a - b);
      console.log(`Bestaande lidnummers: ${usedNumbers.join(', ') || 'geen'}`);
      
      // Stap 7: Zoek het eerste ontbrekende nummer in de reeks, of gebruik het volgende beschikbare nummer
      let nextNumber = 1; // Begin standaard bij 1
      
      if (usedNumbers.length > 0) {
        // Zoek een gat in de reeks
        let foundGap = false;
        for (let i = 0; i < usedNumbers.length; i++) {
          // Als we een gat vinden (verwachte nummer is niet het feitelijke nummer)
          if (i + 1 !== usedNumbers[i]) {
            nextNumber = i + 1;
            foundGap = true;
            console.log(`Gat gevonden in de lidnummerreeks bij ${nextNumber}`);
            break;
          }
        }
        
        // Als er geen gat is gevonden, gebruik het volgende nummer na het hoogste
        if (!foundGap) {
          nextNumber = usedNumbers[usedNumbers.length - 1] + 1;
        }
      }
      
      console.log(`Nieuw lidnummer gegenereerd: ${nextNumber}`);
      return nextNumber;
    } catch (error) {
      console.error("Fout bij het ophalen van het volgende beschikbare lidnummer:", error);
      
      // Fallback naar een eenvoudigere methode voor het genereren van een nieuw nummer
      try {
        const result = await db.execute<{ next_number: number }>(
          sql`SELECT COALESCE(MAX(${members.memberNumber}), 0) + 1 AS next_number FROM ${members}`
        );
        
        const nextNumber = result.rows[0]?.next_number || 1;
        console.log(`Fallback naar nieuw nummer: ${nextNumber}`);
        return nextNumber;
      } catch (fallbackError) {
        console.error("Fallback methode faalde ook:", fallbackError);
        // Als alle methoden falen, begin dan gewoon bij 1
        return 1;
      }
    }
  }
  
  async removeDeletedMemberNumber(memberNumber: number): Promise<void> {
    await db.delete(deletedMemberNumbers)
      .where(eq(deletedMemberNumbers.memberNumber, memberNumber));
  }
  
  // Lidmaatschapsaanvragen beheer
  async getMemberRequest(id: number): Promise<MemberRequest | undefined> {
    const [request] = await db.select().from(memberRequests).where(eq(memberRequests.id, id));
    return request;
  }

  async listMemberRequests(): Promise<MemberRequest[]> {
    return await db.select()
      .from(memberRequests)
      .orderBy(desc(memberRequests.requestDate));
  }

  async createMemberRequest(request: InsertMemberRequest): Promise<MemberRequest> {
    // Voeg IP-adres toe als het beschikbaar is maar niet in het verzoek zit
    if (request.ipAddress === undefined) {
      request.ipAddress = null;
    }

    // Zorg ervoor dat status altijd 'pending' is bij aanmaken
    const requestData = {
      ...request,
      status: 'pending',
      requestDate: new Date(),
    };

    // Voeg het verzoek toe
    const [created] = await db.insert(memberRequests).values([requestData] as any).returning();
    return created;
  }

  async updateMemberRequestStatus(
    id: number, 
    status: 'pending' | 'approved' | 'rejected', 
    processedBy?: number
  ): Promise<MemberRequest> {
    const updateData: Record<string, any> = { 
      status, 
      processedDate: new Date()
    };
    
    if (processedBy !== undefined) {
      updateData.processedBy = processedBy;
    }

    const [updated] = await db
      .update(memberRequests)
      .set(updateData)
      .where(eq(memberRequests.id, id))
      .returning();
    
    return updated;
  }

  async deleteMemberRequest(id: number): Promise<void> {
    await db.delete(memberRequests).where(eq(memberRequests.id, id));
  }

  async approveMemberRequest(id: number, processedBy: number): Promise<Member> {
    // Haal het verzoek op
    const request = await this.getMemberRequest(id);
    if (!request) {
      throw new Error(`Lidmaatschapsaanvraag met ID ${id} niet gevonden`);
    }

    // Controleer of het verzoek al is verwerkt
    if (request.status !== 'pending') {
      throw new Error(`Lidmaatschapsaanvraag met ID ${id} is al ${request.status}`);
    }

    // Bereid lid data voor
    const memberData: InsertMember = {
      firstName: request.firstName,
      lastName: request.lastName,
      phoneNumber: request.phoneNumber,
      email: request.email,
      gender: request.gender as any,
      birthDate: request.birthDate,
      nationality: request.nationality,
      street: request.street,
      houseNumber: request.houseNumber,
      busNumber: request.busNumber,
      postalCode: request.postalCode,
      city: request.city,
      membershipType: request.membershipType as any,
      startDate: new Date(),
      paymentStatus: false,
      registrationDate: new Date(),
      privacyConsent: request.privacyConsent,
      notes: request.notes || `Aangemaakt vanuit aanvraag #${id}`,
      accountNumber: request.accountNumber,
      bicSwift: request.bicSwift,
      accountHolderName: request.accountHolderName
    };

    // Maak een nieuw lid aan op basis van het verzoek
    const member = await this.createMember(memberData);

    // Update de status van het verzoek naar 'approved'
    await this.updateMemberRequestStatus(id, 'approved', processedBy);

    return member;
  }
}

export const storage = new DatabaseStorage();