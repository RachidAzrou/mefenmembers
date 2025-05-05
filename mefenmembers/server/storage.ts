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
    }
    
    // Expliciete type conversie voor database compatibiliteit
    const preparedMember = {
      firstName: member.firstName,
      lastName: member.lastName,
      phoneNumber: member.phoneNumber,
      memberNumber: member.memberNumber,
      registrationDate: member.registrationDate || new Date(),
      email: member.email || null,
      birthDate: member.birthDate ? new Date(member.birthDate) : null,
      accountNumber: member.accountNumber || null,
      paymentStatus: member.paymentStatus || false,
      notes: member.notes || null
    };
    
    const [created] = await db.insert(members).values(preparedMember).returning();
    return created;
  }

  async updateMember(id: number, member: Partial<InsertMember>): Promise<Member> {
    // Maak een expliciete update object dat alleen de gedefinieerde waarden bevat
    const updateObj: Record<string, any> = {};
    
    // Voeg alleen de velden toe die worden bijgewerkt met de juiste types
    if (member.firstName !== undefined) updateObj.firstName = member.firstName;
    if (member.lastName !== undefined) updateObj.lastName = member.lastName;
    if (member.phoneNumber !== undefined) updateObj.phoneNumber = member.phoneNumber;
    if (member.memberNumber !== undefined) updateObj.memberNumber = member.memberNumber;
    if (member.email !== undefined) updateObj.email = member.email || null;
    if (member.paymentStatus !== undefined) updateObj.paymentStatus = member.paymentStatus;
    if (member.notes !== undefined) updateObj.notes = member.notes || null;
    
    // Behandel datums en complexe types met speciale logica
    if (member.registrationDate !== undefined) {
      updateObj.registrationDate = member.registrationDate;
    }
    
    if (member.birthDate !== undefined) {
      updateObj.birthDate = member.birthDate ? new Date(member.birthDate) : null;
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
    const [created] = await db.insert(deletedMemberNumbers)
      .values({ memberNumber })
      .returning();
    
    return created;
  }
  
  async getDeletedMemberNumbers(): Promise<DeletedMemberNumber[]> {
    return await db.select()
      .from(deletedMemberNumbers)
      .orderBy(asc(deletedMemberNumbers.memberNumber));
  }
  
  async getNextAvailableMemberNumber(): Promise<number> {
    // Haal het oudste verwijderde lidnummer op (het nummer dat het langst geleden is verwijderd)
    const [deletedNumber] = await db.select()
      .from(deletedMemberNumbers)
      .orderBy(asc(deletedMemberNumbers.deletedAt))
      .limit(1);
    
    if (!deletedNumber) {
      // Geen verwijderde nummers beschikbaar, genereer een nieuw nummer
      const result = await db.execute<{ next_number: number }>(
        sql`SELECT COALESCE(MAX(${members.memberNumber}), 0) + 1 AS next_number FROM ${members}`
      );
      
      return result.rows[0]?.next_number || 1;
    }
    
    // Verwijder dit nummer uit de lijst van verwijderde nummers, zodat het niet opnieuw wordt gebruikt
    await this.removeDeletedMemberNumber(deletedNumber.memberNumber);
    
    // Retourneer het beschikbare nummer
    return deletedNumber.memberNumber;
  }
  
  async removeDeletedMemberNumber(memberNumber: number): Promise<void> {
    await db.delete(deletedMemberNumbers)
      .where(eq(deletedMemberNumbers.memberNumber, memberNumber));
  }
}

export const storage = new DatabaseStorage();