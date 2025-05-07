# Fix voor de privacy checkbox bug in productie

## Probleem

In de productieversie op Vercel krijgen gebruikers een leeg scherm wanneer ze op de privacy checkbox klikken in het registratieformulier. Dit probleem wordt veroorzaakt door een onClick handler op het div-element dat de checkbox bevat.

## Oplossing

Je moet de code in het bestand `client/src/pages/register-request.tsx` aanpassen. Hier is de exacte code die je moet wijzigen:

### Huidige problematische code:

```jsx
<FormField
  control={form.control}
  name="privacyConsent"
  render={({ field }) => (
    <FormItem className="border border-gray-200 rounded-lg shadow-sm">
      <div 
        className="flex flex-row items-start space-x-4 p-4 sm:p-5"
        onClick={() => field.onChange(!field.value)}  // Deze regel veroorzaakt het probleem
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

### Vervang het door deze gecorrigeerde code:

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

## Belangrijkste wijzigingen:

1. **Verwijderd**: De `onClick={() => field.onChange(!field.value)}` handler van het div-element
2. **Toegevoegd**: `id="privacy-consent-checkbox"` aan de Checkbox component
3. **Toegevoegd**: `htmlFor="privacy-consent-checkbox"` aan het FormLabel element
4. **Toegevoegd**: `onClick={(e) => e.preventDefault()}` aan het FormLabel element om dubbele klikgedrag te voorkomen

## Implementeren van de fix:

1. Pas deze wijzigingen toe in het `register-request.tsx` bestand
2. Commit en push je wijzigingen naar je Git repository
3. Vercel zal automatisch een nieuwe versie bouwen en deployen

Of als alternatief:

1. Bouw een nieuwe versie lokaal met `npm run build`
2. Deploy de nieuwe versie handmatig naar Vercel met de Vercel CLI:
   ```
   vercel --prod
   ```

## Testen na deployment:

Na het deployen, test je of:
1. Het registratieformulier correct wordt geladen
2. Je kunt klikken op de privacy checkbox zonder dat het scherm leeg wordt
3. Je een aanvraag kunt indienen als alle velden correct zijn ingevuld