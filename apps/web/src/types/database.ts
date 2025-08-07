export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Supabaseのユーザーテーブルの型定義
export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'owner' | 'manager' | 'viewer' | 'auditor';
  timezone: string;
  language: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: {
          id?: string;
          email: string;
          name: string;
          role?: 'admin' | 'owner' | 'manager' | 'viewer' | 'auditor';
          timezone?: string;
          language?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?: 'admin' | 'owner' | 'manager' | 'viewer' | 'auditor';
          timezone?: string;
          language?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      properties: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          address: string;
          property_type: string;
          purchase_price: number;
          purchase_date: string;
          current_valuation: number | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          address: string;
          property_type: string;
          purchase_price: number;
          purchase_date: string;
          current_valuation?: number | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          address?: string;
          property_type?: string;
          purchase_price?: number;
          purchase_date?: string;
          current_valuation?: number | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      loans: {
        Row: {
          id: string;
          property_id: string;
          lender_name: string;
          loan_type: string;
          principal_amount: number;
          current_balance: number;
          interest_rate: number;
          loan_term_months: number;
          monthly_payment: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          property_id: string;
          lender_name: string;
          loan_type: string;
          principal_amount: number;
          current_balance: number;
          interest_rate: number;
          loan_term_months: number;
          monthly_payment: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          property_id?: string;
          lender_name?: string;
          loan_type?: string;
          principal_amount?: number;
          current_balance?: number;
          interest_rate?: number;
          loan_term_months?: number;
          monthly_payment?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      rent_rolls: {
        Row: {
          id: string;
          property_id: string;
          unit_number: string;
          tenant_name: string | null;
          monthly_rent: number;
          lease_start_date: string | null;
          lease_end_date: string | null;
          status: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          property_id: string;
          unit_number: string;
          tenant_name?: string | null;
          monthly_rent: number;
          lease_start_date?: string | null;
          lease_end_date?: string | null;
          status: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          property_id?: string;
          unit_number?: string;
          tenant_name?: string | null;
          monthly_rent?: number;
          lease_start_date?: string | null;
          lease_end_date?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      expenses: {
        Row: {
          id: string;
          property_id: string;
          expense_date: string;
          category: string;
          description: string;
          amount: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          property_id: string;
          expense_date: string;
          category: string;
          description: string;
          amount: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          property_id?: string;
          expense_date?: string;
          category?: string;
          description?: string;
          amount?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
