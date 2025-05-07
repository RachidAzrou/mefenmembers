# Productie Fix Instructies

Deze instructies helpen bij het oplossen van twee kritieke problemen in de productieomgeving:

1. **Privacy checkbox probleem** - Oplossing voor leeg scherm bij klikken op de privacy checkbox
2. **405 Method Not Allowed fout** - Oplossing voor het ontbrekende API-endpoint voor lidmaatschapsaanvragen

## Probleem 1: Privacy Checkbox Fix

### Het probleem
Wanneer een gebruiker op de privacy checkbox klikt in het registratieformulier, verschijnt er een leeg scherm.

### De oplossing
De oplossing zit in het aanpassen van de `register-request.tsx` code. Dit bestand is al gecorrigeerd in de lokale omgeving, maar moet nog worden doorgevoerd in de productieomgeving.

### Wat is er veranderd?
1. De `onClick` handler is verwijderd van het div-element dat de checkbox bevat
2. Er is een `id="privacy-consent-checkbox"` toegevoegd aan de checkbox
3. Er is een `htmlFor="privacy-consent-checkbox"` attribuut toegevoegd aan het label
4. Er is een `onClick={(e) => e.preventDefault()}` handler toegevoegd aan het label

## Probleem 2: 405 Method Not Allowed Fix

### Het probleem
Wanneer een gebruiker het aanmeldformulier verstuurt, krijgt deze een 405 (Method Not Allowed) fout omdat het API-endpoint voor lidmaatschapsaanvragen ontbreekt in de productieomgeving.

### De oplossing
Er is een nieuw bestand gemaakt genaamd `member-requests.js` in de `vercel-deploy/api/` map dat de API-endpoints voor lidmaatschapsaanvragen implementeert.

## Implementatie in productie

Om deze fixes te implementeren in de productieomgeving, kunt u een van de volgende methodes gebruiken:

### Methode 1: Directe Update in Vercel Dashboard

1. Log in op uw Vercel account
2. Ga naar het project dashboard van uw MEFEN-applicatie
3. Ga naar het "Files" tabblad
4. Navigeer naar `/api/` en upload het nieuwe bestand `member-requests.js`
   - Upload het bestand dat u vindt in deze repository onder `vercel-deploy/api/member-requests.js`
5. Als de privacy checkbox fix nog niet is doorgevoerd, zoek dan het bestand `register-request.tsx` en pas het aan zoals beschreven in "Probleem 1"

### Methode 2: Nieuwe Deployment

1. Push de huidige wijzigingen naar uw GitHub repository
2. Vercel zal automatisch een nieuwe deployment starten
3. Controleer of de deployment succesvol is
4. Test de applicatie om te verifiëren dat beide problemen zijn opgelost

### Methode 3: CLI Deployment

Als u Vercel CLI heeft geïnstalleerd, kunt u de volgende commando's gebruiken:

```bash
# Ga naar de hoofdmap van het project
cd /path/to/mefen-project

# Gebruik Vercel CLI om te deployen
vercel --prod
```

## Verificatie

Na het implementeren van de fixes, controleer het volgende:

1. **Privacy checkbox test**: Ga naar het registratieformulier en klik op de privacy checkbox. Er zou geen leeg scherm mogen verschijnen.

2. **Aanmeldingstest**: Vul het volledige registratieformulier in en klik op versturen. U zou een bevestiging moeten krijgen dat de aanvraag is ingediend (geen 405 fout).

## Rollback Plan

Als er problemen zijn met de nieuwe implementatie, kunt u altijd terugkeren naar een vorige werkende versie via het Vercel dashboard:

1. Ga naar het "Deployments" tabblad in het Vercel dashboard
2. Zoek de laatste werkende deployment
3. Klik op "..." naast die deployment
4. Selecteer "Promote to Production"

## Contact

Als u vragen heeft of hulp nodig heeft bij het implementeren van deze fixes, neem dan contact op met [contactgegevens].