import type { CreateRentRoll, UpdateRentRoll, OccupancyStatus } from '@/lib/api/schemas/rent-roll';

// UI: occupancy_status ⇄ DB: room_status
const uiToDbStatus: Record<OccupancyStatus | 'occupied' | 'vacant' | 'reserved', string> = {
  occupied: 'occupied',
  vacant: 'vacant',
  reserved: 'reserved',
};

const dbToUiStatus: Record<string, OccupancyStatus> = {
  occupied: 'occupied',
  vacant: 'vacant',
  reserved: 'reserved',
};

type DbRentRollInsert = {
  property_id: string;
  room_number: string;
  tenant_name: string | null;
  monthly_rent: number | null;
  room_status: string; // DB名
  lease_start_date: string | null;
  lease_end_date: string | null;
  deposit_months: number | null;
  key_money_months: number | null;
  notes: string | null;
};

type DbRentRollUpdate = Partial<DbRentRollInsert> & { updated_at?: string };

function toMonthsFromAmount(
  amount: number | null | undefined,
  baseMonthly: number | null | undefined
) {
  if (amount == null || baseMonthly == null || baseMonthly <= 0) return null;
  // 金額→月数（小数第2位で四捨五入）
  const months = amount / baseMonthly;
  return Math.round(months * 100) / 100;
}

function toAmountFromMonths(
  months: number | null | undefined,
  baseMonthly: number | null | undefined
) {
  if (months == null || baseMonthly == null || baseMonthly <= 0) return null;
  // 月数→金額（小数第0〜2位に抑制、ここでは小数第0.01円で四捨五入）
  const amount = months * baseMonthly;
  return Math.round(amount * 100) / 100;
}

export function mapRentRollDtoToDbForCreate(input: CreateRentRoll): DbRentRollInsert {
  return {
    property_id: input.property_id,
    room_number: input.room_number,
    tenant_name: input.tenant_name ?? null,
    monthly_rent: input.monthly_rent ?? null,
    room_status: uiToDbStatus[input.occupancy_status] ?? 'vacant',
    lease_start_date: input.lease_start_date ?? null,
    lease_end_date: input.lease_end_date ?? null,
    deposit_months: toMonthsFromAmount(input.security_deposit, input.monthly_rent),
    key_money_months: toMonthsFromAmount(input.key_money, input.monthly_rent),
    notes: input.notes ?? null,
  };
}

export function mapRentRollDtoToDbForUpdate(input: Partial<UpdateRentRoll>): DbRentRollUpdate {
  const out: DbRentRollUpdate = {};
  if (input.room_number !== undefined) out.room_number = input.room_number;
  if (input.tenant_name !== undefined) out.tenant_name = input.tenant_name ?? null;
  if (input.monthly_rent !== undefined) out.monthly_rent = input.monthly_rent ?? null;
  if (input.occupancy_status !== undefined)
    out.room_status = uiToDbStatus[input.occupancy_status] ?? 'vacant';
  if (input.lease_start_date !== undefined) out.lease_start_date = input.lease_start_date ?? null;
  if (input.lease_end_date !== undefined) out.lease_end_date = input.lease_end_date ?? null;
  if (input.security_deposit !== undefined)
    out.deposit_months = toMonthsFromAmount(input.security_deposit, input.monthly_rent);
  if (input.key_money !== undefined)
    out.key_money_months = toMonthsFromAmount(input.key_money, input.monthly_rent);
  if (input.notes !== undefined) out.notes = input.notes ?? null;
  out.updated_at = new Date().toISOString();
  return out;
}

type DbRentRollRowForMap = {
  room_status?: string;
  deposit_months?: number | null;
  key_money_months?: number | null;
  monthly_rent?: number | null;
} & Record<string, unknown>;

export function mapRentRollDbToDto(input: DbRentRollRowForMap): Record<string, unknown> & {
  occupancy_status: OccupancyStatus;
  security_deposit: number | null;
  key_money: number | null;
} {
  const status = input.room_status ? (dbToUiStatus[input.room_status] ?? 'vacant') : 'vacant';
  const sd = toAmountFromMonths(input.deposit_months ?? null, input.monthly_rent ?? null);
  const km = toAmountFromMonths(input.key_money_months ?? null, input.monthly_rent ?? null);
  return {
    ...input,
    occupancy_status: status,
    security_deposit: sd,
    key_money: km,
  };
}
