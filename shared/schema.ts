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

export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // jas, hesje, lamp, walkie_talkie
  number: integer("number").notNull(),
  assignedToId: integer("assigned_to_id").references(() => volunteers.id),
  isCheckedOut: boolean("is_checked_out").default(false),
});

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  volunteerId: integer("volunteer_id").references(() => volunteers.id),
  roomId: integer("room_id").references(() => rooms.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
});

export const insertUserSchema = createInsertSchema(users);
export const insertVolunteerSchema = createInsertSchema(volunteers);
export const insertRoomSchema = createInsertSchema(rooms);
export const insertMaterialSchema = createInsertSchema(materials);
export const insertScheduleSchema = createInsertSchema(schedules);

export type User = typeof users.$inferSelect;
export type Volunteer = typeof volunteers.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;