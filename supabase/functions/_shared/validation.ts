// Shared validation utilities for edge functions

export function sanitizeForPrompt(text: string, maxLength: number): string {
  return text
    .replace(/[\n\r]+/g, ' ')           // Remove newlines (prevent prompt breaks)
    .replace(/["'`\\]/g, '')            // Remove quotes and escapes
    .replace(/\s+/g, ' ')               // Normalize whitespace
    .replace(/[<>]/g, '')               // Remove HTML-like chars
    .trim()
    .slice(0, maxLength);                // Enforce hard limit
}

export function detectPromptInjection(text: string): boolean {
  const suspiciousPatterns = [
    /ignore.{0,20}(previous|above|prior).{0,20}(instructions|prompt|system)/i,
    /you are (now|a|an).{0,50}(chatbot|ai|assistant)/i,
    /(system|admin|root).{0,20}(override|mode|access)/i,
    /reveal.{0,20}(prompt|system|instructions|training)/i,
    /pretend.{0,20}(you.{0,10}are|to be)/i,
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(text));
}

export function validateTextInput(text: string, minLength: number, maxLength: number, fieldName: string): { valid: boolean; error?: string } {
  if (!text || text.trim().length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }
  
  if (text.length > maxLength) {
    return { valid: false, error: `${fieldName} must be less than ${maxLength} characters` };
  }
  
  // Check for basic allowed characters (letters, numbers, common punctuation)
  const allowedPattern = /^[a-zA-Z0-9\s,.'\-!?()]+$/;
  if (!allowedPattern.test(text)) {
    return { valid: false, error: `${fieldName} contains invalid characters` };
  }
  
  if (detectPromptInjection(text)) {
    return { valid: false, error: 'Invalid input detected' };
  }
  
  return { valid: true };
}

// Simple in-memory rate limiter
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(userId: string, maxRequests: number, windowMs: number): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = `${userId}`;
  const record = rateLimitStore.get(key);
  
  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
  }
  
  if (!record || record.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
  }
  
  record.count++;
  return { allowed: true };
}
