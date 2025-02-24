# MEFEN Moskee Beheer - Deployment Guide

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

#### Environment Variabelen
Configureer de volgende environment variabelen in je Vercel project:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
```

#### Deployment Stappen

##### Optie 1: Via Vercel Dashboard
1. Ga naar [vercel.com/new](https://vercel.com/new)
2. Importeer je Git repository
3. Configureer de environment variabelen
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