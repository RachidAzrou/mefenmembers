# Instructies voor het oplossen van de privacy checkbox bug in productie

## Probleem

Bij het indienen van een lidmaatschapsaanvraag krijgt de gebruiker een leeg scherm wanneer op de privacyconsentcheckbox wordt geklikt.

## Analyse

Het probleem wordt veroorzaakt door een onClick handler op het div-element dat de checkbox bevat. Deze handler conflicteert met de checkbox zelf, waardoor er een JavaScript-fout optreedt die het scherm leeg maakt.

## Oplossing

De oplossing is om de onClick handler van het div-element te verwijderen en in plaats daarvan de checkbox correct te koppelen met het label via een ID.

## Instructies voor Vercel deployment

### Optie 1: Nieuwe build en deploy

1. Clone het project van GitHub als je dat nog niet hebt gedaan.
2. Zorg ervoor dat de `register-request.tsx` file de correcte code bevat (zie hieronder).
3. Voer het volgende commando uit om een nieuwe build te maken:
   ```bash
   npm run build
   ```
4. Deploy de build naar Vercel met een van de volgende methoden:
   - Via Git: commit en push je wijzigingen, Vercel zal automatisch een nieuwe build maken
   - Via Vercel CLI: `vercel --prod` in de hoofdmap van het project
   - Via Vercel Dashboard: upload de dist map via de Vercel web interface

### Optie 2: Directe aanpassing in Vercel Dashboard

Als je geen toegang hebt tot de broncode of ontwikkelomgeving, kun je deze wijzigingen rechtstreeks in de Vercel dashboard maken:

1. Log in op je Vercel account
2. Ga naar het MEFEN Moskee project
3. Ga naar "Deployments" en klik op de laatste deployment
4. Klik op "Source" om de bronbestanden te bekijken
5. Zoek het bestand `register-request.js` (of soortgelijk) in de gebouwde bestanden
6. Identificeer en vervang de problematische code in het privacy consent gedeelte:

### De correcte code voor de privacy consent checkbox:

```jsx
<FormField
  control={form.control}
  name="privacyConsent"
  render={({ field }) => (
    <FormItem className="border border-gray-200 rounded-lg shadow-sm">
      <div className="flex flex-row items-start space-x-4 p-4 sm:p-5">
        <FormControl>
          <Checkbox
            checked={field.value}
            onCheckedChange={field.onChange}
            className="mt-1 h-6 w-6 rounded-md data-[state=checked]:bg-[#963E56] data-[state=checked]:text-white"
            id="privacy-consent-checkbox"
          />
        </FormControl>
        <div className="space-y-1 leading-tight">
          <FormLabel 
            htmlFor="privacy-consent-checkbox"
            className="text-base font-medium cursor-pointer"
            onClick={(e) => e.preventDefault()}
          >
            Ik ga akkoord met de verwerking van mijn gegevens <span className="text-red-500">*</span>
          </FormLabel>
          <FormDescription className="text-xs sm:text-sm">
            Je gegevens worden vertrouwelijk behandeld en alleen gebruikt voor het beheren van je lidmaatschap.
          </FormDescription>
        </div>
      </div>
      <FormMessage className="px-4 pb-3" />
    </FormItem>
  )}
/>
```

### De problematische code die vervangen moet worden:

```jsx
<FormField
  control={form.control}
  name="privacyConsent"
  render={({ field }) => (
    <FormItem className="border border-gray-200 rounded-lg shadow-sm">
      <div 
        className="flex flex-row items-start space-x-4 p-4 sm:p-5"
        onClick={() => field.onChange(!field.value)}
      >
        <FormControl>
          <Checkbox
            checked={field.value}
            onCheckedChange={field.onChange}
            className="mt-1 h-6 w-6 rounded-md data-[state=checked]:bg-[#963E56] data-[state=checked]:text-white"
          />
        </FormControl>
        <div className="space-y-1 leading-tight">
          <FormLabel className="text-base font-medium cursor-pointer">
            Ik ga akkoord met de verwerking van mijn gegevens <span className="text-red-500">*</span>
          </FormLabel>
          <FormDescription className="text-xs sm:text-sm">
            Je gegevens worden vertrouwelijk behandeld en alleen gebruikt voor het beheren van je lidmaatschap.
          </FormDescription>
        </div>
      </div>
      <FormMessage className="px-4 pb-3" />
    </FormItem>
  )}
/>
```

## Na de deployment

1. Test de functionaliteit door een nieuwe lidmaatschapsaanvraag in te dienen
2. Controleer specifiek of je op de privacycheckbox kunt klikken zonder dat het scherm leeg wordt
3. Zorg ervoor dat het versturen van het formulier werkt als de checkbox is aangevinkt