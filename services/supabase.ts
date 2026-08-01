import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ItemStatus, type RentalItem, type ActiveRental, type ItemType, type CombinedItem, type CompletedRental, type RentalWithItem } from '../types';

export type Database = {
  public: {
    Tables: {
      items: {
        Row: {
          id: number;
          id_visual: number;
          created_at: string;
          type: "Patinete" | "Pelúcia";
          price_per_minute: number;
          status: "available" | "rented";
        };
        Insert: {
          id?: number;
          id_visual: number;
          created_at?: string;
          type: "Patinete" | "Pelúcia";
          price_per_minute: number;
          status?: "available" | "rented";
        };
        Update: {
          id?: number;
          id_visual?: number;
          created_at?: string;
          type?: "Patinete" | "Pelúcia";
          price_per_minute?: number;
          status?: "available" | "rented";
        };
        Relationships: [];
      };
      rentals: {
        Row: {
          id: number;
          item_id: number;
          customer_name: string;
          customer_cpf: string;
          customer_phone: string;
          start_time: string;
          end_time: string | null;
          total_cost: number | null;
          paused_at: string | null;
          total_paused_duration_seconds: number | null;
        };
        Insert: {
          id?: number;
          item_id: number;
          customer_name: string;
          customer_cpf: string;
          customer_phone: string;
          start_time?: string;
          end_time?: string | null;
          total_cost?: number | null;
          paused_at?: string | null;
          total_paused_duration_seconds?: number | null;
        };
        Update: {
          id?: number;
          item_id?: number;
          customer_name?: string;
          customer_cpf?: string;
          customer_phone?: string;
          start_time?: string;
          end_time?: string | null;
          total_cost?: number | null;
          paused_at?: string | null;
          total_paused_duration_seconds?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "rentals_item_id_fkey",
            columns: ["item_id"],
            referencedRelation: "items",
            referencedColumns: ["id"]
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_revenue_per_item: {
        Args: {
          start_date: string;
          end_date: string;
        };
        Returns: {
          item_id: number;
          item_visual_id: number;
          item_type: string;
          total_revenue: number;
        }[];
      };
      get_revenue_time_series: {
        Args: {
          start_date: string;
          end_date: string;
          interval_type: string;
        };
        Returns: {
          time_bucket: string;
          total_revenue: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// URLs hardcoded para garantir funcionamento na Vercel
const supabaseUrl = 'https://acitqhoncjqjvkkrdxke.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaXRxaG9uY2pxanZra3JkeGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODUzNzgsImV4cCI6MjA3MTI2MTM3OH0.Oz_cIU9x8h0XxG9YlyxCNUF9YDsMPlwDqvI3rrV8Bsg';

export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseKey);

export const checkSupabaseConnection = () => {
    if (!supabase) {
        const message = "Cliente Supabase não configurado. Adicione sua URL e Chave Anônima do Supabase em 'services/supabase.ts'.";
        console.error(message);
        return { isConnected: false, message };
    }
    return { isConnected: true, message: "Cliente Supabase conectado." };
};
