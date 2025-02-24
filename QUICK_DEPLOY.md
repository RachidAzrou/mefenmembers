# Snelle Deployment Handleiding voor MEFEN Moskee Beheer

## 1. Firebase Setup (Gratis)
1. Ga naar [Firebase Console](https://console.firebase.google.com)
2. Maak een nieuw project aan (sla Google Analytics over)
3. Schakel Authentication > Email/Wachtwoord in
4. Ga naar Project Instellingen > Web App (</>)
5. Registreer een nieuwe app en kopieer deze waardes:
   ```
   apiKey
   projectId
   appId
   ```

## 2. Vercel Deployment (Gratis)
1. Ga naar [Vercel](https://vercel.com)
2. Log in met GitHub
3. Klik op "New Project" > Importeer je repository
4. Belangrijke instellingen vóór deployment:
   - Build Command: `npm run build`
   - Output Directory: `dist/public`
   - Framework Preset: `Other`
5. Voeg Environment Variables toe:
   ```
   VITE_FIREBASE_API_KEY=jouw_api_key
   VITE_FIREBASE_PROJECT_ID=jouw_project_id
   VITE_FIREBASE_APP_ID=jouw_app_id
   ```
6. Ga naar Settings > Functions > Serverless Functions:
   - Zet Node.js Version op: 18.x
7. Klik op "Deploy"!
8. Kopieer je Vercel URL (bijvoorbeeld: jouw-app.vercel.app)
9. Voeg deze URL toe aan Firebase Console > Authentication > Authorized Domains

## Gratis Limieten
- Firebase: 50.000 authenticaties/maand, 1GB opslag
- Vercel: 100GB bandbreedte/maand, onbeperkte deployments

## Troubleshooting
Als je een 404 error krijgt:
1. Controleer of alle environment variables correct zijn ingesteld
2. Zorg dat Node.js versie 18.x is geselecteerd
3. Wacht 5-10 minuten na deployment voor DNS propagatie
4. Controleer de deployment logs in Vercel voor specifieke errors

## Belangrijke Notities
- De gratis tier is ruim voldoende voor de meeste moskeeën
- Alle core functionaliteiten blijven behouden
- Updates kunnen eenvoudig worden uitgerold via Vercel
- Automatische SSL/HTTPS beveiliging inbegrepen

Heeft u hulp nodig? Ik kan u door elke stap begeleiden!