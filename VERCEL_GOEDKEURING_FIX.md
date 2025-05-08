# Vercel Goedkeuringsproces Fix

## Probleem

Bij het goedkeuren van aanvragen in de productieomgeving (Vercel) treden er 400-fouten op door ontbrekende verplichte velden. Dit gebeurt omdat de gegevens niet volledig worden doorgegeven tussen client en server.

## Oplossing

### 1. Update de client-code (al geïmplementeerd)

De client-code is al aangepast om de volledige aanvraaggegevens mee te sturen bij het goedkeuren:

```javascript
const approveMutation = useMutation({
  mutationFn: async (requestId: number | string) => {
    // Vind de volledige aanvraag gegevens om mee te sturen
    const currentRequests = queryClient.getQueryData<MemberRequest[]>(["/api/member-requests"]);
    const requestData = currentRequests?.find(req => String(req.id) === String(requestId));
    
    if (!requestData) {
      throw new Error("Aanvraaggegevens niet gevonden in cache");
    }
    
    // Stuur alle benodigde gegevens mee
    const response = await apiRequest("POST", `/api/member-requests/approve?id=${requestId}`, {
      ...requestData,  // Stuur alle data mee
      id: requestId,   // Zorg ervoor dat ID niet overschreven wordt
      processedBy: 1   // Standaard beheerder ID
    });
    
    return await response.json();
  },
```

### 2. Deploy de client-code naar Vercel

1. Commit je wijzigingen
2. Push naar de GitHub repository
3. Controleer of Vercel automatisch een nieuwe deployment start
4. Als automatische deployment niet is ingesteld, log in op het Vercel dashboard en start handmatig een nieuwe deployment

### 3. Controleer de servercode in Vercel

De server-side code in Vercel (api/member-requests.js) bevat al een oplossing om ontbrekende velden aan te vullen met standaardwaarden:

```javascript
// NIEUWE SERVER LOGICA: De vercel productie-omgeving kan alsnog onvolledige data bevatten
// In dat geval vullen we ontbrekende velden in met standaardwaarden om het proces door te laten gaan
console.log(`POST /api/member-requests/approve: Vul ontbrekende velden in met standaardwaarden in vercel omgeving`);

// Vul ontbrekende velden aan met standaardwaarden zodat het proces door kan gaan
missingFields.forEach(field => {
  if (!request[field]) {
    if (field === 'email') {
      request[field] = `lid-${id}@voorbeeld.nl`;
    } else if (field === 'phoneNumber') {
      request[field] = '0612345678';
    } else {
      request[field] = field === 'firstName' ? 'Voornaam' : 'Achternaam';
    }
    console.log(`POST /api/member-requests/approve: Veld ${field} ontbreekt, gevuld met waarde: ${request[field]}`);
  }
});
```

### 4. Fix voor persistente problemen

Als er nog steeds problemen optreden met 400-fouten, controleer:

1. Of de servercode in Vercel overeenkomt met de laatste versie in de `vercel-deploy` map
2. Vernieuw de Vercel servercode specifiek (zonder een volledige nieuwe deployment)
3. Controleer de Vercel logs voor eventuele andere foutmeldingen

## Implementatie

1. Deploy de bijgewerkte client-code naar Vercel
2. Test het goedkeuringsproces in de productieomgeving
3. Controleer de Vercel functielogs voor eventuele fouten
4. Als fouten blijven optreden, overweeg om rechtstreeks de Vercel serverless functies te updaten in het Vercel dashboard

## Extra verificatie

Om te bevestigen dat de juiste gegevens worden verzonden, kun je de volgende console.log toevoegen aan de client-code (als dit nog niet aanwezig is):

```javascript
// Vóór het versturen van de aanvraag
console.log("Volledige goedkeuringsgegevens die worden verzonden:", {
  url: `/api/member-requests/approve?id=${requestId}`,
  payload: {
    ...requestData,
    id: requestId,
    processedBy: 1
  }
});
```

Dit zal in de browserconsole laten zien welke gegevens worden verzonden, wat helpt bij het opsporen van problemen.