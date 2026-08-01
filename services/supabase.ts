

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
// FIX: 'ItemStatus' is an enum used as a value at runtime (e.g., ItemStatus.Rented) and must be imported as a value, not with 'import type'. The other imports are interfaces and can remain type-only.
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


// IMPORTANT: Replace these with your actual Supabase URL and Anon Key.
// It's recommended to use environment variables for this in a real project.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://acitqhoncjqjvkkrdxke.supabase.co';
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaXRxaG9uY2pxanZra3JkeGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODUzNzgsImV4cCI6MjA3MTI2MTM3OH0.Oz_cIU9x8h0XxG9YlyxCNUF9YDsMPlwDqvI3rrV8Bsg';

export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseKey);

export const checkSupabaseConnection = () => {
    if (!supabase) {
        const message = "Cliente Supabase não configurado. Adicione sua URL e Chave Anônima do Supabase em 'services/supabase.ts'.";
        console.error(message);
        return { isConnected: false, message };
    }
    return { isConnected: true, message: "Cliente Supabase conectado." };
};

export const getActiveRentalsByCpf = async (customerCpf: string): Promise<RentalWithItem[]> => {
    const { data, error } = await supabase
        .from('rentals')
        .select('*, items(*)')
        .eq('customer_cpf', customerCpf)
        .is('end_time', null)
        .order('start_time', { ascending: true });

    if (error) {
        console.error('Error fetching active rentals by CPF:', error);
        throw error;
    }

    // Filtra no cliente para garantir que o item não seja nulo, o que pode ocorrer se um item for excluído
    // enquanto um aluguel está ativo.
    return (data || []).filter(rental => rental.items) as RentalWithItem[];
};

export const pauseRental = async (rentalId: number) => {
    const { data, error } = await supabase
        .from('rentals')
        .update({ paused_at: new Date().toISOString() })
        .eq('id', rentalId)
        .select();

    if (error) {
        console.error('Supabase pause rental error:', JSON.stringify(error, null, 2));
        throw error;
    }
    
    if (!data || data.length === 0) {
        throw new Error("A operação de pausar falhou. Verifique as políticas de segurança (RLS) da sua tabela 'rentals', pois a atualização pode não ser permitida.");
    }
};

export const resumeRental = async (rentalId: number, pausedAt: string, currentTotalPausedSeconds: number | null) => {
    const pauseStarted = new Date(pausedAt).getTime();
    const now = new Date().getTime();
    const newPauseDurationSeconds = Math.round((now - pauseStarted) / 1000);
    const newTotalPausedDuration = (currentTotalPausedSeconds || 0) + newPauseDurationSeconds;

    const { data, error } = await supabase
        .from('rentals')
        .update({ 
            paused_at: null,
            total_paused_duration_seconds: newTotalPausedDuration
        })
        .eq('id', rentalId)
        .select();

    if (error) {
        console.error('Supabase resume rental error:', JSON.stringify(error, null, 2));
        throw error;
    }
    
    if (!data || data.length === 0) {
        throw new Error("A operação de retomar falhou. Verifique as políticas de segurança (RLS) da sua tabela 'rentals', pois a atualização pode não ser permitida.");
    }
};

export const getItemsWithRentals = async (): Promise<CombinedItem[]> => {
    const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .order('id', { ascending: true });

    if (itemsError) throw itemsError;

    const { data: rentals, error: rentalsError } = await supabase
        .from('rentals')
        .select('*')
        .is('end_time', null);

    if (rentalsError) throw rentalsError;

    if (!items) return [];

    const activeRentals = rentals || [];

    // Cria um mapa de `itemId` para o aluguel ativo mais recente. Isso é mais eficiente
    // do que filtrar a lista de aluguéis para cada item e também resolve o problema
    // de múltiplos aluguéis "ativos" para um item, selecionando o mais novo.
    const latestActiveRentalMap = new Map<number, ActiveRental>();
    for (const rental of activeRentals) {
        if (!latestActiveRentalMap.has(rental.item_id) || new Date(rental.start_time) > new Date(latestActiveRentalMap.get(rental.item_id)!.start_time)) {
            latestActiveRentalMap.set(rental.item_id, rental as ActiveRental);
        }
    }

    const combinedData = items.map((item) => {
        const activeRental = latestActiveRentalMap.get(item.id);
        
        if (activeRental) {
            // A fonte da verdade para o status de um item é a existência de um aluguel ativo.
            // Sobrescrevemos o status do item com 'rented' para corrigir inconsistências de dados
            // (ex: quando a atualização do status do item no banco de dados falha).
            // Isso garante que o painel do administrador sempre reflita o estado real.
            return { ...item, status: ItemStatus.Rented, activeRental: activeRental };
        }
        
        // Se não houver aluguel ativo, garantimos que o status seja 'available'.
        return { ...item, status: ItemStatus.Available, activeRental: undefined };
    });

    return combinedData as CombinedItem[];
};


