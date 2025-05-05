import { pgTable, text, serial, integer, timestamp, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
});

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  memberNumber: integer("member_number").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phoneNumber: text("phone_number").notNull(),
  birthDate: date("birth_date"),
  accountNumber: text("account_number"),
  paymentStatus: boolean("payment_status").notNull().default(false),
  registrationDate: timestamp("registration_date").notNull().defaultNow(),
  notes: text("notes"),
});

// Tabel voor het bijhouden van vrijgekomen lidnummers
export const deletedMemberNumbers = pgTable("deleted_member_numbers", {
  id: serial("id").primaryKey(),
  memberNumber: integer("member_number").notNull().unique(),
  deletedAt: timestamp("deleted_at").notNull().defaultNow(),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertMemberSchema = createInsertSchema(members, {
  registrationDate: z.coerce.date(),
  // Maak lidnummer optioneel bij toevoegen. De server genereert het automatisch als het niet is meegegeven.
  memberNumber: z.number().int().positive().optional(),
  birthDate: z.coerce.date().optional().nullable(),
  accountNumber: z.string().optional().nullable()
});

// Extra schema's voor deletedMemberNumbers
export const insertDeletedMemberNumberSchema = createInsertSchema(deletedMemberNumbers, {
  deletedAt: z.coerce.date(),
  memberNumber: z.number().int().positive(),
});

// Export types
export type User = typeof users.$inferSelect;
export type Member = typeof members.$inferSelect;
export type DeletedMemberNumber = typeof deletedMemberNumbers.$inferSelect;

// Export insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type InsertDeletedMemberNumber = z.infer<typeof insertDeletedMemberNumberSchema>;