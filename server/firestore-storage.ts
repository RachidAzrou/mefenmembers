import { 
  type Member,
  type InsertMember,
  type DeletedMemberNumber,
  type InsertDeletedMemberNumber
} from "@shared/schema";
import { firestore } from "./firebase-admin";
import session from "express-session";
import memorystore from "memorystore";
import * as admin from 'firebase-admin';

// Import FirebaseFirestore namespace voor type definitie
import FirebaseFirestore = admin.firestore.Firestore;

// We gebruiken memorystore voor sessies in plaats van Firestore
const MemoryStore = memorystore(session);

export interface IStorage {
  // Reference to Firestore 
  firestore: FirebaseFirestore | null;

  // Member operations
  getMember(id: string): Promise<Member | undefined>;
  listMembers(): Promise<Member[]>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: string, member: Partial<InsertMember>): Promise<Member>;
  deleteMember(id: string): Promise<void>;
  generateMemberNumber(): Promise<number>;
  
  // Verwijderde lidnummers beheer
  addDeletedMemberNumber(memberNumber: number): Promise<DeletedMemberNumber>;
  getDeletedMemberNumbers(): Promise<DeletedMemberNumber[]>;
  getNextAvailableMemberNumber(): Promise<number>;
  removeDeletedMemberNumber(memberNumber: number): Promise<void>;

  // Session store for authentication
  sessionStore: session.Store;
}

export class FirestoreStorage implements IStorage {
  sessionStore: session.Store;
  firestore = firestore; // Exporteer firestore voor controles in de routes
  private membersCollection;
  private deletedMemberNumbersCollection;
  private countersCollection;
  
