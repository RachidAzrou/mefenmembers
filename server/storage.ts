import { 
  members,
  deletedMemberNumbers,
  type Member,
  type InsertMember,
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
      // Haal het oudste verwijderde lidnummer op (het nummer dat het langst geleden is verwijderd)
      const deletedNumbers = await db.select()
        .from(deletedMemberNumbers)
        .orderBy(asc(deletedMemberNumbers.deletedAt));
      
      console.log(`Aantal gevonden verwijderde lidnummers: ${deletedNumbers.length}`);
      
      if (deletedNumbers.length === 0) {
        // Geen verwijderde nummers beschikbaar, genereer een nieuw nummer
        const existingMembers = await db.select({ memberNumber: members.memberNumber })
          .from(members)
          .orderBy(desc(members.memberNumber))
          .limit(1);
        
        // Als er al leden zijn, neem het hoogste lidnummer + 1
        // Anders begin bij 1
        const highestMemberNumber = existingMembers.length > 0 ? existingMembers[0].memberNumber : 0;
        const nextNumber = highestMemberNumber + 1;
        
        console.log(`Geen verwijderde nummers beschikbaar, nieuw nummer gegenereerd: ${nextNumber}`);
        return nextNumber;
      }
      
      // Gebruik het oudste verwijderde nummer
      const oldestDeletedNumber = deletedNumbers[0];
      console.log(`Hergebruik verwijderd lidnummer: ${oldestDeletedNumber.memberNumber} (ID: ${oldestDeletedNumber.id})`);
      
      // Controleer of het lidnummer niet al in gebruik is (extra veiligheidscheck)
      const existingMember = await db.select()
        .from(members)
        .where(eq(members.memberNumber, oldestDeletedNumber.memberNumber))
        .limit(1);
      
      if (existingMember.length > 0) {
        console.log(`Let op: Lidnummer ${oldestDeletedNumber.memberNumber} is al in gebruik! Verwijder deze uit de deleted_member_numbers tabel.`);
        
        // Verwijder dit nummer uit de lijst van verwijderde nummers, omdat het al in gebruik is
        await this.removeDeletedMemberNumber(oldestDeletedNumber.memberNumber);
        
        // Probeer het opnieuw (recursief) voor het volgende beschikbare nummer
        return this.getNextAvailableMemberNumber();
      }
      
      // Verwijder dit nummer uit de lijst van verwijderde nummers, zodat het niet opnieuw wordt gebruikt
      await this.removeDeletedMemberNumber(oldestDeletedNumber.memberNumber);
      
      // Retourneer het beschikbare nummer
      return oldestDeletedNumber.memberNumber;
    } catch (error) {
      console.error("Fout bij het ophalen van het volgende beschikbare lidnummer:", error);
      
      // Fallback naar het genereren van een nieuw nummer
      const existingMembers = await db.select({ memberNumber: members.memberNumber })
        .from(members)
        .orderBy(desc(members.memberNumber))
        .limit(1);
      
      const highestMemberNumber = existingMembers.length > 0 ? existingMembers[0].memberNumber : 0;
      const nextNumber = highestMemberNumber + 1;
      
      console.log(`Fallback naar nieuw nummer: ${nextNumber}`);
      return nextNumber;
    }
  }
  
  async removeDeletedMemberNumber(memberNumber: number): Promise<void> {
    await db.delete(deletedMemberNumbers)
      .where(eq(deletedMemberNumbers.memberNumber, memberNumber));
  }
}

export const storage = new DatabaseStorage();