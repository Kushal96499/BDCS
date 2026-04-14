// ============================================
// BDCS - User Schemas (Zod)
// Validation schemas for user-facing forms
// ============================================

import { z } from 'zod';

// ─── Profile Update ──────────────────────────────────────────────
export const profileUpdateSchema = z.object({
    phoneNumber: z
        .string()
        .regex(/^[+\d\s\-()]{7,15}$/, 'Enter a valid phone number (7–15 digits)')
        .or(z.literal(''))
        .optional(),
    bio: z
        .string()
        .max(500, 'Bio must be under 500 characters')
        .optional(),
});

export const passwordResetSchema = z
    .object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z.string().min(8, 'New password must be at least 8 characters'),
        confirmPassword: z.string().min(1, 'Please confirm your new password'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword'],
    });

// ─── Student Registration ─────────────────────────────────────────
export const studentFormSchema = z.object({
    name: z.string().min(2, 'Full name is required (min 2 chars)').max(80),
    fatherName: z.string().min(2, "Father's name is required").max(80),
    motherName: z.string().min(2, "Mother's name is required").max(80),
    rollNumber: z.string().min(1, 'Roll number is required'),
    lastExamRollNo: z.string().optional(),
    email: z.string().email('Enter a valid email address'),
    phone: z
        .string()
        .regex(/^\d{10}$/, 'Phone must be 10 digits')
        .or(z.literal(''))
        .optional(),
    parentPhone: z
        .string()
        .regex(/^\d{10}$/, 'Parent phone must be 10 digits')
        .or(z.literal(''))
        .optional(),
});

// ─── Teacher / User Creation ──────────────────────────────────────
export const teacherFormSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    email: z.string().email('Enter a valid email address'),
    phone: z
        .string()
        .min(10, 'Phone must be at least 10 digits')
        .max(15),
    employeeId: z.string().min(1, 'Employee ID is required').max(30),
    joiningDate: z.string().min(1, 'Joining date is required'),
    designation: z.string().max(100).optional(),
    address: z.string().max(200).optional(),
    status: z.enum(['active', 'inactive']).default('active'),
});
