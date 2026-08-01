
import React, { useState, useEffect, useCallback } from 'react';
import { supabase, getStrangeRentals, updateRentalRecord, deleteRentalRecord, deleteMultipleRentals } from '../services/supabase';
import type { RentalWithItem } from '../types';
import Modal from './Modal';
import { PencilSquareIcon, TrashIcon, ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';

const DebugView: React.FC = () => {
    const [rentals, setRentals] = useState<RentalWithItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingRental, setEditingRental] = useState<RentalWithItem | null>(null);
    const [deletingRental, setDeletingRental] = useState<RentalWithItem | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isBulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);

    const fetchRentals = useCallback(async () => {
        setLoading(true);
        setError(null);
        setSelectedIds([]);
        try {
            const data = await getStrangeRentals();
            setRentals(data);
        } catch (err: any) {
            setError(err.message || 'Falha ao buscar aluguéis estranhos.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRentals();
    }, [fetchRentals]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRental) return;
        
        setLoading(true);
        try {
            await updateRentalRecord(editingRental.id, {
                customer_name: editingRental.customer_name,
                customer_cpf: editingRental.customer_cpf,
                customer_phone: editingRental.customer_phone,
                total_cost: editingRental.total_cost
            });
            await fetchRentals();
            setEditingRental(null);
        } catch (err: any) {
            setError(err.message || 'Falha ao atualizar registro.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingRental) return;
        
        setLoading(true);
        try {
            await deleteRentalRecord(deletingRental.id);
            await fetchRentals();
            setDeletingRental(null);
        } catch (err: any) {
            setError(err.message || 'Falha ao excluir registro.');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        
        setLoading(true);
        try {
            await deleteMultipleRentals(selectedIds);
            await fetchRentals();
            setBulkDeleteModalOpen(false);
            setSelectedIds([]);
        } catch (err: any) {
            setError(err.message || 'Falha ao excluir registros selecionados.');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (id: number) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleAllSelections = () => {
        if (selectedIds.length === rentals.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(rentals.map(r => r.id));
        }
    };

    const formatDuration = (start: string, end: string | null) => {
        if (!end) return 'Em andamento';
        const s = new Date(start).getTime();
        const e = new Date(end).getTime();
        const diffMs = e - s;
        const mins = Math.floor(diffMs / 60000);
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        return `${hours}h ${remainingMins}m`;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Aluguéis Estranhos (&gt; R$ 150)</h2>
                    {selectedIds.length > 0 && (
                        <p className="text-sm text-slate-500 mt-1">
                            {selectedIds.length} {selectedIds.length === 1 ? 'item selecionado' : 'itens selecionados'}
                        </p>
                    )}
                </div>
                <div className="flex gap-3">
                    {selectedIds.length > 0 && (
                        <button 
                            onClick={() => setBulkDeleteModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-sm"
                        >
                            <TrashIcon className="w-5 h-5" />
                            Excluir Selecionados
                        </button>
                    )}
                    <button 
                        onClick={fetchRentals} 
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                    >
                        <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </button>
                </div>
            </div>

            {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">{error}</div>}

            <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        checked={rentals.length > 0 && selectedIds.length === rentals.length}
                                        onChange={toggleAllSelections}
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Item</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Início / Fim</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Duração</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Valor</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {rentals.map((rental) => (
                                <tr key={rental.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(rental.id) ? 'bg-indigo-50' : ''}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                            checked={selectedIds.includes(rental.id)}
                                            onChange={() => toggleSelection(rental.id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="font-medium text-slate-900">{rental.customer_name}</div>
                                        <div className="text-slate-500 text-xs">{rental.customer_cpf}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {rental.items ? `${rental.items.type} #${rental.items.id_visual}` : 'Item removido'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                                        <div>{new Date(rental.start_time).toLocaleString('pt-BR')}</div>
                                        <div>{rental.end_time ? new Date(rental.end_time).toLocaleString('pt-BR') : '---'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {formatDuration(rental.start_time, rental.end_time)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                                        R$ {rental.total_cost?.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button 
                                            onClick={() => setEditingRental({...rental})} 
                                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                                            title="Editar"
                                        >
                                            <PencilSquareIcon className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={() => setDeletingRental(rental)} 
                                            className="text-red-600 hover:text-red-900"
                                            title="Excluir"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {rentals.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                                        Nenhum aluguel "estranho" encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de confirmação de exclusão em massa */}
            <Modal isOpen={isBulkDeleteModalOpen} onClose={() => setBulkDeleteModalOpen(false)}>
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-red-600">Confirmar Exclusão em Massa</h3>
                    <p className="text-slate-600">
                        Você selecionou <strong>{selectedIds.length}</strong> registros para exclusão. 
                        Tem certeza que deseja removê-los? Esta ação não pode ser desfeita.
                    </p>
                    <div className="flex justify-end gap-3 pt-4">
                        <button 
                            type="button" 
                            onClick={() => setBulkDeleteModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="button"
                            onClick={handleBulkDelete}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
                        >
                            {loading ? 'Excluindo...' : `Sim, excluir ${selectedIds.length} registros`}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Edição */}
            <Modal isOpen={!!editingRental} onClose={() => setEditingRental(null)}>
                {editingRental && (
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <h3 className="text-xl font-bold">Editar Registro</h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Nome do Cliente</label>
                            <input 
                                type="text"
                                value={editingRental.customer_name}
                                onChange={e => setEditingRental({...editingRental, customer_name: e.target.value})}
                                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">CPF</label>
                                <input 
                                    type="text"
                                    value={editingRental.customer_cpf}
                                    onChange={e => setEditingRental({...editingRental, customer_cpf: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Valor (R$)</label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    value={editingRental.total_cost || 0}
                                    onChange={e => setEditingRental({...editingRental, total_cost: parseFloat(e.target.value)})}
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <button 
                                type="button" 
                                onClick={() => setEditingRental(null)}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {loading ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modal de Exclusão Individual */}
            <Modal isOpen={!!deletingRental} onClose={() => setDeletingRental(null)}>
                {deletingRental && (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-red-600">Confirmar Exclusão</h3>
                        <p className="text-slate-600">
                            Tem certeza que deseja excluir o registro de aluguel de <strong>{deletingRental.customer_name}</strong>?
                            Esta ação é irreversível.
                        </p>
                        <div className="flex justify-end gap-3 pt-4">
                            <button 
                                type="button" 
                                onClick={() => setDeletingRental(null)}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="button"
                                onClick={handleDelete}
                                disabled={loading}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
                            >
                                {loading ? 'Excluindo...' : 'Confirmar Exclusão'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default DebugView;
