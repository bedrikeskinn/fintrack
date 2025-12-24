import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          default_currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          default_currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          default_currency?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      expense_categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
        };
      };
      companies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          default_currency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          default_currency?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          default_currency?: string;
          created_at?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          website: string | null;
          monthly_budget: number | null;
          contract_months: number | null;
          vat_amount: number | null;
          payment_method: string | null;
          preferred_currency: string;
          services: string[];
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          website?: string | null;
          monthly_budget?: number | null;
          contract_months?: number | null;
          vat_amount?: number | null;
          payment_method?: string | null;
          preferred_currency?: string;
          services?: string[];
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          website?: string | null;
          monthly_budget?: number | null;
          contract_months?: number | null;
          vat_amount?: number | null;
          payment_method?: string | null;
          preferred_currency?: string;
          services?: string[];
          notes?: string | null;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          company_id: string;
          client_id: string | null;
          name: string;
          description: string | null;
          start_date: string;
          end_date: string | null;
          status: 'planned' | 'active' | 'done';
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          client_id?: string | null;
          name: string;
          description?: string | null;
          start_date: string;
          end_date?: string | null;
          status?: 'planned' | 'active' | 'done';
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          client_id?: string | null;
          name?: string;
          description?: string | null;
          start_date?: string;
          end_date?: string | null;
          status?: 'planned' | 'active' | 'done';
          notes?: string | null;
          created_at?: string;
        };
      };
      income: {
        Row: {
          id: string;
          company_id: string;
          date: string;
          title: string;
          amount: number;
          vat_amount: number;
          currency: string;
          fx_rate_to_try: number | null;
          try_amount: number | null;
          linked_type: 'client' | 'project' | 'none';
          linked_client_id: string | null;
          linked_project_id: string | null;
          details: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          date: string;
          title: string;
          amount: number;
          vat_amount?: number;
          currency?: string;
          fx_rate_to_try?: number | null;
          try_amount?: number | null;
          linked_type?: 'client' | 'project' | 'none';
          linked_client_id?: string | null;
          linked_project_id?: string | null;
          details?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          date?: string;
          title?: string;
          amount?: number;
          vat_amount?: number;
          currency?: string;
          fx_rate_to_try?: number | null;
          try_amount?: number | null;
          linked_type?: 'client' | 'project' | 'none';
          linked_client_id?: string | null;
          linked_project_id?: string | null;
          details?: string | null;
          created_at?: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          scope: 'company' | 'personal';
          company_id: string | null;
          date: string;
          title: string;
          amount: number;
          vat_amount: number;
          currency: string;
          fx_rate_to_try: number | null;
          try_amount: number | null;
          expense_category: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          scope: 'company' | 'personal';
          company_id?: string | null;
          date: string;
          title: string;
          amount: number;
          vat_amount?: number;
          currency?: string;
          fx_rate_to_try?: number | null;
          try_amount?: number | null;
          expense_category?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          scope?: 'company' | 'personal';
          company_id?: string | null;
          date?: string;
          title?: string;
          amount?: number;
          vat_amount?: number;
          currency?: string;
          fx_rate_to_try?: number | null;
          try_amount?: number | null;
          expense_category?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      personal_income: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          title: string;
          amount: number;
          vat_amount: number;
          currency: string;
          fx_rate_to_try: number | null;
          try_amount: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          title: string;
          amount: number;
          vat_amount?: number;
          currency?: string;
          fx_rate_to_try?: number | null;
          try_amount?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          title?: string;
          amount?: number;
          vat_amount?: number;
          currency?: string;
          fx_rate_to_try?: number | null;
          try_amount?: number | null;
          notes?: string | null;
          created_at?: string;
        };
      };
    };
  };
};
