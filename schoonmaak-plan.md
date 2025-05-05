# Opschoonplan MEFEN Ledenbeheer App

## Te behouden bestanden en mappen

### Essentiële app-bestanden
- `client/` map - Bevat de frontend applicatie
  - `client/src/` - Broncode van de React applicatie
  - `client/public/` - Statische bestanden en assets

### Essentiële configuratiebestanden
- `package.json` - Projectconfiguratie en dependencies
- `package-lock.json` - Lock file voor dependencies
- `tailwind.config.ts` - Tailwind CSS configuratie
- `postcss.config.js` - PostCSS configuratie 
- `tsconfig.json` - TypeScript configuratie
- `vite.config.ts` - Vite configuratie
- `theme.json` - UI thema configuratie

### Serverconfiguratie
- `server/` map - Backend logica
- `shared/` map - Gedeelde types en schema's

### Deployment bestanden
- Eén geoptimaliseerde versie van de deployment bestanden (Firebase/Vercel integratie)

## Bestanden om te verwijderen

### Overbodige bestanden
- `sufuf-standalone/` - Niet meer gebruikte standalone app
- `.local/` - Tijdelijke bestanden
- `attached_assets/` - Oude assets en snippets, niet meer in gebruik
- Alle tar.gz bestanden, behalve de nieuwste geoptimaliseerde versie
- Oude of dubbele configuratiebestanden
- Tijdelijke bestanden (.bak, etc.)

### Overbodige pagina's
De volgende pagina's worden niet gebruikt in de huidige App.tsx routing:
- `equipment.tsx`
- `materials.tsx`
- `rooms.tsx`
- `spaces.tsx`
- `communication.tsx`
- `planning.tsx`
- `volunteers.tsx`

### Oude deployment configuraties
- Oude Vercel deploymentsbestanden die zijn vervangen
- Verouderde database configuratiebestanden (PostgreSQL gerelateerd)

## Te volgen stappen
1. Backup maken van de volledige codebase
2. Verwijderen van overbodige bestanden en mappen
3. Cleanup van oude pagina's en components die niet meer worden gebruikt
4. Bijwerken van huidige Firebase configuratie
5. Optimaliseren van build process