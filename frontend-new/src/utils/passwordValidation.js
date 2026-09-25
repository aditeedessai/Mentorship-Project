/**
 * Password strength validation utility.
 *
 * Validates the raw password locally before it is hashed by hashPasswordClient().
 * The raw password is never logged, stored, or transmitted by this module.
 */

// Common weak passwords (compared case-insensitively)
const COMMON_PASSWORDS = [
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty",
  "qwerty123",
  "admin",
  "admin123",
  "welcome",
  "letmein",
  "abc123",
  "monkey",
  "master",
  "iloveyou",
  "trustno1",
  "sunshine",
  "princess",
  "football",
  "shadow",
  "superman",
  "dragon",
  "michael",
  "login",
  "welcome1",
  "passw0rd",
];

/**
 * Returns true if the password consists primarily of a single repeated character
 * (e.g. "aaaaaaaa", "11111111").
 */
function isRepeatedCharacter(pwd) {
  if (pwd.length === 0) return false;
  const first = pwd[0];
  return pwd.split("").every((ch) => ch === first);
}

/**
 * Returns true if the password is a simple ascending or descending sequential
 * run of characters (e.g. "12345678", "abcdefgh", "87654321").
 */
function isSequentialRun(pwd) {
  if (pwd.length < 4) return false;

  let allAscending = true;
  let allDescending = true;

  for (let i = 1; i < pwd.length; i++) {
    const diff = pwd.charCodeAt(i) - pwd.charCodeAt(i - 1);
    if (diff !== 1) allAscending = false;
    if (diff !== -1) allDescending = false;
    if (!allAscending && !allDescending) return false;
  }

  return allAscending || allDescending;
}

/**
 * Validates password strength.
 *
 * @param {string} password - The raw password to validate (never logged or stored).
 * @returns {{ isValid: boolean, errors: string[], requirements: { minLength: boolean, uppercase: boolean, lowercase: boolean, number: boolean, specialChar: boolean, notCommon: boolean } }}
 */
export function validatePasswordStrength(password) {
  const requirements = {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    // Special character: any printable non-alphanumeric character
    specialChar: /[^A-Za-z0-9]/.test(password),
    notCommon: true,
  };

  // Check against common passwords (case-insensitive)
  const lowerPwd = password.toLowerCase();
  if (COMMON_PASSWORDS.includes(lowerPwd)) {
    requirements.notCommon = false;
  }

  // Check for trivially repeated or sequential patterns
  if (isRepeatedCharacter(password) || isSequentialRun(password)) {
    requirements.notCommon = false;
  }

  const errors = [];

  if (!requirements.minLength) {
    errors.push("At least 8 characters");
  }
  if (!requirements.uppercase) {
    errors.push("At least one uppercase letter (A-Z)");
  }
  if (!requirements.lowercase) {
    errors.push("At least one lowercase letter (a-z)");
  }
  if (!requirements.number) {
    errors.push("At least one number (0-9)");
  }
  if (!requirements.specialChar) {
    errors.push("At least one special character (e.g. !@#$%^&*)");
  }
  if (!requirements.notCommon) {
    errors.push("Password is too common or easily guessable");
  }

  return {
    isValid: errors.length === 0,
    errors,
    requirements,
  };
}
