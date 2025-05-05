import { 
  type Member,
  type InsertMember,
  type DeletedMemberNumber,
  type InsertDeletedMemberNumber
} from "@shared/schema";
import { firestore } from "./firebase-admin";
import session from "express-session";
import * as FirestoreStore from "firestore-store";

const FirestoreStoreSession = FirestoreStore(session);

export interface IStorage {
  // Member operations
  getMember(id: number): Promise<Member | undefined>;
  listMembers(): Promise<Member[]>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: number, member: Partial<InsertMember>): Promise<Member>;
  deleteMember(id: number): Promise<void>;
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
  private membersCollection = firestore.collection('members');
  private deletedMemberNumbersCollection = firestore.collection('deletedMemberNumbers');
  private countersCollection = firestore.collection('counters');

  constructor() {
    this.sessionStore = new FirestoreStoreSession({
      database: firestore,
      collection: 'sessions',
    });
  }

  async getMember(id: number): Promise<Member | undefined> {
    const snapshot = await this.membersCollection.where('id', '==', id).get();
    
    if (snapshot.empty) {
      return undefined;
    }
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Member;
  }

  async listMembers(): Promise<Member[]> {
    const snapshot = await this.membersCollection.orderBy('memberNumber', 'asc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Member);
  }

  async createMember(member: InsertMember): Promise<Member> {
    // Genereer een nieuw document ID
    const memberRef = this.membersCollection.doc();
    
    // Als er geen memberNumber is meegegeven, genereer er één
    if (!member.memberNumber) {
      member.memberNumber = await this.generateMemberNumber();
    }
    
    // Voeg het nieuwe lid toe
    const newMember = {
      ...member,
      id: memberRef.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await memberRef.set(newMember);
    return newMember as Member;
  }

  async updateMember(id: number, member: Partial<InsertMember>): Promise<Member> {
    const snapshot = await this.membersCollection.where('id', '==', id).get();
    
    if (snapshot.empty) {
      throw new Error(`Member with ID ${id} not found`);
    }
    
    const docRef = snapshot.docs[0].ref;
    
    const updatedMember = {
      ...member,
      updatedAt: new Date()
    };
    
    await docRef.update(updatedMember);
    
    // Haal het bijgewerkte document op
    const updatedDoc = await docRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() } as Member;
  }

  async deleteMember(id: number): Promise<void> {
    const snapshot = await this.membersCollection.where('id', '==', id).get();
    
    if (snapshot.empty) {
      throw new Error(`Member with ID ${id} not found`);
    }
    
    const doc = snapshot.docs[0];
    
    // Voeg het lidnummer toe aan verwijderde nummers als het bestaat
    const memberData = doc.data();
    if (memberData.memberNumber) {
      await this.addDeletedMemberNumber(memberData.memberNumber);
    }
    
    // Verwijder het lid
    await doc.ref.delete();
  }

  async generateMemberNumber(): Promise<number> {
    // Controleer of er verwijderde nummers beschikbaar zijn
    const nextAvailable = await this.getNextAvailableMemberNumber();
    if (nextAvailable > 0) {
      return nextAvailable;
    }
    
    // Anders, genereer een nieuw nummer
    const counterRef = this.countersCollection.doc('members');
    
    return firestore.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      let newCount = 1; // Start bij 1 als er nog geen counter is
      
      if (counterDoc.exists) {
        newCount = (counterDoc.data()?.count || 0) + 1;
        transaction.update(counterRef, { count: newCount });
      } else {
        transaction.set(counterRef, { count: newCount });
      }
      
      return newCount;
    });
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