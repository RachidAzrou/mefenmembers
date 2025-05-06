# Firebase Service Account Configuratie

Plaats hier je Firebase service account JSON-bestand en hernoem het naar `service-account.json`.

## Stappen voor het verkrijgen van een service account:

1. Ga naar de [Firebase console](https://console.firebase.google.com/)
2. Selecteer je project
3. Ga naar Projectinstellingen (tandwielpictogram rechtsboven)
4. Ga naar het tabblad "Service accounts"
5. Klik op "Generate new private key" en download het JSON-bestand
6. Plaats het gedownloade bestand in deze map en hernoem het naar `service-account.json`

## Waarom dit belangrijk is:

De service account geeft je server beveiligde toegang tot de Firebase database, zelfs wanneer er beveiligingsregels zijn ingesteld die authenticatie vereisen.

## Alternatief: Environment variabelen

Je kunt ook omgevingsvariabelen gebruiken in plaats van het bestand. In dat geval stel je deze variabelen in:

- `VITE_FIREBASE_PROJECT_ID` - Het project ID van je Firebase-project
- `FIREBASE_CLIENT_EMAIL` - Het client email-adres van je service account
- `FIREBASE_PRIVATE_KEY` - De private key van je service account (incl. quotes en \n escape tekens)
- `FIREBASE_DATABASE_URL` - De URL van je Realtime Database (optioneel)