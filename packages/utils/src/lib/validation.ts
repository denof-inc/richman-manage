import { z } from 'zod';

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().optional(),
});

export const propertySchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  propertyType: z.string().min(1),
  yearBuilt: z.number().optional(),
  totalArea: z.number().optional(),
  purchaseDate: z.date().optional(),
  purchasePrice: z.number().optional(),
  currentValue: z.number().optional(),
});

export const unitSchema = z.object({
  id: z.string().uuid(),
  propertyId: z.string().uuid(),
  unitNumber: z.string().min(1),
  unitType: z.enum(['residence', 'tenant', 'parking', 'vending', 'solar']),
  status: z.enum(['occupied', 'vacant']),
  area: z.number().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  rentAmount: z.number().optional(),
  depositAmount: z.number().optional(),
  currentTenantName: z.string().optional(),
  leaseStartDate: z.date().optional(),
  leaseEndDate: z.date().optional(),
});

export const loanSchema = z.object({
  id: z.string().uuid(),
  propertyId: z.string().uuid(),
  lenderName: z.string().min(1),
  loanAmount: z.number().positive(),
  interestRate: z.number().positive(),
  termYears: z.number().positive(),
  startDate: z.date(),
  endDate: z.date(),
  repaymentMethod: z.enum(['principal_equal', 'annuity']),
  paymentFrequency: z.string().min(1),
  paymentAmount: z.number().positive(),
  remainingBalance: z.number().positive(),
});

export type UserData = z.infer<typeof userSchema>;
export type Property = z.infer<typeof propertySchema>;
export type Unit = z.infer<typeof unitSchema>;
export type Loan = z.infer<typeof loanSchema>;
