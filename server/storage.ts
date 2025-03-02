import { 
  volunteers, rooms, materials, schedules, materialTypes,
  type Volunteer, type Room, type Material, type Schedule, type MaterialType,
  type InsertVolunteer, type InsertRoom, type InsertMaterial, type InsertSchedule, type InsertMaterialType
} from "@shared/schema";
import { users, inventory, materialUsage, 
  type User, type Inventory, type MaterialUsage,
  type InsertUser, type InsertInventory, type InsertMaterialUsage
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Volunteer operations
  getVolunteer(id: number): Promise<Volunteer | undefined>;
  listVolunteers(): Promise<Volunteer[]>;
  createVolunteer(volunteer: InsertVolunteer): Promise<Volunteer>;

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

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Inventory operations
  getInventory(materialTypeId: number): Promise<Inventory | undefined>;
  getAllInventory(): Promise<Inventory[]>;
  updateInventoryLevel(materialTypeId: number, change: number): Promise<Inventory>;

  // Material usage tracking
  createMaterialUsage(usage: InsertMaterialUsage): Promise<MaterialUsage>;
  getMaterialUsage(userId: number): Promise<MaterialUsage[]>;

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

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  // Inventory operations
  async getInventory(materialTypeId: number): Promise<Inventory | undefined> {
    const [inv] = await db.select().from(inventory).where(eq(inventory.materialTypeId, materialTypeId));
    return inv;
  }

  async getAllInventory(): Promise<Inventory[]> {
    return await db.select().from(inventory);
  }

  async updateInventoryLevel(materialTypeId: number, change: number): Promise<Inventory> {
    // First get current inventory
    let [currentInventory] = await db
      .select()
      .from(inventory)
      .where(eq(inventory.materialTypeId, materialTypeId));

    if (!currentInventory) {
      // Create new inventory record if it doesn't exist
      [currentInventory] = await db
        .insert(inventory)
        .values({
          materialTypeId,
          stockLevel: Math.max(0, change), // Ensure we don't go negative for new items
          minimumLevel: 10, // Default minimum level
        })
        .returning();
    } else {
      // Update existing inventory
      [currentInventory] = await db
        .update(inventory)
        .set({
          stockLevel: Math.max(0, currentInventory.stockLevel + change),
          lastUpdated: new Date(),
        })
        .where(eq(inventory.materialTypeId, materialTypeId))
        .returning();
    }

    return currentInventory;
  }

  // Material usage tracking
  async createMaterialUsage(usage: InsertMaterialUsage): Promise<MaterialUsage> {
    const [created] = await db.insert(materialUsage).values(usage).returning();
    return created;
  }

  async getMaterialUsage(userId: number): Promise<MaterialUsage[]> {
    return await db
      .select()
      .from(materialUsage)
      .where(eq(materialUsage.userId, userId));
  }
}

export const storage = new DatabaseStorage();