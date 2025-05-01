import { z } from 'zod';

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上である必要があります'),
});

export const propertySchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  name: z.string().min(1, '物件名は必須です'),
  address: z.string().min(1, '住所は必須です'),
  city: z.string().min(1, '市区町村は必須です'),
  state: z.string().min(1, '都道府県は必須です'),
  postalCode: z.string().min(1, '郵便番号は必須です'),
  country: z.string().min(1, '国名は必須です'),
  propertyType: z.string().min(1, '物件タイプは必須です'),
  yearBuilt: z.number().optional(),
  totalArea: z.number().optional(),
  purchaseDate: z.date().optional(),
  purchasePrice: z.number().optional(),
  currentValue: z.number().optional(),
});

export const unitSchema = z.object({
  id: z.string().uuid(),
  propertyId: z.string().uuid(),
  unitNumber: z.string().min(1, '部屋番号は必須です'),
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

export const paymentRecordSchema = z.object({
  id: z.string().uuid(),
  unitId: z.string().uuid(),
  paymentDate: z.date(),
  amount: z.number().positive('金額は0より大きい値である必要があります'),
  paymentStatus: z.enum(['normal', 'delayed', 'delinquent', 'adjusted']),
  paymentMethod: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const loanSchema = z.object({
  id: z.string().uuid(),
  propertyId: z.string().uuid(),
  lenderName: z.string().min(1, '貸主名は必須です'),
  loanAmount: z.number().positive('ローン金額は0より大きい値である必要があります'),
  interestRate: z.number().positive('金利は0より大きい値である必要があります'),
  termYears: z.number().positive('期間は0より大きい値である必要があります'),
  startDate: z.date(),
  endDate: z.date(),
  repaymentMethod: z.enum(['principal_equal', 'annuity']),
  paymentFrequency: z.string().min(1, '支払い頻度は必須です'),
  paymentAmount: z.number().positive('支払い金額は0より大きい値である必要があります'),
  remainingBalance: z.number().positive('残債は0より大きい値である必要があります'),
});

export const expenseSchema = z.object({
  id: z.string().uuid(),
  propertyId: z.string().uuid(),
  expenseDate: z.date(),
  category: z.string().min(1, 'カテゴリは必須です'),
  amount: z.number().positive('金額は0より大きい値である必要があります'),
  vendor: z.string().optional(),
  description: z.string().optional(),
  receiptUrl: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringFrequency: z.string().optional(),
});

export type UserData = z.infer<typeof userSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type Property = z.infer<typeof propertySchema>;
export type Unit = z.infer<typeof unitSchema>;
export type PaymentRecord = z.infer<typeof paymentRecordSchema>;
export type Loan = z.infer<typeof loanSchema>;
export type Expense = z.infer<typeof expenseSchema>;

export const validateForm = <T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: boolean; data?: T; errors?: z.ZodError } => {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
};
