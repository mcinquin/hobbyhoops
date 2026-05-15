import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  type ScryptOptions,
} from "crypto";

const SCRYPT_KEYLEN = 64;

/** Paramètres scrypt explicites (alignés sur les défauts Node pour compatibilité des hash existants). */
export const SCRYPT_OPTIONS: ScryptOptions = {
  N: 16384,
  r: 8,
  p: 1,
};

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS);
  return `${salt}:${hash.toString("hex")}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [salt, hex] = parts;
  try {
    const hashBuf = Buffer.from(hex, "hex");
    const testBuf = scryptSync(plain, salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS);
    if (hashBuf.length !== testBuf.length) return false;
    return timingSafeEqual(hashBuf, testBuf);
  } catch {
    return false;
  }
}
