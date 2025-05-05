import { 
  volunteers, rooms, materials, schedules, materialTypes, pendingVolunteers, members,
  type Volunteer, type Room, type Material, type Schedule, type MaterialType, type PendingVolunteer, type Member,
  type InsertVolunteer, type InsertRoom, type InsertMaterial, type InsertSchedule, type InsertMaterialType, type InsertPendingVolunteer, type InsertMember
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Volunteer operations
  getVolunteer(id: number): Promise<Volunteer | undefined>;
  listVolunteers(): Promise<Volunteer[]>;
  createVolunteer(volunteer: InsertVolunteer): Promise<Volunteer>;

  // Pending volunteer operations
  getPendingVolunteer(id: number): Promise<PendingVolunteer | undefined>;
  listPendingVolunteers(): Promise<PendingVolunteer[]>;
  createPendingVolunteer(volunteer: InsertPendingVolunteer): Promise<PendingVolunteer>;
  deletePendingVolunteer(id: number): Promise<void>;

  // Room operations
  getRoom(id: number): Promise<Room | undefined>;
  listRooms(): Promise<Room[]>;
  createRoom(room: InsertRoom): Promise<Room>;

  // Material operations
  getMaterial(id: number): Promise<Material | undefined>;
  listMaterials(): Promise<Material[]>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterialCheckout(id: number, isCheckedOut: boolean, volunteerId?: number): Promise<Material>;

  // Schedule operations
  getSchedule(id: number): Promise<Schedule | undefined>;
  listSchedules(): Promise<Schedule[]>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  listActiveSchedules(): Promise<Schedule[]>;

  // MaterialType operations
  getMaterialType(id: number): Promise<MaterialType | undefined>;
  listMaterialTypes(): Promise<MaterialType[]>;
  createMaterialType(materialType: InsertMaterialType): Promise<MaterialType>;

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

  // Pending volunteer operations
  async getPendingVolunteer(id: number): Promise<PendingVolunteer | undefined> {
    const [volunteer] = await db.select().from(pendingVolunteers).where(eq(pendingVolunteers.id, id));
    return volunteer;
  }

  async listPendingVolunteers(): Promise<PendingVolunteer[]> {
    return await db.select().from(pendingVolunteers);
  }

  async createPendingVolunteer(volunteer: InsertPendingVolunteer): Promise<PendingVolunteer> {
    const [created] = await db.insert(pendingVolunteers).values(volunteer).returning();
    return created;
  }

  async deletePendingVolunteer(id: number): Promise<void> {
    await db.delete(pendingVolunteers).where(eq(pendingVolunteers.id, id));
  }

  // Volunteer operations
  async getVolunteer(id: number): Promise<Volunteer | undefined> {
    const [volunteer] = await db.select().from(volunteers).where(eq(volunteers.id, id));
    return volunteer;
  }

  async listVolunteers(): Promise<Volunteer[]> {
    return await db.select().from(volunteers);
  }

  async createVolunteer(volunteer: InsertVolunteer): Promise<Volunteer> {
    const [created] = await db.insert(volunteers).values(volunteer).returning();
    return created;
  }

  // Room operations
  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async listRooms(): Promise<Room[]> {
    return await db.select().from(rooms);
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [created] = await db.insert(rooms).values(room).returning();
    return created;
  }

  // Material operations
  async getMaterial(id: number): Promise<Material | undefined> {
    const [material] = await db.select().from(materials).where(eq(materials.id, id));
    return material;
  }

  async listMaterials(): Promise<Material[]> {
    return await db.select().from(materials);
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    const [created] = await db.insert(materials).values(material).returning();
    return created;
  }

  async updateMaterialCheckout(id: number, isCheckedOut: boolean, volunteerId?: number): Promise<Material> {
    const [updated] = await db
      .update(materials)
      .set({ isCheckedOut, assignedToId: volunteerId ?? null })
      .where(eq(materials.id, id))
      .returning();
    return updated;
  }

  // Schedule operations
  async getSchedule(id: number): Promise<Schedule | undefined> {
    const [schedule] = await db.select().from(schedules).where(eq(schedules.id, id));
    return schedule;
  }

  async listSchedules(): Promise<Schedule[]> {
    return await db.select().from(schedules);
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const [created] = await db.insert(schedules).values(schedule).returning();
    return created;
  }

  async listActiveSchedules(): Promise<Schedule[]> {
    return await db
      .select()
      .from(schedules)
      .where(gte(schedules.endDate, new Date()));
  }

  // MaterialType operations
  async getMaterialType(id: number): Promise<MaterialType | undefined> {
    const [materialType] = await db.select().from(materialTypes).where(eq(materialTypes.id, id));
    return materialType;
  }

  async listMaterialTypes(): Promise<MaterialType[]> {
    return await db.select().from(materialTypes);
  }

  async createMaterialType(materialType: InsertMaterialType): Promise<MaterialType> {
    const [created] = await db.insert(materialTypes).values(materialType).returning();
    return created;
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
    const [created] = await db.insert(members).values(member).returning();
    return created;
  }

  async updateMember(id: number, member: Partial<InsertMember>): Promise<Member> {
    const [updated] = await db
      .update(members)
      .set(member)
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