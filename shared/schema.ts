// Import alleen de zod library voor validatie
import { z } from "zod";

// Definieer de schema's direct in Zod zonder Drizzle
// Firestore gebruikt strings voor id's in plaats van numbers
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  password: z.string(),
});

export const memberSchema = z.object({
  id: z.string(),
  memberNumber: z.number().int().positive(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().nullable(),
  phoneNumber: z.string(),
  birthDate: z.date().nullable(),
  accountNumber: z.string().nullable(),
  paymentStatus: z.boolean().default(false),
  registrationDate: z.date().default(() => new Date()),
  notes: z.string().nullable(),
});

export const deletedMemberNumberSchema = z.object({
  id: z.string(),
  memberNumber: z.number().int().positive(),
  deletedAt: z.date().default(() => new Date()),
});

// Create insert schemas 
export const insertUserSchema = userSchema.omit({ id: true });
export const insertMemberSchema = memberSchema.omit({ id: true }).extend({
  // Maak lidnummer optioneel bij toevoegen. De server genereert het automatisch als het niet is meegegeven.
  memberNumber: z.number().int().positive().optional(),
  birthDate: z.date().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const insertDeletedMemberNumberSchema = deletedMemberNumberSchema.omit({ id: true });

// Export types
export type User = z.infer<typeof userSchema>;
export type Member = z.infer<typeof memberSchema>;
export type DeletedMemberNumber = z.infer<typeof deletedMemberNumberSchema>;

// Export insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type InsertDeletedMemberNumber = z.infer<typeof insertDeletedMemberNumberSchema>;