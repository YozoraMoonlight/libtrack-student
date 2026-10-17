export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidLrn(value: string): boolean {
  return /^\d{12}$/.test(value.trim());
}

export function isValidMobile(value: string): boolean {
  return /^09\d{9}$/.test(value.trim());
}

export const passwordRules: Array<{label: string;test: (value: string) => boolean;}> = [
{ label: '8+ characters', test: (v) => v.length >= 8 },
{ label: 'Uppercase letter', test: (v) => /[A-Z]/.test(v) },
{ label: 'Lowercase letter', test: (v) => /[a-z]/.test(v) },
{ label: 'Number', test: (v) => /\d/.test(v) },
{ label: 'Special character', test: (v) => /[^A-Za-z0-9\s]/.test(v) },
{ label: 'No spaces', test: (v) => v.length > 0 && !/\s/.test(v) }];


export function meetsPasswordRules(value: string): boolean {
  return passwordRules.every((rule) => rule.test(value));
}

export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

export function getPasswordStrength(value: string): PasswordStrength {
  if (value.length === 0) return 0;
  if (value.length < 8) return 1;

  let score = 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;

  return Math.min(score, 4) as PasswordStrength;
}

export const passwordStrengthLabel: Record<PasswordStrength, string> = {
  0: 'Too short',
  1: 'Weak',
  2: 'Fair',
  3: 'Good',
  4: 'Strong'
};