# Snelle fix voor privacy checkbox probleem

Het privacy checkbox probleem kan snel opgelost worden door deze stappen te volgen:

1. Open het bestand `client/src/pages/register-request.tsx` in je project
2. Zoek naar het volgende stuk code (rond regel 920):

```jsx
<div 
  className="flex flex-row items-start space-x-4 p-4 sm:p-5"
  onClick={() => field.onChange(!field.value)}
>
```

3. Vervang dit door:

```jsx
<div className="flex flex-row items-start space-x-4 p-4 sm:p-5">
```

4. Zoek nu naar de Checkbox component (enkele regels later):

```jsx
<Checkbox
  checked={field.value}
  onCheckedChange={field.onChange}
  className="mt-1 h-6 w-6 rounded-md data-[state=checked]:bg-[#963E56] data-[state=checked]:text-white"
/>
```

5. Voeg het `id` attribuut toe:

```jsx
<Checkbox
  checked={field.value}
  onCheckedChange={field.onChange}
  className="mt-1 h-6 w-6 rounded-md data-[state=checked]:bg-[#963E56] data-[state=checked]:text-white"
  id="privacy-consent-checkbox"
/>
```

6. Zoek naar de FormLabel component (enkele regels later):

```jsx
<FormLabel className="text-base font-medium cursor-pointer">
```

7. Voeg het `htmlFor` attribuut toe:

```jsx
<FormLabel 
  htmlFor="privacy-consent-checkbox"
  className="text-base font-medium cursor-pointer"
  onClick={(e) => e.preventDefault()}
>
```

8. Sla het bestand op, commit en push naar je Git repository
9. Vercel zal automatisch een nieuwe versie bouwen en deployen

Na deze wijzigingen zal het privacy checkbox probleem opgelost zijn en zal er geen leeg scherm meer verschijnen wanneer gebruikers op de checkbox klikken.