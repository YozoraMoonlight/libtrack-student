import { Check, X } from 'lucide-react';

interface PasswordChecklistProps {
    value: string;
    className?: string;
    /**
     * 'strong'  — mirrors PasswordRules::strong() (self-service signup).
     * 'student' — mirrors PasswordRules::studentSet(), the relaxed rules for
     *             accounts an admin creates, whose default password is
     *             "Surname + birth year" (no symbol, and as short as six
     *             characters for surnames like Sy or Uy).
     */
    variant?: 'strong' | 'student';
}

/**
 * Live checklist of password requirements that matches the server-side
 * `App\Support\PasswordRules` rule set for the given variant. Renders a green
 * check next to each rule the current value satisfies; red X otherwise.
 */
export function PasswordChecklist({ value, className = '', variant = 'strong' }: PasswordChecklistProps) {
    const rules = variant === 'student'
        ? [
              { label: 'At least 6 characters', ok: value.length >= 6 },
              { label: 'At least one letter', ok: /[A-Za-z]/.test(value) },
              { label: 'At least one number (0–9)', ok: /\d/.test(value) },
              { label: 'No spaces', ok: value.length > 0 && !/\s/.test(value) },
          ]
        : [
              { label: 'At least 8 characters', ok: value.length >= 8 },
              { label: 'One uppercase letter (A–Z)', ok: /[A-Z]/.test(value) },
              { label: 'One lowercase letter (a–z)', ok: /[a-z]/.test(value) },
              { label: 'One number (0–9)', ok: /\d/.test(value) },
              { label: 'One special character', ok: /[^A-Za-z0-9\s]/.test(value) },
              { label: 'No spaces', ok: value.length > 0 && !/\s/.test(value) },
          ];

    if (!value) return null;

    return (
        <ul className={`mt-2 space-y-1 text-xs ${className}`}>
            {rules.map((r) => (
                <li key={r.label} className={`flex items-center gap-1.5 ${r.ok ? 'text-emerald-700' : 'text-stone-500'}`}>
                    {r.ok ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                        <X className="h-3 w-3 text-stone-400" />
                    )}
                    {r.label}
                </li>
            ))}
        </ul>
    );
}
