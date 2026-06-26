import validator from 'validator';

/**
 * Input validation utilities for security
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate and sanitize user input for AI prompts
 * Prevents prompt injection attacks
 */
export function validatePromptInput(input: string, maxLength: number = 5000): ValidationResult {
  if (!input || typeof input !== 'string') {
    return { isValid: false, error: 'Input must be a non-empty string' };
  }

  if (input.length > maxLength) {
    return { isValid: false, error: `Input exceeds maximum length of ${maxLength}` };
  }

  // Check for potential prompt injection patterns
  const injectionPatterns = [
    /ignore[\s]+instructions/gi,
    /system[\s]+prompt/gi,
    /forget[\s]+(all|everything|previous)/gi,
    /execute[\s]+(code|command)/gi,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(input)) {
      return { isValid: false, error: 'Input contains potentially malicious patterns' };
    }
  }

  return { isValid: true };
}

/**
 * Sanitize string for safe inclusion in prompts
 */
export function sanitizePromptString(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/[\\`$"{}]/g, '\\$&') // Escape special characters
    .replace(/\n{2,}/g, '\n') // Remove excessive newlines
    .trim()
    .substring(0, 5000); // Enforce max length
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  const trimmed = email.trim().toLowerCase();

  if (trimmed.length > 255) {
    return { isValid: false, error: 'Email is too long' };
  }

  if (!validator.isEmail(trimmed)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  return { isValid: true };
}

/**
 * Validate title/name fields
 */
export function validateTitle(title: string, maxLength: number = 200): ValidationResult {
  if (!title || typeof title !== 'string') {
    return { isValid: false, error: 'Title is required' };
  }

  const trimmed = title.trim();

  if (trimmed.length === 0) {
    return { isValid: false, error: 'Title cannot be empty' };
  }

  if (trimmed.length > maxLength) {
    return { isValid: false, error: `Title exceeds maximum length of ${maxLength}` };
  }

  // Prevent HTML/script injection
  if (validator.contains(trimmed, '<') || validator.contains(trimmed, '>')) {
    return { isValid: false, error: 'Title contains invalid characters' };
  }

  return { isValid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long' };
  }

  // Require mix of character types
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain uppercase letters' };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain lowercase letters' };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain numbers' };
  }

  return { isValid: true };
}

/**
 * Validate invite code format
 */
export function validateInviteCode(code: string): ValidationResult {
  if (!code || typeof code !== 'string') {
    return { isValid: false, error: 'Invite code is required' };
  }

  const trimmed = code.trim().toUpperCase();

  if (trimmed.length > 50) {
    return { isValid: false, error: 'Invite code is too long' };
  }

  // Allow alphanumeric, hyphens, and @ for email
  if (!/^[A-Z0-9\-@.]+$/.test(trimmed)) {
    return { isValid: false, error: 'Invite code contains invalid characters' };
  }

  return { isValid: true };
}

/**
 * Sanitize user name for display
 */
export function sanitizeName(name: string): string {
  if (!name) return 'Unknown';
  
  return name
    .trim()
    .substring(0, 100)
    .replace(/[<>"/]/g, '') // Remove HTML-like characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Validate JSON object for size (prevent large payload attacks)
 */
export function validateRequestSize(data: unknown, maxSizeKB: number = 100): ValidationResult {
  try {
    const size = JSON.stringify(data).length / 1024;
    if (size > maxSizeKB) {
      return { isValid: false, error: `Request payload exceeds ${maxSizeKB}KB limit` };
    }
    return { isValid: true };
  } catch (e) {
    return { isValid: false, error: 'Invalid request data' };
  }
}
