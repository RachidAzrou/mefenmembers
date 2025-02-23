import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
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

export const materialTypes = pgTable("material_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  maxCount: integer("max_count").notNull(),
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

export const insertUserSchema = createInsertSchema(users);
export const insertVolunteerSchema = createInsertSchema(volunteers);
export const insertRoomSchema = createInsertSchema(rooms);
export const insertMaterialTypeSchema = createInsertSchema(materialTypes);
export const insertMaterialSchema = createInsertSchema(materials);
export const insertScheduleSchema = createInsertSchema(schedules);

export type User = typeof users.$inferSelect;
export type Volunteer = typeof volunteers.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type MaterialType = typeof materialTypes.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;