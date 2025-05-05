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
    // Behandel datums en null-waarden
    const preparedMember = {
      ...member,
      birthDate: member.birthDate ? new Date(member.birthDate) : null,
      accountNumber: member.accountNumber || null
    };
    
    const [created] = await db.insert(members).values(preparedMember).returning();
    return created;
  }

  async updateMember(id: number, member: Partial<InsertMember>): Promise<Member> {
    // Behandel datums en null-waarden
    const preparedMember = { ...member };
    
    if (member.birthDate !== undefined) {
      preparedMember.birthDate = member.birthDate ? new Date(member.birthDate) : null;
    }
    
    if (member.accountNumber !== undefined) {
      preparedMember.accountNumber = member.accountNumber || null;
    }
    
    const [updated] = await db
      .update(members)
      .set(preparedMember)
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
    // Controleer eerst of er een verwijderd lidnummer beschikbaar is
    const availableNumber = await this.getNextAvailableMemberNumber();
    
    // Als er een beschikbaar nummer is, gebruik dat
    if (availableNumber !== null) {
      return availableNumber;
    }
    
    // Zo niet, genereer een nieuw nummer
    const result = await db.execute<{ next_number: number }>(
      sql`SELECT COALESCE(MAX(${members.memberNumber}), 0) + 1 AS next_number FROM ${members}`
    );
    
    // Haal het resultaat uit de query
    return result.rows[0]?.next_number || 1;
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
  
  async getNextAvailableMemberNumber(): Promise<number | null> {
    // Haal het oudste verwijderde lidnummer op (het nummer dat het langst geleden is verwijderd)
    const [deletedNumber] = await db.select()
      .from(deletedMemberNumbers)
      .orderBy(asc(deletedMemberNumbers.deletedAt))
      .limit(1);
    
    if (!deletedNumber) {
      // Geen verwijderde nummers beschikbaar
      return null;
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