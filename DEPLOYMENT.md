# Complete Free Deployment Guide for MEFEN Moskee Beheer

## Stap 1: Firebase Setup (Gratis Spark Plan)

### Firebase Project Setup
1. Ga naar [Firebase Console](https://console.firebase.google.com)
2. Klik op "Add Project" of "Project Toevoegen"
3. Kies een project naam (bijvoorbeeld "mefen-moskee-beheer")
4. Schakel Google Analytics uit (niet nodig voor basis functionaliteit)
5. Klik op "Create Project" of "Project Aanmaken"

### Firebase Authentication Setup
1. In je Firebase Console, ga naar "Authentication" > "Get Started"
2. Activeer "Email/Password" als sign-in methode
3. Voeg een eerste admin gebruiker toe via de Firebase Console

### Firebase Configuratie
1. Ga naar Project Settings (tandwiel icoon) > General
2. Scroll naar beneden en klik op het web icoon (</>)
3. Registreer je app met een naam (bijvoorbeeld "mefen-web")
4. Kopieer de volgende waardes uit de configuratie:
   ```
   apiKey
   projectId
   appId
   ```

## Stap 2: Vercel Setup (Gratis Hobby Plan)

### 1. GitHub Repository Voorbereiden
```bash
# Clone je repository (als je dat nog niet hebt gedaan)
git clone <your-repo-url>
cd mefen-moskee-beheer

# Zorg ervoor dat alle wijzigingen zijn gecommit
git add .
git commit -m "Ready for deployment"
git push
```

### 2. Vercel Account & Project Setup
1. Ga naar [Vercel](https://vercel.com)
2. Sign up met je GitHub account
3. Klik op "New Project"
4. Importeer je GitHub repository
5. Configureer de volgende Environment Variables:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```
6. Laat de Build and Output Settings ongewijzigd (Vercel detecteert automatisch Vite)
7. Klik op "Deploy"

### 3. Domain Setup
1. Wacht tot de deployment klaar is
2. Kopieer je Vercel deployment URL (bijvoorbeeld `your-app.vercel.app`)
3. Ga terug naar Firebase Console > Authentication > Settings
4. Voeg je Vercel URL toe aan "Authorized Domains"

## Gratis Tier Limieten & Monitoring

### Firebase Spark Plan Limieten
- Authentication: 50,000 authentications per maand
- Realtime Database: 100 gelijktijdige connecties
- Storage: 1GB
- Data transfer: 10GB/maand

Tips voor Firebase:
- Monitor je gebruik in de Firebase Console
- Stel waarschuwingen in voor gebruik limieten
- Optimaliseer database queries om data verbruik te minimaliseren

### Vercel Hobby Tier Limieten
- Bandwidth: 100GB per maand
- Serverless Function Execution: 100GB-hrs per maand
- Deployments: Ongelimiteerd
- Builds: Maximaal 100 per dag

Tips voor Vercel:
- Gebruik de Vercel Analytics om bandwidth te monitoren
- Zet caching headers goed voor statische assets
- Optimaliseer afbeeldingen voor web gebruik

## Post-Deployment Checklist
1. Test de volgende functionaliteiten:
   - [ ] Inloggen met email/wachtwoord
   - [ ] PWA installatie op mobiel/desktop
   - [ ] Kalender en planning functionaliteiten
   - [ ] Moskee informatie bewerken
   - [ ] Offline functionaliteit

2. Controleer error monitoring:
   - [ ] Firebase Console voor authenticatie errors
   - [ ] Vercel deployment logs
   - [ ] Browser console voor client-side errors

## Troubleshooting

### Firebase Problemen
- **Auth Errors**: Controleer of je domain is toegevoegd aan Firebase Authorized Domains
- **Database Errors**: Verifieer je security rules in Firebase Console
- **Performance Issues**: Check de Firebase Performance monitoring tab

### Vercel Problemen
- **Build Failures**: Check de build logs in Vercel dashboard
- **Runtime Errors**: Bekijk de Function logs in Vercel
- **Deployment Issues**: Controleer of alle environment variables correct zijn ingesteld

## Support & Resources
- Firebase Documentation: [firebase.google.com/docs](https://firebase.google.com/docs)
- Vercel Documentation: [vercel.com/docs](https://vercel.com/docs)
- Firebase Status: [status.firebase.google.com](https://status.firebase.google.com)
- Vercel Status: [vercel.statuspage.io](https://vercel.statuspage.io)

## Vereisten
- Node.js 20 of hoger
- NPM 8 of hoger
- Een hosting platform (bijv. Vercel, Netlify, DigitalOcean)

## Environment Variabelen
Zorg ervoor dat de volgende environment variabelen zijn geconfigureerd:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Build Instructies

1. Clone het project:
```bash
git clone <repository-url>
cd mefen-moskee-beheer
```

2. Installeer dependencies:
```bash
npm install
```

3. Build de applicatie:
```bash
npm run build
```

De gebouwde applicatie bevindt zich in de `dist` map.

## Deployment Opties

### 1. Vercel
#### Voorbereiding
1. Maak een account aan op [Vercel](https://vercel.com)
2. Installeer de [Vercel CLI](https://vercel.com/cli) (optioneel)
3. Push je code naar een Git repository (GitHub, GitLab, of Bitbucket)

#### Deployment Stappen
##### Optie 1: Via Vercel Dashboard
1. Ga naar [vercel.com/new](https://vercel.com/new)
2. Importeer je Git repository
3. Configureer de environment variabelen (zie boven)
4. Klik op "Deploy"

##### Optie 2: Via Vercel CLI
1. Open een terminal in je project directory
2. Run:
```bash
vercel login
vercel
```

#### Na Deployment
1. Voeg je Vercel domain toe aan de Firebase Authorized Domains lijst
   - Ga naar Firebase Console > Authentication > Settings > Authorized domains
   - Voeg je Vercel domain toe (bijvoorbeeld: `your-app.vercel.app`)
2. Test de PWA functionaliteit op je gedeployde domein
3. Controleer of de Firebase authenticatie correct werkt

#### Custom Domain Configuratie
1. Ga naar je Vercel project settings
2. Klik op "Domains"
3. Voeg je custom domain toe
4. Volg de DNS configuratie instructies
5. Voeg het custom domain ook toe aan Firebase Authorized Domains

#### Troubleshooting
- Als de app niet laadt, controleer de environment variabelen in Vercel
- Bij authenticatie problemen, controleer of het domain is toegevoegd aan Firebase
- Voor PWA problemen, controleer of alle static assets correct worden geladen

#### Automatische Deployments
Vercel zal automatisch nieuwe versies deployen wanneer je pushed naar de main/master branch van je Git repository.

#### Build Configuratie
De build configuratie is al ingesteld in `vercel.json` en gebruikt de volgende scripts:
- Build command: `npm run build`
- Output directory: `dist/public`

#### Monitoring
1. Gebruik de Vercel Dashboard voor:
   - Deployment status
   - Performance metrics
   - Error logging
   - Analytics

#### Support
Voor technische problemen met de deployment:
- Vercel Documentation: [vercel.com/docs](https://vercel.com/docs)
- Vercel Support: [vercel.com/support]


### 2. Netlify
1. Push je code naar GitHub
2. Koppel je repository aan Netlify
3. Stel de build command in op `npm run build`
4. Stel de publish directory in op `dist`
5. Configureer de environment variabelen in de Netlify dashboard

### 3. Eigen Server
1. Build de applicatie lokaal
2. Upload de inhoud van de `dist` map naar je webserver
3. Configureer je webserver (Apache/Nginx) om een SPA te serveren
4. Stel de environment variabelen in op je server

## Na Deployment
1. Voeg je domein toe aan de Firebase Authorized Domains lijst
2. Test de PWA functionaliteit op je gedeployde domein
3. Controleer of alle Firebase authenticatie correct werkt

## Webserver Configuratie

### Nginx Voorbeeld Config
```nginx
server {
    listen 80;
    server_name jouw-domein.nl;
    root /pad/naar/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Apache Voorbeeld Config (.htaccess)
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>