import { createClient } from '@/utils/supabase/server';
import { cache } from '../cache';

export class OptimizedQueries {
  private supabase = createClient();

  async getPropertiesWithCache(userId: string) {
    const cacheKey = `properties:${userId}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const { data, error } = await this.supabase
      .from('properties')
      .select(
        `
        *,
        loans:loans(count),
        rent_rolls:rent_rolls(
          monthly_rent,
          tenant_name
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 2分間キャッシュ
    cache.set(cacheKey, data, 2 * 60 * 1000);
    return data;
  }

  async getPropertyAnalytics(propertyId: string) {
    const cacheKey = `analytics:${propertyId}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    // 複数のクエリを並列実行
    const [{ data: property }, { data: loans }, { data: rentRolls }, { data: expenses }] =
      await Promise.all([
        this.supabase.from('properties').select('*').eq('id', propertyId).single(),
        this.supabase.from('loans').select('*').eq('property_id', propertyId),
        this.supabase.from('rent_rolls').select('*').eq('property_id', propertyId),
        this.supabase.from('expenses').select('*').eq('property_id', propertyId),
      ]);

    const analytics = {
      property,
      totalLoans: loans?.length || 0,
      totalRent: rentRolls?.reduce((sum, roll) => sum + (roll.monthly_rent || 0), 0) || 0,
      totalExpenses: expenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0,
    };

    // 5分間キャッシュ
    cache.set(cacheKey, analytics, 5 * 60 * 1000);
    return analytics;
  }
}

export const optimizedQueries = new OptimizedQueries();