  // Null-checks voor Firestore maken deze veilig voor serverless omgevingen

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // = 24h, hoe vaak verouderde sessies worden opgekuist
    });
    
    // Initialiseer de collecties alleen als Firestore beschikbaar is
    if (this.firestore) {
      this.membersCollection = this.firestore.collection('members');
      this.deletedMemberNumbersCollection = this.firestore.collection('deletedMemberNumbers');
      this.countersCollection = this.firestore.collection('counters');
    } else {
      console.error('[Storage] Firestore is niet beschikbaar, collecties kunnen niet worden geïnitialiseerd!');
    }
  }

  async getMember(id: string): Promise<Member | undefined> {
    // Controleer of Firebase geïnitialiseerd is
    if (!this.firestore || !this.membersCollection) {
      console.error('[Storage] Firebase niet beschikbaar, kan lid niet ophalen');
      return undefined;
    }
    
    // In Firestore kunnen we direct op document ID zoeken
    const docRef = this.membersCollection.doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return undefined;
    }
    
    return { id: doc.id, ...doc.data() } as Member;
  }

  async listMembers(): Promise<Member[]> {
    // Controleer of Firebase geïnitialiseerd is
    if (!this.firestore || !this.membersCollection) {
      console.error('[Storage] Firebase niet beschikbaar, kan leden niet ophalen');
      return [];
    }
    
    const snapshot = await this.membersCollection.orderBy('memberNumber', 'asc').get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      // Zorg ervoor dat Firestore timestampgebonden velden omgezet worden naar Date objecten
      const registrationDate = data.registrationDate instanceof Date 
        ? data.registrationDate 
        : data.registrationDate?.toDate?.() || new Date();
      
      const birthDate = data.birthDate instanceof Date
        ? data.birthDate
        : data.birthDate?.toDate?.();
        
      return { 
        id: doc.id, 
        ...data,
        registrationDate,
        birthDate 
      } as Member;
    });
  }

  async createMember(member: InsertMember): Promise<Member> {
    try {
      console.log("createMember - Start with data:", JSON.stringify(member));
      
      // Controleer of Firebase geïnitialiseerd is
      if (!this.firestore || !this.membersCollection) {
        console.error('[Storage] Firebase niet beschikbaar, kan lid niet toevoegen');
        throw new Error('Database service is tijdelijk niet beschikbaar');
      }
      
      // Genereer een nieuw document ID
      const memberRef = this.membersCollection.doc();
      console.log("Generated new document ID:", memberRef.id);
      
      // Als er geen memberNumber is meegegeven, genereer er één
      if (!member.memberNumber) {
        console.log("No member number provided, generating one");
        member.memberNumber = await this.generateMemberNumber();
        console.log("Generated member number:", member.memberNumber);
      } else {
        console.log("Using provided member number:", member.memberNumber);
      }
      
      // Voeg het nieuwe lid toe
      const newMember = {
        ...member,
        id: memberRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log("Saving new member to Firestore:", JSON.stringify(newMember));
      await memberRef.set(newMember);
      console.log("Member successfully saved to Firestore");
      
      return newMember as Member;
    } catch (error) {
      console.error("Error in createMember:", error);
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      throw error; // Propagate the error
    }
  }

  async updateMember(id: string, member: Partial<InsertMember>): Promise<Member> {
    // We kunnen direct naar de document ID verwijzen in Firestore
    const docRef = this.membersCollection.doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      throw new Error(`Member with ID ${id} not found`);
    }
    
    const updatedMember = {
      ...member,
      updatedAt: new Date()
    };
    
    await docRef.update(updatedMember);
    
    // Haal het bijgewerkte document op
    const updatedDoc = await docRef.get();
    
    // Zorg ervoor dat date waarden correct worden omgezet
    const data = updatedDoc.data() || {};
    const registrationDate = data.registrationDate instanceof Date 
      ? data.registrationDate 
      : data.registrationDate?.toDate?.() || new Date();
    
    const birthDate = data.birthDate instanceof Date
      ? data.birthDate
      : data.birthDate?.toDate?.();
      
    return { 
      id: updatedDoc.id, 
      ...data,
      registrationDate,
      birthDate 
    } as Member;
  }

  async deleteMember(id: string): Promise<void> {
    // We kunnen direct naar de document ID verwijzen in Firestore
    const docRef = this.membersCollection.doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      throw new Error(`Member with ID ${id} not found`);
    }
    
    // Voeg het lidnummer toe aan verwijderde nummers als het bestaat
    const memberData = doc.data() || {};
    if (memberData.memberNumber) {
      await this.addDeletedMemberNumber(memberData.memberNumber);
    }
    
    // Verwijder het lid
    await docRef.delete();
  }

  async generateMemberNumber(): Promise<number> {
    try {
      console.log("generateMemberNumber - Start");
      
      // Controleer of er verwijderde nummers beschikbaar zijn
      console.log("Checking for available deleted numbers");
      const nextAvailable = await this.getNextAvailableMemberNumber();
      console.log("Next available deleted number:", nextAvailable);
      
      if (nextAvailable > 0) {
        console.log("Reusing deleted number:", nextAvailable);
        return nextAvailable;
      }
      
      // Anders, genereer een nieuw nummer
      console.log("Generating new member number from counter");
      const counterRef = this.countersCollection.doc('members');
      
      return firestore.runTransaction(async (transaction) => {
        console.log("Starting transaction");
        const counterDoc = await transaction.get(counterRef);
        
        let newCount = 1; // Start bij 1 als er nog geen counter is
        
        if (counterDoc.exists) {
          const currentCount = counterDoc.data()?.count || 0;
          console.log("Current counter value:", currentCount);
          newCount = currentCount + 1;
          console.log("New counter value:", newCount);
          transaction.update(counterRef, { count: newCount });
        } else {
          console.log("Counter does not exist, creating with initial value: 1");
          transaction.set(counterRef, { count: newCount });
        }
        
        console.log("Transaction completed successfully with value:", newCount);
        return newCount;
      });
    } catch (error) {
      console.error("Error in generateMemberNumber:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      throw error; // Propagate the error
    }
  }

  async addDeletedMemberNumber(memberNumber: number): Promise<DeletedMemberNumber> {
    const deletedNumberRef = this.deletedMemberNumbersCollection.doc();
    
    const deletedNumber = {
      id: deletedNumberRef.id,
      memberNumber,
      deletedAt: new Date()
    };
    
    await deletedNumberRef.set(deletedNumber);
    return deletedNumber as DeletedMemberNumber;
  }

  async getDeletedMemberNumbers(): Promise<DeletedMemberNumber[]> {
    const snapshot = await this.deletedMemberNumbersCollection.orderBy('memberNumber', 'asc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as DeletedMemberNumber);
  }

  async getNextAvailableMemberNumber(): Promise<number> {
    // Haal het oudste verwijderde lidnummer op
    const snapshot = await this.deletedMemberNumbersCollection
      .orderBy('deletedAt', 'asc')
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return 0; // Geen verwijderde nummers beschikbaar
    }
    
    const doc = snapshot.docs[0];
    const memberNumber = doc.data().memberNumber;
    
    // Verwijder het uit de verwijderde nummers collectie
    await this.removeDeletedMemberNumber(memberNumber);
    
    return memberNumber;
  }

  async removeDeletedMemberNumber(memberNumber: number): Promise<void> {
    const snapshot = await this.deletedMemberNumbersCollection
      .where('memberNumber', '==', memberNumber)
      .get();
    
    if (!snapshot.empty) {
      await snapshot.docs[0].ref.delete();
    }
  }
}

export const storage = new FirestoreStorage();