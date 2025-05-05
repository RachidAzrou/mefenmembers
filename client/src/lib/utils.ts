import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format telefoonnummer voor weergave (bijv. 06-12345678)
export function formatPhoneNumber(phoneNumber: string): string {
  // Verwijder niet-numerieke tekens
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Controleer of het een Nederlands mobiel nummer is (begint met 06)
  if (cleaned.startsWith('06') && cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{8})/, '$1-$2');
  } 
  
  // Algemene formattering voor andere nummers
  return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
}
