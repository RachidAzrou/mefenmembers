# MEFEN Moskee Beheer - Praktische Handleiding

## 1. App Installatie (Eenmalig)

### Stap 1: Firebase Project Opzetten
1. Ga naar [Firebase Console](https://console.firebase.google.com)
2. Klik op "Project Toevoegen"
3. Geef het project een naam (bijvoorbeeld "mefen-moskee")
4. Sla Google Analytics over (niet nodig)
5. In Authentication > Sign-in method, schakel "Email/Password" in
6. Ga naar Project Settings (tandwiel icoon)
7. Klik op web icon (</>)
8. Kopieer deze waardes:
   - apiKey
   - projectId
   - appId

### Stap 2: App Deployen
1. Ga naar [Vercel](https://vercel.com)
2. Log in met GitHub
3. Klik op "New Project" en importeer deze repository
4. Voeg deze Environment Variables toe:
   ```
   VITE_FIREBASE_API_KEY=gekopieerde_api_key
   VITE_FIREBASE_PROJECT_ID=gekopieerde_project_id
   VITE_FIREBASE_APP_ID=gekopieerd_app_id
   ```
5. Klik op "Deploy"
6. Na deployment, kopieer de Vercel URL (bijvoorbeeld: mefen-moskee.vercel.app)
7. Voeg deze URL toe in Firebase Console > Authentication > Authorized Domains

## 2. Dagelijks Gebruik

### Voor Beheerders
1. **Eerste Login**
   - Ga naar de Vercel URL van uw app
   - Log in met uw beheerdersaccount
   - U heeft nu toegang tot alle beheerdersfuncties

2. **Vrijwilligers Beheren**
   - Ga naar "Import/Export" in het menu
   - Hier ziet u alle nieuwe vrijwilligers aanmeldingen
   - Beoordeel de aanmeldingen en neem contact op met de vrijwilligers
   - In het "Vrijwilligers" menu kunt u de actieve vrijwilligers beheren

3. **Planning Beheren**
   - Gebruik de "Planning" pagina voor roosters
   - Wijs taken toe aan vrijwilligers
   - Plan activiteiten in

### Voor Vrijwilligers
1. **Aanmelden als Vrijwilliger**
   - Ga naar de app URL
   - Klik op "Word hier vrijwilliger"
   - Vul voor- en achternaam en telefoonnummer in
   - Wacht op contact van een beheerder

2. **Planning Bekijken**
   - Na goedkeuring kunt u inloggen op de app
   - Bekijk uw toegewezen taken
   - Check de algemene planning

## 3. Ondersteuning
- De app is gratis te gebruiken
- Automatische updates via Vercel
- Beveiligd met SSL/HTTPS
- Geschikt voor gebruik op telefoon, tablet en computer

## 4. Limieten (Gratis Versie)
- Tot 50.000 gebruikers per maand
- 1GB opslagruimte
- 100GB bandbreedte per maand
- Onbeperkte updates en deployments

Deze limieten zijn ruim voldoende voor normaal gebruik in de moskee.