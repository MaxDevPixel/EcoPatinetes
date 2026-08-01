
export enum ItemType {
    Patinete = 'Patinete',
    Pelucia = 'Pelúcia'
}

export enum ItemStatus {
    Available = 'available',
    Rented = 'rented'
}

export interface RentalItem {
    id: number;
    id_visual: number;
    created_at: string;
    type: ItemType;
    price_per_minute: number;
    status: ItemStatus;
}

export interface ActiveRental {
    id: number;
    item_id: number;
    customer_name: string;
    customer_cpf: string;
    customer_phone: string;
    start_time: string;
    paused_at: string | null;
    total_paused_duration_seconds: number | null;
    end_time: string | null;
    total_cost: number | null;
}

export interface RentalWithItem extends ActiveRental {
    items: RentalItem | null;
}

export interface CombinedItem extends RentalItem {
    activeRental?: ActiveRental;
}

export interface CompletedRental {
    id: number;
    customer_name: string;
    start_time: string;
    end_time: string;
    total_cost: number;
    items: {
        id_visual: number;
        type: ItemType;
    } | null;
}
