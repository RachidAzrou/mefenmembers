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

export const spaces = pgTable("spaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const equipment = pgTable("equipment", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // jacket, vest, lamp, walkie_talkie
  number: integer("number").notNull(),
  assignedToId: integer("assigned_to_id").references(() => volunteers.id),
  isCheckedOut: boolean("is_checked_out").default(false),
});

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  volunteerId: integer("volunteer_id").references(() => volunteers.id),
  spaceId: integer("space_id").references(() => spaces.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
});

export const insertUserSchema = createInsertSchema(users);
export const insertVolunteerSchema = createInsertSchema(volunteers);
export const insertSpaceSchema = createInsertSchema(spaces);
export const insertEquipmentSchema = createInsertSchema(equipment);
export const insertScheduleSchema = createInsertSchema(schedules);

export type User = typeof users.$inferSelect;
export type Volunteer = typeof volunteers.$inferSelect;
export type Space = typeof spaces.$inferSelect;
export type Equipment = typeof equipment.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
