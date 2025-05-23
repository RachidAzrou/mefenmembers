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
  
  // Persoonsgegevens
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  gender: text("gender"), // man of vrouw
  birthDate: date("birth_date"),
  nationality: text("nationality"),
  
  // Contactgegevens
  email: text("email"),
  phoneNumber: text("phone_number").notNull(),
  street: text("street"),
  houseNumber: text("house_number"),
  busNumber: text("bus_number"),
  postalCode: text("postal_code"),
  city: text("city"),
  
  // Lidmaatschap
  membershipType: text("membership_type").default("standaard"), // standaard, student, senior
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date"),
  autoRenew: boolean("auto_renew").default(true),
  paymentTerm: text("payment_term").default("yearly"), // maandelijks, 3-maandelijks, jaarlijks
  paymentMethod: text("payment_method").default("cash"), // cash, domiciliering, overschrijving, bancontact
  
  // Bankgegevens
  accountNumber: text("account_number"),
  bicSwift: text("bic_swift"),
  accountHolderName: text("account_holder_name"),
  
  // Overig
  paymentStatus: boolean("payment_status").notNull().default(false),
  registrationDate: timestamp("registration_date").notNull().defaultNow(),
  privacyConsent: boolean("privacy_consent").default(false),
  notes: text("notes"),
});

export const memberRequests = pgTable("member_requests", {
  id: serial("id").primaryKey(),
  
  // Status van de aanvraag
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  
  // Persoonsgegevens
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  gender: text("gender"), // man of vrouw
  birthDate: date("birth_date"),
  nationality: text("nationality"),
  
  // Contactgegevens
  email: text("email").notNull(), // Email is verplicht voor aanvragen
  phoneNumber: text("phone_number").notNull(),
  street: text("street"),
  houseNumber: text("house_number"),
  busNumber: text("bus_number"),
  postalCode: text("postal_code"),
  city: text("city"),
  
  // Lidmaatschap
  membershipType: text("membership_type").default("standaard"), // standaard, student, senior
  paymentMethod: text("payment_method"), // cash, domiciliering, overschrijving, bancontact
  paymentTerm: text("payment_term"), // maandelijks, driemaandelijks, jaarlijks
  autoRenew: boolean("auto_renew"),
  
  // Bankgegevens
  accountNumber: text("account_number"),
  bicSwift: text("bic_swift"),
  accountHolderName: text("account_holder_name"),
  
  // Overig
  requestDate: timestamp("request_date").notNull().defaultNow(),
  processedDate: timestamp("processed_date"),
  processedBy: integer("processed_by"), // User ID die de aanvraag heeft verwerkt
  notes: text("notes"),
  privacyConsent: boolean("privacy_consent").default(false),
  ipAddress: text("ip_address"), // IP-adres van de aanvrager voor veiligheid
  
  // Verwijzing naar lid bij goedkeuring
  memberId: integer("member_id"), // ID van het aangemaakte lid bij goedkeuring
  memberNumber: text("member_number"), // Lidnummer van het aangemaakte lid bij goedkeuring
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
  // Basis velden
  registrationDate: z.coerce.date(),
  // Maak lidnummer optioneel bij toevoegen. De server genereert het automatisch als het niet is meegegeven.
  memberNumber: z.number().int().positive().optional(),
  
  // Persoonsgegevens
  gender: z.enum(["man", "vrouw"]).optional(),
  birthDate: z.coerce.date().optional().nullable(),
  nationality: z.string().optional().nullable(),
  
  // Contactgegevens
  street: z.string().optional().nullable(),
  houseNumber: z.string().optional().nullable(),
  busNumber: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  
  // Lidmaatschap
  membershipType: z.enum(["standaard", "student", "senior"]).default("standaard"),
  startDate: z.coerce.date().default(() => new Date()),
  endDate: z.coerce.date().optional().nullable(),
  autoRenew: z.boolean().default(true),
  paymentTerm: z.enum(["maandelijks", "driemaandelijks", "jaarlijks"]).default("jaarlijks"),
  paymentMethod: z.enum(["cash", "domiciliering", "overschrijving", "bancontact"]).default("cash"),
  
  // Bankgegevens
  accountNumber: z.string().optional().nullable()
    .refine(val => !val || /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/.test(val), {
      message: "Ongeldig IBAN formaat. Bijvoorbeeld: BE68539007547034"
    }),
  bicSwift: z.string().optional().nullable(),
  accountHolderName: z.string().optional().nullable(),
  
  // Overig
  privacyConsent: z.boolean().default(false)
});

// Schema voor ledenverzoeken
export const insertMemberRequestSchema = createInsertSchema(memberRequests, {
  // Persoonsgegevens
  gender: z.enum(["man", "vrouw"]).optional().nullable(),
  birthDate: z.coerce.date().optional().nullable(),
  nationality: z.string().optional().nullable(),
  
  // Contactgegevens
  email: z.string().email({
    message: "Ongeldig e-mailadres. Bijvoorbeeld: naam@voorbeeld.nl"
  }),
  street: z.string().optional().nullable(),
  houseNumber: z.string().optional().nullable(),
  busNumber: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  
  // Lidmaatschap
  membershipType: z.enum(["standaard", "student", "senior"]).default("standaard"),
  paymentMethod: z.enum(["cash", "domiciliering", "overschrijving", "bancontact"]).optional(),
  paymentTerm: z.enum(["maandelijks", "driemaandelijks", "jaarlijks"]).optional(),
  autoRenew: z.boolean().optional(),
  
  // Bankgegevens
  accountNumber: z.string().optional().nullable()
    .refine(val => !val || /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/.test(val), {
      message: "Ongeldig IBAN formaat. Bijvoorbeeld: BE68539007547034"
    }),
  bicSwift: z.string().optional().nullable(),
  accountHolderName: z.string().optional().nullable(),
  
  // Status velden (deze zullen meestal op de server gezet worden)
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  privacyConsent: z.boolean().refine(val => val === true, {
    message: "Je moet akkoord gaan met de privacyvoorwaarden"
  })
});

// Extra schema's voor deletedMemberNumbers
export const insertDeletedMemberNumberSchema = createInsertSchema(deletedMemberNumbers, {
  deletedAt: z.coerce.date(),
  memberNumber: z.number().int().positive(),
});

// Export types
export type User = typeof users.$inferSelect;
export type Member = typeof members.$inferSelect;
export type MemberRequest = typeof memberRequests.$inferSelect;
export type DeletedMemberNumber = typeof deletedMemberNumbers.$inferSelect;

// Export insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type InsertMemberRequest = z.infer<typeof insertMemberRequestSchema>;
export type InsertDeletedMemberNumber = z.infer<typeof insertDeletedMemberNumberSchema>;