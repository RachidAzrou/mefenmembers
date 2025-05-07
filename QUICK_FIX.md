# Snelle Fix Instructies voor Vercel Productie

## Probleem 1: Privacy checkbox → leeg scherm
- Privacy checkbox veroorzaakt een leeg scherm bij klikken

## Probleem 2: 405 Method Not Allowed fout
- Bij versturen van aanvraagformulier krijgt gebruiker een 405 fout

## Oplossing:

### Stap 1: Voeg nieuw API endpoint toe
1. Upload `vercel-deploy/api/member-requests.js` naar `/api/` in je Vercel project

### Stap 2: Update vercel.json
Voeg deze route toe tussen de bestaande routes:
```json
{
  "src": "/api/member-requests(/.*)?",
  "dest": "/api/member-requests.js"
},
```

### Stap 3: Controleer de privacy checkbox fix
Zorg dat het bestand `register-request.tsx` de volgende eigenschappen heeft:
- GEEN onClick handler op het div-element
- `id="privacy-consent-checkbox"` op de Checkbox component
- `htmlFor="privacy-consent-checkbox"` op het FormLabel
- `onClick={(e) => e.preventDefault()}` op het FormLabel

## Testen na implementatie:
1. Klik op de privacy checkbox - mag geen leeg scherm geven
2. Vul formulier volledig in en verstuur - moet aanvraag indienen zonder 405 fout

Voor uitgebreidere instructies, zie PRODUCTIE_FIX.md