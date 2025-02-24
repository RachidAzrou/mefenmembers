# Snelle Deployment Handleiding voor MEFEN Moskee Beheer

## 1. Firebase Setup (Gratis)
1. Ga naar [Firebase Console](https://console.firebase.google.com)
2. Maak een nieuw project aan (sla Google Analytics over)
3. Schakel Authentication > Email/Wachtwoord in
4. Ga naar Project Instellingen > Web App (</>)
5. Kopieer deze waardes:
   ```
   apiKey
   projectId
   appId
   ```

## 2. Vercel Deployment (Gratis)
1. Ga naar [Vercel](https://vercel.com)
2. Log in met GitHub
3. Klik op "New Project" > Importeer je repository
4. Voeg Environment Variables toe:
   ```
   VITE_FIREBASE_API_KEY=jouw_api_key
   VITE_FIREBASE_PROJECT_ID=jouw_project_id
   VITE_FIREBASE_APP_ID=jouw_app_id
   ```
5. Klik op "Deploy"!
6. Kopieer je Vercel URL (bijvoorbeeld: jouw-app.vercel.app)
7. Voeg deze URL toe aan Firebase Console > Authentication > Authorized Domains

## Gratis Limieten
- Firebase: 50.000 authenticaties/maand, 1GB opslag
- Vercel: 100GB bandbreedte/maand, onbeperkte deployments

Heeft u hulp nodig? Ik kan u door elke stap begeleiden!

## Belangrijke Notities
- De gratis tier is ruim voldoende voor de meeste moskeeën
- Alle core functionaliteiten blijven behouden
- Updates kunnen eenvoudig worden uitgerold via Vercel
- Automatische SSL/HTTPS beveiliging inbegrepen