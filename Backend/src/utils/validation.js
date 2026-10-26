import { z } from 'zod';
import { AREAS } from '../config/areas.js';

export const idSchema = z.string().trim().min(1).max(100);

export const emailSchema = z.string().trim().email().max(160).transform((v) => v.toLowerCase());

export const phoneSchema = z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number.');

export const areaSchema = z.enum(AREAS, { error: 'Select a valid area.' });

/* High-security password: 10-64 characters with upper + lower case, a number and a symbol, no spaces,
   not a common password. Mirrors F11/src/shared/validate.js. Login does NOT use this, so older accounts can still sign in. */
const COMMON_PASSWORDS = ['password', 'passw0rd', 'qwerty', 'letmein', 'welcome', 'admin', 'iloveyou', 'abc123', '123456', '111111', '000000', 'monkey', 'dragon', 'civicconnect'];

export const passwordSchema = z.string()
  .min(10, 'Password must be at least 10 characters.')
  .max(64, 'Password can be at most 64 characters.')
  .refine((v) => /[A-Z]/.test(v), 'Password needs an uppercase letter.')
  .refine((v) => /[a-z]/.test(v), 'Password needs a lowercase letter.')
  .refine((v) => /\d/.test(v), 'Password needs a number.')
  .refine((v) => /[^A-Za-z0-9\s]/.test(v), 'Password needs a symbol (for example @ # $ !).')
  .refine((v) => !/\s/.test(v), 'Password cannot contain spaces.')
  .refine((v) => !/(.)\1{3,}/.test(v), 'Avoid repeating the same character many times.')
  .refine((v) => !COMMON_PASSWORDS.some((c) => v.toLowerCase().includes(c)), 'That password is too easy to guess.');

export const usernameSchema = z.string().trim()
  .min(4, 'Username must be at least 4 characters.')
  .max(20, 'Username can be at most 20 characters.')
  .regex(/^[A-Za-z][A-Za-z0-9._-]*$/, 'Username must start with a letter and use only letters, numbers, . _ -')
  .refine((v) => !/[._-]{2}/.test(v) && !/[._-]$/.test(v), 'Username cannot have repeated or trailing . _ - characters.');

export const nameSchema = z.string().trim().min(2, 'Enter a valid name.').max(60, 'Name can be at most 60 characters.')
  .regex(/^[\p{L}][\p{L}\p{M}\s.'-]*$/u, 'Name can contain only letters, spaces and . \' -');

export const employeeIdSchema = z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9/_-]{2,19}$/, 'Employee ID must be 3-20 letters, numbers, - _ /');

export const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(160), password: z.string().min(1).max(128), role: z.enum(['citizen', 'authority', 'worker']).optional()
});

// The email is required: it is the only way to send a password-reset link, so an account without one could never recover itself.
export const citizenRegisterSchema = z.object({
  name: nameSchema, mobile: phoneSchema.optional(), email: emailSchema, password: passwordSchema
});

export const workerRegisterSchema = z.object({
  name: nameSchema, username: usernameSchema, email: emailSchema, phone: phoneSchema, area: areaSchema, password: passwordSchema
});

export const authorityRegisterSchema = z.object({
  inviteCode: z.string().trim().max(100).optional(), name: nameSchema, employeeId: employeeIdSchema, email: emailSchema, phone: phoneSchema.optional(), area: areaSchema, password: passwordSchema
});

export const deleteAccountSchema = z.object({ password: z.string().min(1), reason: z.string().max(500).optional() });

export const complaintSchema = z.object({
  category: z.enum(['road', 'light', 'garbage', 'water', 'other']),
  description: z.string().trim().min(10).max(2000),
  location: z.string().trim().min(2).max(300),
  area: areaSchema.optional(),
  // Village / town / city name from the geocoder (optional, shown to the authority).
  place: z.string().trim().max(120).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  // Result of the photo check that ran on the citizen's phone (TensorFlow.js). "mismatch" is refused.
  aiVerdict: z.enum(['match', 'uncertain', 'mismatch', 'unchecked']).optional(),
  aiLabel: z.string().trim().max(80).optional(),
  // The photo AI's severity estimate (0-100). It is advice for the authority, never a decision: the officer sets the priority.
  aiSeverity: z.coerce.number().int().min(0).max(100).optional(),
  // The citizen flags a danger to life / safety. Multipart forms send it as the text "true".
  isEmergency: z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')]).optional(),
  emergencyReason: z.string().trim().max(200).optional(),
}).refine((v) => (v.lat == null) === (v.lng == null), { message: 'Send both latitude and longitude, or neither.', path: ['lat'] });

export const assignSchema = z.object({
  workerId: z.string().trim().min(1), priority: z.enum(['Low', 'Medium', 'High']).optional(), note: z.string().trim().max(1000).optional()
});

export const profileSchema = z.object({
  name: nameSchema.optional(), email: emailSchema.optional(), phone: phoneSchema.optional(), area: areaSchema.optional()
}).refine((v) => Object.keys(v).length > 0, 'At least one field is required.');

export const changeEmailSchema = z.object({ newEmail: emailSchema, currentPassword: z.string().min(1).max(128) });

export const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema });

export const dismissEmergencySchema = z.object({ reason: z.string().trim().min(5, 'Give a short reason (at least 5 characters).').max(300) });
export const rejectSchema = z.object({ reason: z.string().trim().min(5, 'Give a short reason (at least 5 characters).').max(500) });

export const reopenSchema = z.object({ reason: z.string().trim().min(5, 'Tell us what is still wrong (at least 5 characters).').max(500) });

export const feedbackSchema = z.object({ rating: z.coerce.number().int().min(1).max(5), comment: z.string().trim().max(500).optional() });

export const photoCaptionSchema = z.object({ caption: z.string().trim().max(80).optional() });

export const roleSchema = z.enum(['citizen', 'authority', 'worker']);

export const forgotPasswordSchema = z.object({
  role: roleSchema,
  identifier: z.string().trim().max(160).optional(),
  employeeId: z.string().trim().max(50).optional(),
  email: z.string().trim().max(160).optional(),
});

export const resetPasswordSchema = z.object({
  role: roleSchema, token: z.string().trim().min(1).max(200), newPassword: passwordSchema
});
