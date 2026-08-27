/**
 * Hashes a password deterministically using Web Crypto PBKDF2-SHA256.
 * Salt is derived deterministically from the normalized email.
 * 
 * @param {string} password - The raw user password
 * @param {string} email - The user's normalized email (used as deterministic salt)
 * @returns {Promise<string>} 64-character hex string (safe for backend bcrypt)
 */
export async function hashPasswordClient(password, email) {
  if (!password || !email) throw new Error("Password and email are required for hashing.");

  const encoder = new TextEncoder();
  const normalizedEmail = email.trim().toLowerCase();
  
  // App-specific salt prefix to prevent generic rainbow table attacks
  const salt = encoder.encode(`mentorship_salt_${normalizedEmail}`);

  // Import password as raw key material
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  // 100,000 rounds of PBKDF2 with SHA-256 (32 bytes = 256 bits)
  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  // Convert ArrayBuffer to 64-character Hex string
  return Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}