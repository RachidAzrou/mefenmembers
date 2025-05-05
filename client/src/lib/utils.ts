import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format telefoonnummer voor weergave in het patroon 0493-40-14-11
export function formatPhoneNumber(phoneNumber: string): string {
  // Verwijder niet-numerieke tekens
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    // Formatteer als 0493-40-14-11 (4-2-2-2 patroon)
    return cleaned.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3-$4');
  } else if (cleaned.length === 9) {
    // Voor 9-cijferige nummers (zonder landcode)
    return cleaned.replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3-$4');
  } else if (cleaned.length === 8) {
    // Voor 8-cijferige nummers
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3-$4');
  } else if (cleaned.startsWith('06') && cleaned.length === 10) {
    // Speciaal geval voor Nederlandse mobiele nummers
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3-$4-$5');
  }
  
  // Fallback voor andere lengtes - probeer een logisch patroon te volgen
  if (cleaned.length > 4) {
    // Voor nummers met meer dan 4 cijfers, splits in groepen van 2
    const groups = [];
    
    // Eerste 4 cijfers als eerste groep
    groups.push(cleaned.substring(0, 4));
    
    // Rest van de cijfers in groepen van 2
    for (let i = 4; i < cleaned.length; i += 2) {
      groups.push(cleaned.substring(i, Math.min(i + 2, cleaned.length)));
    }
    
    return groups.join('-');
  }
  
  // Voor zeer korte nummers, geef ze ongeformatteerd terug
  return cleaned;
}
