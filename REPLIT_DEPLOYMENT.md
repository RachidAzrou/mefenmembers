# Gratis Replit Deployment Handleiding voor MEFEN Moskee Beheer

## Stap 1: Firebase Setup (Gratis Spark Plan)

### Firebase Project Aanmaken
1. Ga naar [Firebase Console](https://console.firebase.google.com)
2. Klik op "Add Project" of "Project Toevoegen"
3. Kies een project naam (bijvoorbeeld "mefen-moskee-beheer")
4. Schakel Google Analytics uit (niet nodig voor basis functionaliteit)
5. Klik op "Create Project" of "Project Aanmaken"

### Firebase Authentication Instellen
1. In je Firebase Console, ga naar "Authentication" > "Get Started"
2. Activeer "Email/Password" als sign-in methode
3. Voeg een eerste admin gebruiker toe via de Firebase Console

### Firebase Config Verzamelen
1. Ga naar Project Settings (tandwiel icoon) > General
2. Scroll naar beneden en klik op het web icoon (</>)
3. Registreer je app met een naam (bijvoorbeeld "mefen-web")
4. Kopieer de volgende configuratie waardes:
   - apiKey
   - projectId
   - appId

## Stap 2: Replit Setup

### Environment Variabelen Instellen
1. Ga naar de "Secrets" tab in je Replit project (sleuteltje icoon)
2. Voeg de volgende secrets toe:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

### Domain Configuratie
1. Kopieer je Replit URL (bijvoorbeeld `https://mefen-moskee-beheer.yourusername.repl.co`)
2. Ga terug naar Firebase Console > Authentication > Settings
3. Voeg je Replit URL toe aan "Authorized Domains"

## Stap 3: App Starten
1. Zorg dat je in de Shell tab bent
2. Run het volgende commando:
   ```bash
   npm run dev
   ```
3. Je app is nu live op je Replit URL!

## Gratis Tier Limieten

### Firebase Spark Plan Limieten
- Authentication: 50,000 authentications per maand
- Realtime Database: 100 gelijktijdige connecties
- Storage: 1GB
- Data transfer: 10GB/maand

### Replit Gratis Plan Limieten
- Always-on: Nee (app slaapt na inactiviteit)
- RAM: 512 MB
- Storage: 500 MB
- CPU: Gedeeld

Tips voor optimaal gebruik:
1. Gebruik de "Always On" badge op je Repl om te zien wanneer je app actief is
2. Monitor je Firebase gebruik in de Firebase Console
3. Optimaliseer je assets en database queries
4. Gebruik efficiënte caching strategieën

## Troubleshooting

### App Slaapt
De gratis Replit tier laat apps slapen na inactiviteit. Dit is normaal gedrag.
- Eerste load kan 15-30 seconden duren
- App wordt automatisch wakker bij bezoek
- Gebruik een monitoring service om je app wakker te houden (optioneel)

### Firebase Problemen
- **Auth Errors**: Controleer of je Replit domain is toegevoegd aan Firebase Authorized Domains
- **Database Errors**: Verifieer je security rules
- **Performance Issues**: Check Firebase Performance monitoring

### Support & Resources
- Firebase Docs: [firebase.google.com/docs](https://firebase.google.com/docs)
- Replit Docs: [docs.replit.com](https://docs.replit.com)
- Firebase Status: [status.firebase.google.com](https://status.firebase.google.com)
