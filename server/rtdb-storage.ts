import { 
  type Member,
  type InsertMember,
  type DeletedMemberNumber,
  type InsertDeletedMemberNumber
} from "@shared/schema";
import { rtdb } from "./firebase-admin";
import session from "express-session";
import memorystore from "memorystore";
import * as admin from 'firebase-admin';

// We gebruiken memorystore voor sessies in plaats van Firestore
const MemoryStore = memorystore(session);

export interface IStorage {
  // Reference to database service
  firestore: null; // Compatibiliteit met bestaande code, altijd null
  rtdb: admin.database.Database | null;

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

// Helper functie om DB referenties te maken
const getRef = (path: string) => {
  if (!rtdb) {
    throw new Error("RTDB is niet beschikbaar");
  }
  return rtdb.ref(path);
};

export class RTDBStorage implements IStorage {
  sessionStore: session.Store;
  firestore = null; // Compatibiliteit met bestaande code, altijd null
  rtdb = rtdb; // Reference to the database service
  
  // DB paths
  private MEMBERS_PATH = 'members';
  private DELETED_NUMBERS_PATH = 'deletedMemberNumbers';
  private COUNTERS_PATH = 'counters';

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // = 24h, hoe vaak verouderde sessies worden opgekuist
    });
    
    if (!this.rtdb) {
      console.error('[RTDB] Realtime Database is niet beschikbaar!');
    } else {
      console.log('[RTDB] Realtime Database succesvol geïnitialiseerd');
    }
  }

  // Hulpmethode om een UUID te genereren als ID
  private generateId(): string {
    return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  }

  // Hulpmethode om data te converteren
  private convertMember(id: string, data: any): Member {
    // Zorg dat datums correct worden verwerkt
    let registrationDate = data.registrationDate;
    if (typeof registrationDate === 'string') {
      registrationDate = new Date(registrationDate);
    }
    
    let birthDate = data.birthDate;
    if (typeof birthDate === 'string' && birthDate) {
      birthDate = new Date(birthDate);
    }
    
    return {
      id,
      ...data,
      registrationDate,
      birthDate
    } as Member;
  }

  async getMember(id: string): Promise<Member | undefined> {
    try {
      if (!this.rtdb) {
        console.error('[RTDB] Database niet beschikbaar, kan lid niet ophalen');
        return undefined;
      }
      
      const snapshot = await getRef(`${this.MEMBERS_PATH}/${id}`).once('value');
      const data = snapshot.val();
      
      if (!data) {
        return undefined;
      }
      
      return this.convertMember(id, data);
    } catch (error) {
      console.error('[RTDB] Fout bij ophalen lid:', error);
      return undefined;
    }
  }

  async listMembers(): Promise<Member[]> {
    try {
      if (!this.rtdb) {
        console.error('[RTDB] Database niet beschikbaar, kan leden niet ophalen');
        return [];
      }
      
      const snapshot = await getRef(this.MEMBERS_PATH).orderByChild('memberNumber').once('value');
      const membersData = snapshot.val() || {};
      
      return Object.entries(membersData).map(([id, data]) => 
        this.convertMember(id, data as any)
      );
    } catch (error) {
      console.error('[RTDB] Fout bij ophalen leden:', error);
      return [];
    }
  }

  async createMember(member: InsertMember): Promise<Member> {
    try {
      console.log("[RTDB] createMember - Start met data:", JSON.stringify(member));
      
      if (!this.rtdb) {
        console.error('[RTDB] Database niet beschikbaar, kan lid niet toevoegen');
        throw new Error('Database service is tijdelijk niet beschikbaar');
      }
      
      // Genereer uniek ID
      const id = this.generateId();
      console.log("[RTDB] Gegenereerd ID:", id);
      
      // Als er geen memberNumber is meegegeven, genereer er één
      if (!member.memberNumber) {
        console.log("[RTDB] Geen lidnummer opgegeven, genereren...");
        member.memberNumber = await this.generateMemberNumber();
        console.log("[RTDB] Gegenereerd lidnummer:", member.memberNumber);
      }
      
      // Voorbereiden van data voor opslag
      const newMember = {
        ...member,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Zorg dat datums correct worden opgeslagen
      if (newMember.registrationDate instanceof Date) {
        // @ts-ignore - We slaan het op als string in de database maar converteren bij ophalen
        newMember.registrationDate = newMember.registrationDate.toISOString();
      }
      
      if (newMember.birthDate instanceof Date) {
        // @ts-ignore - We slaan het op als string in de database maar converteren bij ophalen
        newMember.birthDate = newMember.birthDate.toISOString();
      }
      
      console.log("[RTDB] Opslaan nieuw lid in database:", JSON.stringify(newMember));
      
      // Opslaan in database
      await getRef(`${this.MEMBERS_PATH}/${id}`).set(newMember);
      console.log("[RTDB] Lid succesvol opgeslagen");
      
      // Return het nieuwe lid met juiste ID en datumformaten
      return this.convertMember(id, newMember);
    } catch (error) {
      console.error("[RTDB] Fout bij aanmaken lid:", error);
      if (error instanceof Error) {
        console.error("Foutmelding:", error.message);
        console.error("Stack:", error.stack);
      }
      throw error;
    }
  }

  async updateMember(id: string, member: Partial<InsertMember>): Promise<Member> {
    try {
      if (!this.rtdb) {
        console.error('[RTDB] Database niet beschikbaar, kan lid niet bijwerken');
        throw new Error('Database service is tijdelijk niet beschikbaar');
      }
      
      // Haal het bestaande lid op
      const memberRef = getRef(`${this.MEMBERS_PATH}/${id}`);
      const snapshot = await memberRef.once('value');
      const existingData = snapshot.val();
      
      if (!existingData) {
        throw new Error(`Lid met ID ${id} niet gevonden`);
      }
      
      // Bereid data voor om te updaten
      const updateData = {
        ...member,
        updatedAt: new Date().toISOString()
      };
      
      // Zorg dat datums correct worden opgeslagen
      if (updateData.registrationDate instanceof Date) {
        // @ts-ignore - We slaan het op als string in de database maar converteren bij ophalen
        updateData.registrationDate = updateData.registrationDate.toISOString();
      }
      
      if (updateData.birthDate instanceof Date) {
        // @ts-ignore - We slaan het op als string in de database maar converteren bij ophalen
        updateData.birthDate = updateData.birthDate.toISOString();
      }
      
      // Update alleen de meegegeven velden (geen overschrijving van alles)
      await memberRef.update(updateData);
      
      // Haal het bijgewerkte lid op
      const updatedSnapshot = await memberRef.once('value');
      const updatedData = updatedSnapshot.val();
      
      return this.convertMember(id, updatedData);
    } catch (error) {
      console.error('[RTDB] Fout bij bijwerken lid:', error);
      throw error;
    }
  }

  async deleteMember(id: string): Promise<void> {
    try {
      if (!this.rtdb) {
        console.error('[RTDB] Database niet beschikbaar, kan lid niet verwijderen');
        throw new Error('Database service is tijdelijk niet beschikbaar');
      }
      
      // Haal het lid op om het lidnummer te krijgen
      const memberRef = getRef(`${this.MEMBERS_PATH}/${id}`);
      const snapshot = await memberRef.once('value');
      const memberData = snapshot.val();
      
      if (!memberData) {
        throw new Error(`Lid met ID ${id} niet gevonden`);
      }
      
      // Voeg lidnummer toe aan verwijderde nummers voor hergebruik
      if (memberData.memberNumber) {
        await this.addDeletedMemberNumber(memberData.memberNumber);
      }
      
      // Verwijder het lid
      await memberRef.remove();
    } catch (error) {
      console.error('[RTDB] Fout bij verwijderen lid:', error);
      throw error;
    }
  }

  async generateMemberNumber(): Promise<number> {
    try {
      console.log("[RTDB] generateMemberNumber - Start");
      
      if (!this.rtdb) {
        console.error('[RTDB] Database niet beschikbaar, kan lidnummer niet genereren');
        console.warn('[RTDB] Gebruik fallback lidnummer: 9999');
        return 9999;
      }
      
      // Controleer eerst of er een verwijderd nummer beschikbaar is
      console.log("[RTDB] Controleren op beschikbare verwijderde nummers");
      const nextAvailable = await this.getNextAvailableMemberNumber();
      console.log("[RTDB] Volgend beschikbaar verwijderd nummer:", nextAvailable);
      
      if (nextAvailable > 0) {
        console.log("[RTDB] Hergebruik verwijderd nummer:", nextAvailable);
        return nextAvailable;
      }
      
      // Anders, genereer een nieuw nummer uit de counter
      console.log("[RTDB] Genereren nieuw lidnummer uit teller");
      const counterRef = getRef(`${this.COUNTERS_PATH}/members`);
      
      // Dit moet atomair gebeuren met een transaction
      const result = await new Promise<number>((resolve, reject) => {
        counterRef.transaction((currentData) => {
          // Als de counter nog niet bestaat, begin bij 1
          const newCount = (currentData || 0) + 1;
          return newCount;
        }, (error, committed, snapshot) => {
          if (error) {
            console.error('[RTDB] Fout bij transaction:', error);
            reject(error);
          } else if (!committed) {
            console.error('[RTDB] Transaction niet committed');
            reject(new Error('Transaction niet committed'));
          } else if (!snapshot) {
            console.error('[RTDB] Snapshot is null');
            reject(new Error('Transaction snapshot is null'));
          } else {
            const newValue = snapshot.val();
            console.log('[RTDB] Nieuwe counter waarde:', newValue);
            resolve(newValue);
          }
        });
      });
      
      console.log("[RTDB] Lidnummer gegenereerd:", result);
      return result;
    } catch (error) {
      console.error('[RTDB] Fout bij genereren lidnummer:', error);
      // Fallback voor productie om crashes te voorkomen
      return 1;
    }
  }

  async addDeletedMemberNumber(memberNumber: number): Promise<DeletedMemberNumber> {
    try {
      if (!this.rtdb) {
        console.error('[RTDB] Database niet beschikbaar, kan verwijderd lidnummer niet toevoegen');
        const fallbackNumber = {
          id: `fallback-${Date.now()}`,
          memberNumber,
          deletedAt: new Date()
        };
        return fallbackNumber as DeletedMemberNumber;
      }
      
      // Genereer een uniek ID voor dit verwijderde nummer
      const id = this.generateId();
      
      const deletedNumber = {
        memberNumber,
        deletedAt: new Date().toISOString()
      };
      
      await getRef(`${this.DELETED_NUMBERS_PATH}/${id}`).set(deletedNumber);
      
      return {
        id,
        memberNumber,
        deletedAt: new Date()
      } as DeletedMemberNumber;
    } catch (error) {
      console.error('[RTDB] Fout bij toevoegen verwijderd lidnummer:', error);
      throw error;
    }
  }

  async getDeletedMemberNumbers(): Promise<DeletedMemberNumber[]> {
    try {
      if (!this.rtdb) {
        console.error('[RTDB] Database niet beschikbaar, kan verwijderde lidnummers niet ophalen');
        return [];
      }
      
      const snapshot = await getRef(this.DELETED_NUMBERS_PATH).orderByChild('memberNumber').once('value');
      const data = snapshot.val() || {};
      
      return Object.entries(data).map(([id, value]: [string, any]) => ({
        id,
        memberNumber: value.memberNumber,
        deletedAt: new Date(value.deletedAt)
      }));
    } catch (error) {
      console.error('[RTDB] Fout bij ophalen verwijderde lidnummers:', error);
      return [];
    }
  }

  async getNextAvailableMemberNumber(): Promise<number> {
    try {
      if (!this.rtdb) {
        console.error('[RTDB] Database niet beschikbaar, kan verwijderde lidnummers niet gebruiken');
        return 0;
      }
      
      // Haal het oudste verwijderde lidnummer op
      const snapshot = await getRef(this.DELETED_NUMBERS_PATH)
        .orderByChild('deletedAt')
        .limitToFirst(1)
        .once('value');
      
      const data = snapshot.val();
      
      if (!data) {
        return 0; // Geen verwijderde nummers beschikbaar
      }
      
      // In RTDB krijgen we een object met 1 child terug
      const firstKey = Object.keys(data)[0];
      if (!firstKey) {
        return 0;
      }
      
      const entry = data[firstKey];
      const memberNumber = entry.memberNumber;
      
      // Verwijder het nummer uit de lijst van verwijderde nummers
      await this.removeDeletedMemberNumber(memberNumber);
      
      return memberNumber;
    } catch (error) {
      console.error('[RTDB] Fout bij ophalen beschikbaar lidnummer:', error);
      return 0;
    }
  }

  async removeDeletedMemberNumber(memberNumber: number): Promise<void> {
    try {
      if (!this.rtdb) {
        console.error('[RTDB] Database niet beschikbaar, kan verwijderd lidnummer niet verwijderen');
        return;
      }
      
      // Zoek het verwijderde nummer met dit memberNumber
      const snapshot = await getRef(this.DELETED_NUMBERS_PATH)
        .orderByChild('memberNumber')
        .equalTo(memberNumber)
        .once('value');
      
      const data = snapshot.val();
      
      if (!data) {
        return; // Niks om te verwijderen
      }
      
      // Verwijder het eerste item met dit lidnummer
      const firstKey = Object.keys(data)[0];
      if (firstKey) {
        await getRef(`${this.DELETED_NUMBERS_PATH}/${firstKey}`).remove();
      }
    } catch (error) {
      console.error('[RTDB] Fout bij verwijderen lidnummer:', error);
    }
  }
}

// Exporteer een instantie van de storage
export const rtdbStorage = new RTDBStorage();