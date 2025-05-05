import { 
  members,
  type Member,
  type InsertMember
} from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
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
    await db.delete(members).where(eq(members.id, id));
  }

  async generateMemberNumber(): Promise<number> {
    // Haal het hoogste huidige lidnummer op
    const result = await db
      .select({ max: sql<number>`MAX(${members.memberNumber})` })
      .from(members);
    
    // Als er geen leden zijn, begin bij 10000
    const currentMaxNumber = result[0]?.max || 9999;
    
    // Genereer een nieuw nummer dat 1 hoger is dan het huidige maximum
    return currentMaxNumber + 1;
  }
}

export const storage = new DatabaseStorage();