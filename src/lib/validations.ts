/**
 * Validation Schemas
 * 
 * Centralized Zod schemas for form validation across the application.
 * Provides consistent input validation with helpful error messages.
 */

import { z } from 'zod';

// ============================================
// Common Validators
// ============================================

/** Phone number validation (flexible international format) */
const phoneSchema = z
  .string()
  .trim()
  .min(8, 'Phone number must be at least 8 characters')
  .max(20, 'Phone number must be less than 20 characters')
  .regex(/^[+]?[\d\s()-]+$/, 'Please enter a valid phone number');

/** Email validation */
const emailSchema = z
  .string()
  .trim()
  .email('Please enter a valid email address')
  .max(255, 'Email must be less than 255 characters');

/** Name validation */
const nameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters');

/** Address validation */
const addressSchema = z
  .string()
  .trim()
  .min(5, 'Address must be at least 5 characters')
  .max(200, 'Address must be less than 200 characters');

/** City validation */
const citySchema = z
  .string()
  .trim()
  .min(2, 'City must be at least 2 characters')
  .max(100, 'City must be less than 100 characters');

/** Postal code validation (flexible) */
const postalCodeSchema = z
  .string()
  .trim()
  .max(20, 'Postal code must be less than 20 characters')
  .optional();

/** Special instructions validation */
const instructionsSchema = z
  .string()
  .trim()
  .max(1000, 'Instructions must be less than 1000 characters')
  .optional();

// ============================================
// SchedulePickup Form Schemas
// ============================================

/** Contact details for pickup scheduling */
export const contactDetailsSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  address: addressSchema,
  city: citySchema,
  postalCode: postalCodeSchema,
  specialInstructions: instructionsSchema,
});

export type ContactDetailsInput = z.infer<typeof contactDetailsSchema>;

/** Service selection validation */
export const serviceSelectionSchema = z.object({
  serviceId: z.string().uuid('Invalid service ID'),
  quantity: z
    .number()
    .min(1, 'Quantity must be at least 1 kg')
    .max(100, 'Quantity cannot exceed 100 kg'),
});

export type ServiceSelectionInput = z.infer<typeof serviceSelectionSchema>;

/** Complete pickup order validation */
export const pickupOrderSchema = z.object({
  services: z
    .array(serviceSelectionSchema)
    .min(1, 'Please select at least one service'),
  pickupDate: z.date().refine(
    (date) => date >= new Date(new Date().setHours(0, 0, 0, 0)),
    'Pickup date cannot be in the past'
  ),
  pickupTime: z
    .string()
    .min(1, 'Please select a pickup time'),
  contactDetails: contactDetailsSchema,
});

export type PickupOrderInput = z.infer<typeof pickupOrderSchema>;

// ============================================
// CreateRequestDialog Form Schema
// ============================================

/** Laundry types */
export const laundryTypeSchema = z.enum(['regular', 'delicate', 'heavy', 'mixed']);

/** Service types */
export const serviceTypeSchema = z.enum(['wash', 'wash-iron', 'iron-only', 'dry-clean']);

/** Create laundry request form */
export const createRequestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters'),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters'),
  laundryType: laundryTypeSchema,
  serviceType: serviceTypeSchema,
  weight: z
    .number()
    .min(0.5, 'Weight must be at least 0.5 kg')
    .max(50, 'Weight cannot exceed 50 kg'),
  pickupAddress: addressSchema,
  deliveryAddress: addressSchema.optional().or(z.literal('')),
  pickupDate: z.string().min(1, 'Please select a pickup date'),
  specialInstructions: instructionsSchema,
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;

// ============================================
// Authentication Schema
// ============================================

export const authSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(72, 'Password must be less than 72 characters'),
  name: nameSchema.optional(),
});

export type AuthInput = z.infer<typeof authSchema>;

// ============================================
// Payment Schema
// ============================================

export const paymentMethodSchema = z.enum(['card', 'bank_transfer']);

export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;

// ============================================
// Validation Helpers
// ============================================

/**
 * Validate data against a schema and return errors
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });
  
  return { success: false, errors };
}

/**
 * Get first error message from validation result
 */
export function getFirstError(
  errors: Record<string, string>
): string {
  const keys = Object.keys(errors);
  return keys.length > 0 ? errors[keys[0]] : 'Validation failed';
}
