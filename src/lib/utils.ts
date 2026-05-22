
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}

export function formatWhatsAppLink(phoneNumber: string, message: string) {
  const sanitized = phoneNumber.replace(/\D/g, '');
  return `https://wa.me/${sanitized.startsWith('91') ? sanitized : '91' + sanitized}?text=${encodeURIComponent(message)}`;
}
