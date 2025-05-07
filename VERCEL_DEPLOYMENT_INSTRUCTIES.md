# Instructies voor het oplossen van het privacy checkbox probleem in Vercel

## Het probleem
Wanneer gebruikers op de privacy checkbox in het registratieformulier klikken, verschijnt er een leeg scherm. Dit probleem treedt specifiek op in de Vercel productieomgeving.

## De oplossing
Het probleem wordt veroorzaakt door een onClick handler op het div-element rond de checkbox. We hebben dit probleem lokaal opgelost en nu moeten deze wijzigingen ook naar Vercel worden gebracht.

## Stappen voor het deployen van de fix naar Vercel

### Optie 1: De volledige applicatie opnieuw deployen

1. Zorg ervoor dat je de nieuwste versie van de code hebt (met de fix voor de privacy checkbox)
2. Build de applicatie met:
   ```
   npm run build
   ```
3. Deploy de applicatie naar Vercel met:
   ```
   vercel --prod
   ```
   
### Optie 2: Specifiek bestand wijzigen via het Vercel dashboard

Als je geen lokale ontwikkelomgeving hebt of liever direct in Vercel werkt:

1. Log in op het [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigeer naar je MEFEN Moskee project
3. Ga naar de recentste deployment
4. Klik op "Functions" of "Source" om de bronbestanden te bekijken
5. Zoek naar het register-request.js bestand (of soortgelijk bestand dat het registratieformulier afhandelt)
6. Lokaliseer de problematische code waar de privacy checkbox wordt gedefinieerd
7. Pas de volgende wijzigingen toe:

#### Problematische code (bevat de bug)
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

#### Gecorrigeerde code (bevat de fix)
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

1. **Verwijderd**: `onClick={() => field.onChange(!field.value)}` van het div-element
2. **Toegevoegd**: `id="privacy-consent-checkbox"` aan de Checkbox component
3. **Toegevoegd**: `htmlFor="privacy-consent-checkbox"` aan het FormLabel element
4. **Toegevoegd**: `onClick={(e) => e.preventDefault()}` aan het FormLabel element (optioneel, voorkomt dubbele klikgedrag)

## Testen na deployment

Test na het deployen of:
- Het registratieformulier correct werkt
- Je kunt klikken op de privacy checkbox zonder dat er een leeg scherm verschijnt
- Het formulier kan worden ingediend als alle velden correct zijn ingevuld