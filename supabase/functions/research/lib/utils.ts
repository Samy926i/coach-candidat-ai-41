/**
 * Utility functions for URL validation and sanitization
 */

export function validateUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Only allow HTTP and HTTPS protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }
    
    // Prevent SSRF attacks - no localhost, private IPs, etc.
    const hostname = parsedUrl.hostname.toLowerCase();
    
    // Block localhost and private IP ranges
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
      hostname.startsWith('169.254.') ||
      hostname.startsWith('::1') ||
      hostname.startsWith('fc00:') ||
      hostname.startsWith('fd00:')
    ) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

export function sanitizeUrl(url: string): string {
  // Normalize Unicode characters
  const normalized = url.normalize ? url.normalize('NFC') : url;
  
  // Trim whitespace
  return normalized.trim();
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function getRandomDelay(min: number = 300, max: number = 700): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}