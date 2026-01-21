/**
 * Image utility functions for document capture
 */

export function validateImageSize(base64: string, maxSizeMB: number = 5): boolean {
  // Calculate size from base64
  const base64Length = base64.replace(/^data:image\/\w+;base64,/, '').length;
  const sizeInBytes = (base64Length * 3) / 4;
  const sizeInMB = sizeInBytes / (1024 * 1024);
  return sizeInMB <= maxSizeMB;
}

export function getImageSizeMB(base64: string): number {
  const base64Length = base64.replace(/^data:image\/\w+;base64,/, '').length;
  const sizeInBytes = (base64Length * 3) / 4;
  return sizeInBytes / (1024 * 1024);
}

export function validateAadharNumber(aadhar: string): boolean {
  // Remove spaces and dashes
  const cleaned = aadhar.replace(/[\s-]/g, '');
  return /^\d{12}$/.test(cleaned);
}

export function validatePANNumber(pan: string): boolean {
  // Format: ABCDE1234F (5 letters, 4 digits, 1 letter)
  return /^[A-Z]{5}\d{4}[A-Z]$/.test(pan.toUpperCase());
}

export function formatAadhar(aadhar: string): string {
  // Format as XXXX-XXXX-XXXX
  const cleaned = aadhar.replace(/[\s-]/g, '');
  if (cleaned.length === 12) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}`;
  }
  return aadhar;
}

export function formatPAN(pan: string): string {
  return pan.toUpperCase();
}
