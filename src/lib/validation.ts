import { z } from 'zod';

export const appointmentSchema = z.object({
  doctorName: z.string().trim().min(1, 'Doctor name is required').max(100, 'Doctor name must be less than 100 characters'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  reason: z.string().trim().min(1, 'Reason is required').max(500, 'Reason must be less than 500 characters'),
  goal: z.string().trim().max(500, 'Goal must be less than 500 characters').optional(),
  symptoms: z.string().trim().max(1000, 'Symptoms must be less than 1000 characters').optional(),
});

export const emailSchema = z.string().trim().email('Invalid email address').max(255, 'Email must be less than 255 characters');

export const shareVisitSchema = z.object({
  recipientEmails: z.array(emailSchema).min(1, 'At least one recipient email is required'),
  message: z.string().trim().max(1000, 'Message must be less than 1000 characters').optional(),
});

export type AppointmentFormData = z.infer<typeof appointmentSchema>;
export type ShareVisitFormData = z.infer<typeof shareVisitSchema>;