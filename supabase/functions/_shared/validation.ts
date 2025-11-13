// Shared validation utilities for edge functions

export function sanitizeForPrompt(text: string, maxLength: number): string {
  return text
    .replace(/[\n\r]+/g, ' ')           // Remove newlines (prevent prompt breaks)
    .replace(/\s+/g, ' ')               // Normalize whitespace
    .trim()
    .slice(0, maxLength);                // Enforce hard limit
}

export function detectPromptInjection(text: string): boolean {
  // Very basic check - just block obvious injection attempts
  const suspiciousPatterns = [
    /ignore.*previous.*instructions/i,
    /system.*override/i,
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(text));
}

export function validateTextInput(text: string, minLength: number, maxLength: number, fieldName: string): { valid: boolean; error?: string } {
  // Simplified validation - just check length and obvious bad stuff
  if (text && text.trim().length < minLength) {
    return { valid: false, error: `${fieldName} is too short` };
  }
  
  if (text && text.length > maxLength) {
    return { valid: false, error: `${fieldName} is too long` };
  }
  
  // Only block obvious prompt injection
  if (text && detectPromptInjection(text)) {
    return { valid: false, error: 'Invalid input' };
  }
  
  return { valid: true };
}

// Simple in-memory rate limiter
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(userId: string, maxRequests: number, windowMs: number): { allowed: boolean; retryAfter?: number } {
  // Simplified - much more permissive
  const now = Date.now();
  const key = `${userId}`;
  const record = rateLimitStore.get(key);
  
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
