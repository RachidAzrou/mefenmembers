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

export const pendingVolunteers = pgTable("pending_volunteers", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  status: text("status").notNull().default('pending'),
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

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  memberNumber: integer("member_number").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phoneNumber: text("phone_number").notNull(),
  paymentStatus: text("payment_status").notNull().default('unpaid'),
  registrationDate: timestamp("registration_date").notNull().defaultNow(),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertVolunteerSchema = createInsertSchema(volunteers);
export const insertPendingVolunteerSchema = createInsertSchema(pendingVolunteers, {
  submittedAt: z.coerce.date(),
});
export const insertRoomSchema = createInsertSchema(rooms);
export const insertMaterialTypeSchema = createInsertSchema(materialTypes);
export const insertMaterialSchema = createInsertSchema(materials);
export const insertScheduleSchema = createInsertSchema(schedules);
export const insertMemberSchema = createInsertSchema(members, {
  registrationDate: z.coerce.date(),
  memberNumber: z.number().int().positive()
});

// Export types
export type User = typeof users.$inferSelect;
export type Volunteer = typeof volunteers.$inferSelect;
export type PendingVolunteer = typeof pendingVolunteers.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type MaterialType = typeof materialTypes.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type Member = typeof members.$inferSelect;

// Export insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertVolunteer = z.infer<typeof insertVolunteerSchema>;
export type InsertPendingVolunteer = z.infer<typeof insertPendingVolunteerSchema>;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type InsertMaterialType = z.infer<typeof insertMaterialTypeSchema>;
export type InsertMember = z.infer<typeof insertMemberSchema>;