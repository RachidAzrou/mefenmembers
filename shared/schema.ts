import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default('medic'),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
});

// Inventory tracking
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  materialTypeId: integer("material_type_id").references(() => materialTypes.id),
  stockLevel: integer("stock_level").notNull().default(0),
  minimumLevel: integer("minimum_level").notNull().default(10),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

// Material usage tracking
export const materialUsage = pgTable("material_usage", {
  id: serial("id").primaryKey(),
  materialTypeId: integer("material_type_id").references(() => materialTypes.id),
  userId: integer("user_id").references(() => users.id),
  quantity: integer("quantity").notNull(),
  usedAt: timestamp("used_at").notNull().defaultNow(),
  notes: text("notes"),
});

// Material types (existing table)
export const materialTypes = pgTable("material_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  maxCount: integer("max_count").notNull(),
});

export const volunteers = pgTable("volunteers", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  typeId: integer("type_id").references(() => materialTypes.id),
  number: integer("number").notNull(),
  assignedToId: integer("assigned_to_id").references(() => volunteers.id),
  isCheckedOut: boolean("is_checked_out").default(false),
});

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  volunteerId: integer("volunteer_id").references(() => volunteers.id),
  roomId: integer("room_id").references(() => rooms.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertInventorySchema = createInsertSchema(inventory);
export const insertMaterialUsageSchema = createInsertSchema(materialUsage);
export const insertMaterialTypeSchema = createInsertSchema(materialTypes);
export const insertVolunteerSchema = createInsertSchema(volunteers);
export const insertRoomSchema = createInsertSchema(rooms);
export const insertMaterialSchema = createInsertSchema(materials);
export const insertScheduleSchema = createInsertSchema(schedules);

// Export types
export type User = typeof users.$inferSelect;
export type Inventory = typeof inventory.$inferSelect;
export type MaterialUsage = typeof materialUsage.$inferSelect;
export type MaterialType = typeof materialTypes.$inferSelect;
export type Volunteer = typeof volunteers.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;

// Export insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type InsertMaterialUsage = z.infer<typeof insertMaterialUsageSchema>;
export type InsertMaterialType = z.infer<typeof insertMaterialTypeSchema>;
export type InsertVolunteer = z.infer<typeof insertVolunteerSchema>;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;