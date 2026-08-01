import React, { useState, useEffect, useMemo } from 'react';
import { getCompletedRentalsByDate } from '../services/supabase';
import type { CompletedRental } from '../types';
import { ChartPieIcon, CurrencyDollarIcon, ClockIcon } from '@heroicons/react/24/outline';

// --- Helper Functions ---
const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
};

const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatDuration = (start: string, end: string): string => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.round(diff / 60000);
    return `${minutes} min`;
};

// Helper to get local date as YYYY-MM-DD
const toYYYYMMDD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- Main Component ---
const RentalHistoryView: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState(toYYYYMMDD(new Date()));
    const [rentals, setRentals] = useState<CompletedRental[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRentals = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getCompletedRentalsByDate(selectedDate);
                setRentals(data);
            } catch (err: any) {
                setError(err.message || 'Falha ao carregar o histórico de aluguéis.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchRentals();
    }, [selectedDate]);

    const kpis = useMemo(() => {
        const totalRevenue = rentals.reduce((sum, rental) => sum + (rental.total_cost || 0), 0);
        const totalRentals = rentals.length;
        
        const totalDurationMinutes = rentals.reduce((sum, rental) => {
             const diff = new Date(rental.end_time).getTime() - new Date(rental.start_time).getTime();
             return sum + (diff / 60000);
        }, 0);

        const averageDuration = totalRentals > 0 ? totalDurationMinutes / totalRentals : 0;

        return {
            totalRevenue,
            totalRentals,
            averageDuration,
        };
    }, [rentals]);

    const renderContent = () => {
        if (loading) {
            return (
                <div className="text-center py-10">
                    <p className="text-slate-500">Carregando histórico...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
                    <p className="font-bold">Erro:</p>
                    <p>{error}</p>
                </div>
            );
        }

        if (rentals.length === 0) {
            return (
                <div className="text-center py-16 bg-white rounded-lg shadow-md border">
                    <h3 className="text-xl font-semibold text-slate-700">Nenhum aluguel finalizado</h3>
                    <p className="text-slate-500 mt-2">Não foram encontrados aluguéis concluídos para a data selecionada.</p>
                </div>
            );
        }

        return (
            <div className="bg-white rounded-lg shadow-md border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Item</th>
                                <th scope="col" className="px-6 py-3">Cliente</th>
                                <th scope="col" className="px-6 py-3">Horário</th>
                                <th scope="col" className="px-6 py-3">Duração</th>
                                <th scope="col" className="px-6 py-3 text-right">Custo Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rentals.map((rental) => (
                                <tr key={rental.id} className="bg-white border-b hover:bg-slate-50">
                                    <th scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                                        {rental.items ? `${rental.items.type} #${rental.items.id_visual}` : 'Item Excluído'}
                                    </th>
                                    <td className="px-6 py-4">{rental.customer_name}</td>
                                    <td className="px-6 py-4">{`${formatTime(rental.start_time)} - ${formatTime(rental.end_time)}`}</td>
                                    <td className="px-6 py-4">{formatDuration(rental.start_time, rental.end_time)}</td>
                                    <td className="px-6 py-4 text-right font-semibold">{formatCurrency(rental.total_cost || 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-md border flex items-center gap-4">
                <label htmlFor="date-picker" className="font-semibold text-slate-700">Selecione uma data:</label>
                <input
                    type="date"
                    id="date-picker"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="p-2 border bg-white text-slate-900 border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md border flex items-start gap-4">
                    <div className="bg-teal-100 p-3 rounded-full"><CurrencyDollarIcon className="w-6 h-6 text-teal-600"/></div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-700">Faturamento do Dia</h3>
                        <p className="text-3xl font-bold text-teal-600 mt-1">{formatCurrency(kpis.totalRevenue)}</p>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-md border flex items-start gap-4">
                     <div className="bg-indigo-100 p-3 rounded-full"><ChartPieIcon className="w-6 h-6 text-indigo-600"/></div>
                     <div>
                        <h3 className="text-lg font-semibold text-slate-700">Total de Aluguéis</h3>
                        <p className="text-3xl font-bold text-indigo-600 mt-1">{kpis.totalRentals}</p>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-md border flex items-start gap-4">
                     <div className="bg-sky-100 p-3 rounded-full"><ClockIcon className="w-6 h-6 text-sky-600"/></div>
                     <div>
                        <h3 className="text-lg font-semibold text-slate-700">Duração Média</h3>
                        <p className="text-3xl font-bold text-sky-600 mt-1">{kpis.averageDuration.toFixed(0)} min</p>
                    </div>
                </div>
            </div>

            {renderContent()}
        </div>
    );
};

export default RentalHistoryView;