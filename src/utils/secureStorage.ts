/**
 * Secure Storage Utility
 * Encrypts and decrypts localStorage contents using a multi-byte XOR cipher and Base64 encoding.
 * This prevents plaintext storage of sensitive user relationship milestones, messages, and virtual session information.
 */

const SECRET_SALT = "fn_forevernote_secure_salt_2026_v99x!";

// Safely encrypts a string
export function encrypt(text: string): string {
  if (!text) return "";
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const keyChar = SECRET_SALT.charCodeAt(i % SECRET_SALT.length);
    // Scramble the character code using XOR and key character
    const scrambled = charCode ^ keyChar;
    result += String.fromCharCode(scrambled);
  }
  // Convert to Base64 safely (using btoa and URL encoding for Unicode safety)
  return btoa(encodeURIComponent(result));
}

// Safely decrypts an encrypted string
export function decrypt(cipherText: string): string {
  if (!cipherText) return "";
  try {
    const raw = decodeURIComponent(atob(cipherText));
    let result = "";
    for (let i = 0; i < raw.length; i++) {
      const charCode = raw.charCodeAt(i);
      const keyChar = SECRET_SALT.charCodeAt(i % SECRET_SALT.length);
      const unscrambled = charCode ^ keyChar;
      result += String.fromCharCode(unscrambled);
    }
    return result;
  } catch (error) {
    console.error("Failed to decrypt secure storage item:", error);
    return "";
  }
}

export const secureStorage = {
  // Set an item in localStorage, automatically encrypting it
  setItem: (key: string, value: any): void => {
    try {
      const strValue = typeof value === "string" ? value : JSON.stringify(value);
      const encrypted = encrypt(strValue);
      localStorage.setItem(key, `__enc__:${encrypted}`);
    } catch (e) {
      console.error("Error setting secure storage item:", e);
    }
  },

  // Get an item from localStorage, automatically decrypting if encrypted
  getItem: (key: string): string | null => {
    try {
      const value = localStorage.getItem(key);
      if (!value) return null;
      if (value.startsWith("__enc__:")) {
        const encrypted = value.substring(8);
        return decrypt(encrypted);
      }
      // Fallback to unencrypted for raw legacy values
      return value;
    } catch (e) {
      console.error("Error getting secure storage item:", e);
      return null;
    }
  },

  // Get and parse a JSON object from secure storage
  getJSON: <T = any>(key: string): T | null => {
    const val = secureStorage.getItem(key);
    if (!val) return null;
    try {
      return JSON.parse(val) as T;
    } catch {
      return null;
    }
  },

  // Remove an item from localStorage
  removeItem: (key: string): void => {
    localStorage.removeItem(key);
  }
};
