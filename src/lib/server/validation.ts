import { z } from 'zod';

const optionalText = (schema: z.ZodString) =>
  z
    .string()
    .transform((value) => value.trim())
    .transform((value) => (value.length === 0 ? undefined : value))
    .pipe(schema.optional());

const nullableUpdateText = (schema: z.ZodString) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    })
    .pipe(schema.nullable().optional());

const strictUpdateText = (schema: z.ZodString) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    })
    .pipe(schema.optional());

export const eventSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters'),
  date: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Enter a valid date' }),
  location: optionalText(z.string().max(120)),
  description: optionalText(z.string().max(600))
});

export const slotSchema = z.object({
  label: z.string().trim().min(2, 'Provide a short label'),
  description: optionalText(z.string().max(300)),
  quantity: z
    .string()
    .trim()
    .refine((value) => /^\d+$/.test(value), { message: 'Quantity must be a positive number' })
    .transform((value) => Number.parseInt(value, 10))
    .refine((value) => value > 0 && value <= 1000, { message: 'Quantity must be between 1 and 1000' })
});

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  email: optionalText(z.string().email('Enter a valid email').max(160)),
  pin: z.string().regex(/^[0-9]{4,6}$/, 'PIN must be 4-6 digits'),
  slotId: z.string().cuid()
});

export const signupUpdateSchema = z
  .object({
    signupId: z.string().cuid(),
    pin: z.string().regex(/^[0-9]{4,6}$/, 'PIN must be 4-6 digits'),
    name: strictUpdateText(z.string().min(2)),
    email: nullableUpdateText(z.string().email('Enter a valid email').max(160)),
    slotId: z.string().cuid().optional()
  })
  .refine((data) => data.name !== undefined || data.email !== undefined || data.slotId, {
    message: 'Provide an update to apply',
    path: ['name']
  });

export const lookupSchema = z.object({
  signupId: z.string().cuid(),
  pin: z.string().regex(/^[0-9]{4,6}$/, 'PIN must be 4-6 digits')
});
