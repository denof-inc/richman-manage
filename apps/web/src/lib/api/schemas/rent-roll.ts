import { z } from 'zod';

/**
 * 入居状況
 */
export const OccupancyStatusSchema = z.enum(['occupied', 'vacant', 'reserved']);
export type OccupancyStatus = z.infer<typeof OccupancyStatusSchema>;

/**
 * レントロール作成スキーマ
 */
export const CreateRentRollSchema = z.object({
  property_id: z.string().uuid('有効な物件IDを指定してください'),
  room_number: z.string().min(1, '部屋番号を入力してください'),
  tenant_name: z.string().nullable().optional(),
  monthly_rent: z.number().min(0, '家賃は0円以上で入力してください').nullable().optional(),
  occupancy_status: OccupancyStatusSchema,
  lease_start_date: z.string().datetime().nullable().optional(),
  lease_end_date: z.string().datetime().nullable().optional(),
  security_deposit: z.number().min(0, '敷金は0円以上で入力してください').nullable().optional(),
  key_money: z.number().min(0, '礼金は0円以上で入力してください').nullable().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * レントロール更新スキーマ
 */
export const UpdateRentRollSchema = z.object({
  room_number: z.string().min(1, '部屋番号を入力してください').optional(),
  tenant_name: z.string().nullable().optional(),
  monthly_rent: z.number().min(0, '家賃は0円以上で入力してください').optional(),
  occupancy_status: OccupancyStatusSchema.optional(),
  lease_start_date: z.string().datetime().nullable().optional(),
  lease_end_date: z.string().datetime().nullable().optional(),
  security_deposit: z.number().min(0, '敷金は0円以上で入力してください').nullable().optional(),
  key_money: z.number().min(0, '礼金は0円以上で入力してください').nullable().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * レントロールレスポンススキーマ
 */
export const RentRollResponseSchema = z.object({
  id: z.string().uuid(),
  property_id: z.string().uuid(),
  room_number: z.string(),
  tenant_name: z.string().nullable(),
  monthly_rent: z.number(),
  occupancy_status: OccupancyStatusSchema,
  lease_start_date: z.string().nullable(),
  lease_end_date: z.string().nullable(),
  security_deposit: z.number().nullable(),
  key_money: z.number().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});

/**
 * レントロールクエリスキーマ
 */
export const RentRollQuerySchema = z.object({
  property_id: z.string().uuid().optional(),
  occupancy_status: OccupancyStatusSchema.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.enum(['room_number', 'monthly_rent', 'created_at']).default('room_number'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * レントロールサマリースキーマ
 */
export const RentRollSummarySchema = z.object({
  property_id: z.string().uuid(),
  total_rooms: z.number(),
  occupied_rooms: z.number(),
  vacant_rooms: z.number(),
  occupancy_rate: z.number(),
  total_monthly_income: z.number(),
  potential_monthly_income: z.number(),
  average_rent: z.number(),
});

/**
 * 型定義
 */
export type CreateRentRoll = z.infer<typeof CreateRentRollSchema>;
export type UpdateRentRoll = z.infer<typeof UpdateRentRollSchema>;
export type RentRollResponse = z.infer<typeof RentRollResponseSchema>;
export type RentRollQuery = z.infer<typeof RentRollQuerySchema>;
export type RentRollSummary = z.infer<typeof RentRollSummarySchema>;
