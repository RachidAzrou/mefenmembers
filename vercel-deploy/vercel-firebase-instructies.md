# Firebase Integratie Instructies voor Vercel Deployment

Deze handleiding loopt u stap voor stap door het proces om de MEFEN Leden applicatie correct te deployen op Vercel met Firebase Realtime Database.

## Inhoudsopgave
1. Firebase Configuratie
2. Vercel Configuratie
3. Deployment Stappen
4. Probleemoplossing

## 1. Firebase Configuratie

### 1.1 Firebase Project Instellingen
Zorg ervoor dat u de volgende Firebase configuratiegegevens beschikbaar hebt:
- **API Key**: Uit de Firebase console
- **Project ID**: Uit de Firebase console
- **App ID**: Uit de Firebase console
- **Database URL**: `https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app`

### 1.2 Firebase Realtime Database Regels
Voor de veiligheid van uw data, controleer of de Firebase Realtime Database regels correct zijn ingesteld:
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "members": {
      ".indexOn": ["memberNumber", "firstName", "lastName"]
    }
  }
}
```

## 2. Vercel Configuratie

### 2.1 Omgevingsvariabelen in Vercel
De volgende environment variables moeten in de Vercel project settings worden ingesteld:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `NODE_ENV`: stel deze in op `production`

### 2.2 Build Instellingen
Controleer of de build instellingen correct zijn:
- **Build Command**: `npm run build` (of laat leeg als u een pre-built versie uploadt)
- **Output Directory**: `dist` (of leeg laten bij een pre-built versie)
- **Install Command**: `npm install` (of leeg laten bij een pre-built versie)

## 3. Deployment Stappen

### 3.1 Voorbereiding
1. Zorg ervoor dat de code is aangepast voor Firebase Realtime Database (gebruik het meegeleverde `api/database.js` bestand).
2. Controleer of alle Firebase instellingen correct zijn in `api/index.js`.
3. Zorg ervoor dat het `vercel.json` bestand correct is geconfigureerd.

### 3.2 Deployment
1. Upload het project naar Vercel, of verbind met de Git repository.
2. Stel de environment variables in zoals hierboven beschreven.
3. Deploy het project en wacht tot het build proces is voltooid.
4. Test de gedeployde applicatie door in te loggen en te controleren of de ledendatabase toegankelijk is.

### 3.3 Testen
Na deployment, test de volgende functionaliteiten:
- Inloggen met Firebase authenticatie
- Het ophalen van leden uit de database
- Het toevoegen van een nieuw lid
- Het bijwerken van een bestaand lid
- Het verwijderen van een lid

## 4. Probleemoplossing

### 4.1 Database Connectie Issues
Als er problemen zijn met de database connectie:
1. Controleer of de Firebase omgevingsvariabelen correct zijn ingesteld in Vercel
2. Test de connectie met het `/api/test-db` endpoint
3. Controleer de Vercel logs voor eventuele foutmeldingen

### 4.2 Authenticatie Problemen
Bij authenticatie problemen:
1. Controleer of de Firebase authentication in de Firebase console is ingeschakeld
2. Controleer of de Authorized Domains in Firebase auth setting uw Vercel domain bevat

### 4.3 API Endpoint Fouten
Als API endpoints niet werken:
1. Controleer of de routes in het `vercel.json` bestand correct zijn geconfigureerd
2. Test de API endpoints met tools zoals Postman
3. Controleer de Vercel logs voor specifieke foutmeldingen in de serverless functies

## Contact voor Ondersteuning
Als u verdere hulp nodig heeft bij het deployen van de applicatie, neem dan contact op met de ontwikkelaar.