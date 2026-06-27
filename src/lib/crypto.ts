import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

// Server-only. Encrypts a user's BYO API key at rest with AES-256-GCM.
// The key is derived from SETTINGS_ENCRYPTION_KEY via scrypt, so the env var
// can be any sufficiently random string (not a fixed-length raw key).
//
// Storage format: "v1:" + base64(iv[12] | authTag[16] | ciphertext).

const SALT = "fintra.byo.key.v1";

function derivedKey(): Buffer {
  const secret = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "SETTINGS_ENCRYPTION_KEY is not set — required to store a BYO API key"
    );
  }
  return scryptSync(secret, SALT, 32);
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", derivedKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${Buffer.concat([iv, tag, ct]).toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  if (!payload.startsWith("v1:")) {
    throw new Error("Unknown cipher format");
  }
  const raw = Buffer.from(payload.slice(3), "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ct = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", derivedKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
