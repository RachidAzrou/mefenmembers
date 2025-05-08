# Instructies voor het oplossen van goedkeuringsfouten in Vercel

## Het probleem
Bij het goedkeuren van lidmaatschapsaanvragen krijg je een 400-fout "Ontbrekende verplichte velden" in de Vercel-omgeving.

## De oplossing
We hebben de client code aangepast om altijd de volledige aanvraaggegevens mee te sturen in plaats van alleen het ID. Dit zorgt voor maximale compatibiliteit tussen de lokale Express-server en de Vercel serverless functies.

## Stappen voor het deployen van de fix naar Vercel

### Volg deze stappen om de wijzigingen naar Vercel te deployen:

1. Zorg ervoor dat je de nieuwste versie van de code hebt (inclusief de wijzigingen in `client/src/pages/member-requests.tsx`)
2. Build de applicatie met:
   ```
   npm run build
   ```
3. Deploy de applicatie naar Vercel met:
   ```
   vercel --prod
   ```

## Belangrijkste wijzigingen:

1. In de client code (`client/src/pages/member-requests.tsx`):
   - De approveMutation functie verstuurt nu alle aanvraaggegevens in plaats van alleen het ID
   - Extra robuustheidscontroles zijn toegevoegd om problemen op te vangen
   - De UI wordt lokaal bijgewerkt, zelfs als er een serverprobleem is

2. In de server code (`api/member-requests.js`):
   - Extra logica om ontbrekende velden in Vercel-omgeving te detecteren en op te vangen
   - Verbeterde foutafhandeling voor duidelijkere foutmeldingen

## Testen na deployment

Test na het deployen of:
- Het goedkeuren van een lidmaatschapsaanvraag correct werkt op Vercel
- Er geen 400-fouten meer verschijnen tijdens het goedkeuringsproces
- De aanvraagstatus correct wordt bijgewerkt
- Een nieuw lid correct wordt aangemaakt in de database

## Technische details

De kern van de oplossing is het standaard meesturen van alle aanvraaggegevens in plaats van alleen het ID. Dit zorgt voor maximale compatibiliteit tussen verschillende server-implementaties:

```javascript
// Oorspronkelijke code (te minimalistisch)
const response = await apiRequest("POST", `/api/member-requests/approve?id=${request.id}`, {
  processedBy: 1
});

// Nieuwe code (volledige gegevens voor compatibiliteit)
const fullRequestData = {
  ...request,
  processedBy: 1
};
delete fullRequestData.processedDate;
delete fullRequestData.memberId;
delete fullRequestData.memberNumber;

const response = await apiRequest("POST", `/api/member-requests/approve?id=${request.id}`, fullRequestData);
```

De serverlogica is ook aangepast om beide benaderingen te ondersteunen, waarbij ontbrekende velden worden opgehaald uit de opgeslagen aanvraag indien nodig.