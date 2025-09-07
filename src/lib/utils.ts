import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateRandomKey(length: number, uppercase: boolean = true): string {
  const chars = '0123456789ABCDEF';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return uppercase ? result.toUpperCase() : result.toLowerCase();
}

export function formatHex(value: string): string {
  return value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
}

export function hexToDecimal(hex: string): number {
  return parseInt(hex, 16);
}

export function decimalToHex(decimal: number): string {
  return decimal.toString(16).toUpperCase();
}

export function validateHexInput(input: string, maxLength: number): boolean {
  const hexRegex = /^[0-9A-Fa-f]*$/;
  return hexRegex.test(input) && input.length <= maxLength;
}

export function isSecureContext(): boolean {
  return location.protocol === 'https:' || 
         location.hostname === 'localhost' || 
         location.hostname === '127.0.0.1';
}

export function hasWebSerialSupport(): boolean {
  return 'serial' in navigator;
}

export function hasWebUSBSupport(): boolean {
  return 'usb' in navigator;
}

// Byte array to hex string conversion (BCTS from original)
export function BCTS(decArr: number[]): string[] {
  const hexArr: string[] = []
  if (decArr === undefined) return []
  for (let i = 0; i < decArr.length; i++) {
    hexArr.push(decArr[i].toString(16).toUpperCase().padStart(2, "0"))
  }
  return hexArr
}
