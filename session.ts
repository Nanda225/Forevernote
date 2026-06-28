import crypto from 'crypto';

/**
 * Secure session management utilities
 * Prevents session tampering via HMAC signatures
 */

const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-insecure-secret';

export interface SecureSession {
  uid: string;
  displayName: string;
  email: string;
  signature: string;
  timestamp: number;
}

/**
 * Generate HMAC signature for session data
 */
export function generateSessionSignature(sessionData: Omit<SecureSession, 'signature' | 'timestamp'>): string {
  const data = JSON.stringify({
    uid: sessionData.uid,
    displayName: sessionData.displayName,
    email: sessionData.email,
  });

  return crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('hex');
}

/**
 * Create a secure session token
 */
export function createSecureSession(uid: string, displayName: string, email: string): SecureSession {
  const sessionData = { uid, displayName, email };
  const signature = generateSessionSignature(sessionData);

  return {
    ...sessionData,
    signature,
    timestamp: Date.now(),
  };
}

/**
 * Validate session integrity
 * Returns true only if signature is valid and session is recent
 */
export function validateSessionIntegrity(session: unknown, maxAgeMs: number = 24 * 60 * 60 * 1000): boolean {
  if (!session || typeof session !== 'object') {
    return false;
  }

  const sess = session as any;

  // Check required fields
  if (!sess.uid || !sess.displayName || !sess.email || !sess.signature || !sess.timestamp) {
    return false;
  }

  // Check session age
  const age = Date.now() - sess.timestamp;
  if (age > maxAgeMs) {
    console.warn(`Session expired: ${age}ms old (max: ${maxAgeMs}ms)`);
    return false;
  }

  // Verify signature safely
  const expectedSignature = generateSessionSignature({
    uid: sess.uid,
    displayName: sess.displayName,
    email: sess.email,
  });

  try {
    const a = Buffer.from(sess.signature, 'hex');
    const b = Buffer.from(expectedSignature, 'hex');

    if (a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(a, b);
  } catch (error) {
    return false;
  }
}

/**
 * Refresh session timestamp (called on user activity)
 */
export function refreshSessionTimestamp(session: SecureSession): SecureSession {
  return {
    ...session,
    timestamp: Date.now(),
  };
}