export const getItemById = async (id: number): Promise<RentalItem | null> => {
    const { data, error } = await supabase.from('items').select('*').eq('id', id).single();
    if (error) {
        console.error("Error fetching item by ID:", error);
        return null;
    }
    return data as RentalItem | null;
}

export const startRental = async (itemId: number, customer: { name: string; cpf: string; phone: string }) => {
    // Adiciona uma verificação para garantir que o item ainda existe e está disponível
    // antes de tentar criar o aluguel, prevenindo a condição de corrida.
    const { data: item, error: itemError } = await supabase
        .from('items')
        .select('id, status')
        .eq('id', itemId)
        .single();

    if (itemError || !item) {
        console.error('Error fetching item before rental or item not found:', itemError);
        throw new Error('O item que você está tentando alugar não existe mais ou não pôde ser verificado.');
    }

    if (item.status === 'rented') {
        throw new Error('Ops! Alguém foi mais rápido. Este item acabou de ser alugado. Por favor, escolha outro.');
    }

    const { data: rentalData, error: rentalError } = await supabase
        .from('rentals')
        .insert({
            item_id: itemId,
            customer_name: customer.name,
            customer_cpf: customer.cpf,
            customer_phone: customer.phone,
            // O campo 'start_time' foi omitido. É CRUCIAL que a coluna 'start_time'
            // na sua tabela 'rentals' do Supabase tenha um valor padrão de 'now()' ou 'CURRENT_TIMESTAMP'.
            // Isso garante que o tempo de início do aluguel seja sempre o tempo preciso do servidor,
            // tornando o sistema mais robusto contra relógios de dispositivos dessincronizados.
            total_paused_duration_seconds: 0
        })
        .select();

    if (rentalError) {
        console.error('Supabase rental insert error:', rentalError);
        if (rentalError.code === '23503') { // Foreign key violation
             throw new Error('Falha ao alugar: O item foi removido por um administrador bem no momento da sua confirmação.');
        }
        throw rentalError;
    }

    if (!rentalData || rentalData.length === 0) {
        throw new Error("A criação do aluguel falhou em retornar os dados. Verifique as políticas de segurança (RLS) da sua tabela 'rentals' no Supabase.");
    }

    const { error: updateItemError } = await supabase
        .from('items')
        .update({ status: 'rented' })
        .eq('id', itemId);

    if (updateItemError) {
        // Tenta reverter a criação do aluguel se a atualização do item falhar.
        await supabase.from('rentals').delete().eq('id', (rentalData[0] as any).id);
        console.error('Supabase item update error:', updateItemError);
        throw new Error(`Falha ao atualizar o status do item. O aluguel foi cancelado. Erro: ${updateItemError.message}`);
    }

    return rentalData;
};

export const endRental = async (rentalId: number, itemId: number, totalCost: number) => {
    const { error: rentalError } = await supabase
        .from('rentals')
        .update({ end_time: new Date().toISOString(), total_cost: totalCost })
        .eq('id', rentalId);
    
    if (rentalError) throw rentalError;

    const { error: itemError } = await supabase
        .from('items')
        .update({ status: 'available' })
        .eq('id', itemId);
    
    if (itemError) throw itemError;
};

