/**
 * Tailwind CSS utility for merging class names
 * This is the only function needed from this file - all other utilities
 * are now centralized in their respective modules:
 * - formatters: ../utils/formatters.ts
 * - debounce: ../hooks/useDebounce.ts
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
