/**
 * Philippine mobile number helpers.
 *
 * The whole app standardises on the local 11-digit format `09XXXXXXXXX`
 * (starts with `09`, followed by 9 more digits). Keep every phone <Input> in
 * sync by routing its onChange through `formatPhoneInput` and using the shared
 * placeholder / pattern constants so the UX is identical everywhere.
 */

/** Maximum length of a valid PH mobile number in 09XXXXXXXXX form. */
export const PHONE_MAX_LENGTH = 11;

/** Placeholder shown in every phone field. */
export const PHONE_PLACEHOLDER = '09XXXXXXXXX';

/** HTML `pattern` attribute value — native backstop validation for forms. */
export const PHONE_PATTERN = '09[0-9]{9}';

/** Human-readable rule, reused in helper/error text. */
export const PHONE_HINT = 'Use the 09XXXXXXXXX format (11 digits).';

/**
 * Sanitise raw input into the 09XXXXXXXXX shape: strip everything that is not a
 * digit and clamp to 11 characters. Pasting `+63 917 123 4567` or
 * `0917-123-4567` collapses to digits and is trimmed to 11 chars.
 */
export function formatPhoneInput(value: string): string {
    return value.replace(/\D/g, '').slice(0, PHONE_MAX_LENGTH);
}

/** True when the value is a complete, valid `09XXXXXXXXX` number. */
export function isValidPhone(value: string): boolean {
    return /^09\d{9}$/.test(value);
}