export const createItem = async (type: ItemType, pricePerMinute: number) => {
    // 1. Conta os itens existentes do mesmo tipo para determinar o novo id_visual.
    const { count, error: countError } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('type', type);

    if (countError) {
        console.error('Supabase count error:', countError);
        throw countError;
    }

    const newVisualId = (count ?? 0) + 1;

    // 2. Insere o novo item com o id_visual calculado.
    const { data, error } = await supabase
        .from('items')
        .insert({
            type: type,
            price_per_minute: pricePerMinute,
            status: 'available',
            id_visual: newVisualId
        })
        .select();
    
    if (error) {
        console.error('Supabase insert error:', error);
        throw error;
    }

    // Se os dados forem nulos ou vazios, pode ser que uma política RLS esteja impedindo a seleção
    // após a inserção, mesmo que a inserção tenha funcionado. Este é um problema comum do Supabase.
    if (!data || data.length === 0) {
        throw new Error("A criação do item falhou em retornar os dados. Verifique as políticas de segurança (RLS) da sua tabela 'items' no Supabase para garantir que a inserção (INSERT) e a seleção (SELECT) são permitidas.");
    }

    return data;
};

export const updateItemPrice = async (itemId: number, newPrice: number) => {
    const { error } = await supabase
        .from('items')
        .update({ price_per_minute: newPrice })
        .eq('id', itemId);

    if (error) {
        console.error('Supabase update price error:', error);
        throw error;
    }
};

export const deleteItem = async (itemId: number) => {
    const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId);

    if (error) {
        console.error('Supabase delete item error:', error);
        if (error.code === '23503') { // Foreign key violation
            throw new Error('Não é possível excluir este item, pois ele está associado a aluguéis existentes (histórico).');
        }
        throw new Error(`Falha ao excluir o item. Erro: ${error.message}`);
    }
};

export const getCompletedRentalsByDate = async (date: string): Promise<CompletedRental[]> => {
    // Cria objetos de data com base no fuso horário local do usuário.
    // '2024-08-22' se torna 22 de agosto à meia-noite no fuso horário do navegador.
    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59.999`);

    // .toISOString() converte essas datas locais para o formato UTC que o Supabase espera.
    // Ex: 22/08 00:00 (GMT-3) se torna 22/08 03:00 (UTC).
    const { data, error } = await supabase
        .from('rentals')
        .select('id, customer_name, start_time, end_time, total_cost, items!inner(id_visual, type)')
        .not('end_time', 'is', null)
        .not('total_cost', 'is', null)
        .gte('end_time', startOfDay.toISOString())
        .lte('end_time', endOfDay.toISOString())
        .order('start_time', { ascending: false });

    if (error) {
        console.error('Supabase get rentals by date error:', error);
        throw new Error(`Falha ao buscar aluguéis: ${error.message}`);
    }

    return data as CompletedRental[];
}

export const getStrangeRentals = async (): Promise<RentalWithItem[]> => {
    const { data, error } = await supabase
        .from('rentals')
        .select('id, item_id, customer_name, customer_cpf, customer_phone, start_time, end_time, total_cost, paused_at, total_paused_duration_seconds, items(*)')
        .gt('total_cost', 150)
        .order('end_time', { ascending: false });

    if (error) {
        console.error('Supabase get strange rentals error:', error);
        throw new Error(`Falha ao buscar aluguéis estranhos: ${error.message}`);
    }

    return (data || []) as RentalWithItem[];
};

export const updateRentalRecord = async (rentalId: number, updates: any) => {
    const { error } = await supabase
        .from('rentals')
        .update(updates)
        .eq('id', rentalId);

    if (error) {
        console.error('Supabase update rental error:', error);
        throw new Error(`Falha ao atualizar aluguel: ${error.message}`);
    }
};

export const deleteRentalRecord = async (rentalId: number) => {
    const { error } = await supabase
        .from('rentals')
        .delete()
        .eq('id', rentalId);

    if (error) {
        console.error('Supabase delete rental error:', error);
        throw new Error(`Falha ao excluir aluguel: ${error.message}`);
    }
};

export const deleteMultipleRentals = async (rentalIds: number[]) => {
    const { error } = await supabase
        .from('rentals')
        .delete()
        .in('id', rentalIds);

    if (error) {
        console.error('Supabase delete multiple rentals error:', error);
        throw new Error(`Falha ao excluir registros selecionados: ${error.message}`);
    }
};
