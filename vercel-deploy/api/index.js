// index.js - Firebase Realtime Database versie
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  database, 
  ref, 
  get, 
  set, 
  push, 
  update, 
  remove, 
  query, 
  orderByChild, 
  getNextMemberNumber,
  formatMemberNumber 
} from './database.js';

// Padconfiguratie voor statische bestanden
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express app setup
const app = express();
app.use(express.json());

// CORS ondersteuning voor ontwikkeling
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Gezondheidscheck endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    dbType: 'Firebase Realtime Database',
    dbUrl: 'https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app'
  });
});

// Test database endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const dbRef = ref(database, '.info/connected');
    const snapshot = await get(dbRef);
    
    res.json({
      success: true,
      connected: snapshot.val() === true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Leden ophalen
app.get('/api/members', async (req, res) => {
  try {
    const membersRef = ref(database, 'members');
    const snapshot = await get(membersRef);
    
    if (!snapshot.exists()) {
      return res.json([]);
    }
    
    // Zet de Firebase object data om naar een array voor client gebruik
    const members = [];
    const data = snapshot.val();
    
    for (const key in data) {
      members.push({
        id: key,
        ...data[key]
      });
    }
    
    // Sorteer op lidnummer
    members.sort((a, b) => a.memberNumber - b.memberNumber);
    
    res.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Lid ophalen op ID
app.get('/api/members/:id', async (req, res) => {
  try {
    const memberRef = ref(database, `members/${req.params.id}`);
    const snapshot = await get(memberRef);
    
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    res.json({
      id: req.params.id,
      ...snapshot.val()
    });
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({ error: 'Failed to fetch member' });
  }
});

// Lid toevoegen
app.post('/api/members', async (req, res) => {
  try {
    // Verminder logs en gebruik meer foutafhandeling
    console.log('POST /api/members - Verzoek ontvangen');
    
    // Log Firebase verbinding status
    try {
      const connectionRef = ref(database, '.info/connected');
      const connectionSnap = await get(connectionRef);
      console.log('Firebase verbinding status:', connectionSnap.val() ? 'verbonden' : 'niet verbonden');
    } catch (connectionError) {
      console.error('Kon Firebase verbinding niet controleren:', connectionError.message);
    }
    
    // Basisvalidatie
    const { firstName, lastName, phoneNumber } = req.body;
    if (!firstName || !lastName || !phoneNumber) {
      return res.status(400).json({
        error: 'Ontbrekende verplichte velden',
        required: ['firstName', 'lastName', 'phoneNumber']
      });
    }
    
    // Probeer lid aan te maken met verbeterde foutafhandeling
    let memberNumber;
    try {
      // Genereer lidnummer
      memberNumber = await getNextMemberNumber();
      console.log('Lidnummer gegenereerd:', memberNumber);
    } catch (numberError) {
      console.error('Fout bij lidnummer generatie:', numberError.message);
      // Gebruik fallback nummer
      memberNumber = Math.floor(Date.now() / 1000) % 10000;
      console.log('Fallback lidnummer gebruikt:', memberNumber);
    }
    
    // Maak nieuw lid aan
    const newMember = {
      memberNumber,
      firstName,
      lastName,
      phoneNumber,
      email: req.body.email || '',
      birthDate: req.body.birthDate || null,
      accountNumber: req.body.accountNumber || '',
      paymentStatus: req.body.paymentStatus || false,
      registrationDate: new Date().toISOString(),
      notes: req.body.notes || ''
    };
    
    // Voeg toe aan Firebase
    let newMemberRef;
    try {
      const membersRef = ref(database, 'members');
      newMemberRef = push(membersRef);
      await set(newMemberRef, newMember);
      console.log('Lid succesvol toegevoegd met ID:', newMemberRef.key);
    } catch (databaseError) {
      console.error('Database fout bij toevoegen lid:', databaseError.message);
      return res.status(500).json({ 
        error: 'Kon lid niet opslaan in database',
        details: databaseError.message
      });
    }
    
    // Stuur antwoord terug met ID
    res.status(201).json({
      id: newMemberRef.key,
      ...newMember
    });
  } catch (error) {
    console.error('Algemene fout bij lid toevoegen:', error.message);
    res.status(500).json({ 
      error: 'Kon lid niet aanmaken',
      details: error.message
    });
  }
});

// Lid bijwerken
app.put('/api/members/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const memberRef = ref(database, `members/${id}`);
    
    // Controleer of lid bestaat
    const snapshot = await get(memberRef);
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    // Update velden (behoud bestaande waarden als niet meegeleverd)
    const currentData = snapshot.val();
    const updatedMember = {
      ...currentData,
      ...req.body,
      // Zorg dat lidnummer niet wijzigt
      memberNumber: currentData.memberNumber
    };
    
    // Update in Firebase
    await update(memberRef, updatedMember);
    
    // Stuur bijgewerkte data terug
    res.json({
      id,
      ...updatedMember
    });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// Lid verwijderen
app.delete('/api/members/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const memberRef = ref(database, `members/${id}`);
    
    // Controleer of lid bestaat
    const snapshot = await get(memberRef);
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    // Sla lidnummer op voor hergebruik
    const memberData = snapshot.val();
    const memberNumber = memberData.memberNumber;
    
    // Bewaar lidnummer in deletedMemberNumbers
    try {
      const deletedNumbersRef = ref(database, 'deletedMemberNumbers');
      const newDeletedRef = push(deletedNumbersRef);
      await set(newDeletedRef, {
        memberNumber,
        deletedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Fout bij opslaan verwijderd lidnummer:", error.message);
      // Ga door ondanks de fout, om het lid toch te verwijderen
    }
    
    // Verwijder het lid
    await remove(memberRef);
    
    res.json({ success: true, message: `Member ${id} deleted successfully` });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

// Serveer statische bestanden als deze beschikbaar zijn
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// Vang-all route voor SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Start server in development
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

// Export voor Vercel
export default app;