import crypto from 'crypto';
import { logger } from './logger.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a consistent 32-byte Buffer key from the environment secret
 */
function getKey() {
  const envKey = process.env.TOKEN_ENCRYPTION_KEY || 'default_insecure_key_for_dev_mode_only_32_bytes!';
  // If provided as a 64-char hex string, decode it; otherwise hash with sha256 to guarantee 32 bytes
  if (/^[0-9a-fA-F]{64}$/.test(envKey)) {
    return Buffer.from(envKey, 'hex');
  }
  return crypto.createHash('sha256').update(envKey).digest();
}

/**
 * Encrypts sensitive text using AES-256-GCM
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Combined string of IV:AuthTag:EncryptedContent in hex
 */
export function encryptToken(text) {
  if (!text) return null;
  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    logger.error('Failed to encrypt token', err.message);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypts text previously encrypted with encryptToken
 * @param {string} encryptedString - Format IV:AuthTag:EncryptedContent in hex
 * @returns {string} - Decrypted plain text
 */
export function decryptToken(encryptedString) {
  if (!encryptedString) return null;
  try {
    const parts = encryptedString.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format');
    }
    
    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    logger.error('Failed to decrypt token', err.message);
    throw new Error('Decryption failed');
  }
}
