
import React, { useState } from 'react';
import type { RentalItem, ActiveRental } from '../types';
import { startRental } from '../services/supabase';

interface RentalFormProps {
    item: RentalItem;
    onSuccess: (customer: { name: string; cpf: string; phone: string }, newRental: ActiveRental) => void;
}

const RentalForm: React.FC<RentalFormProps> = ({ item, onSuccess }) => {
    const [name, setName] = useState('');
    const [cpf, setCpf] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const formatCpf = (value: string): string => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .slice(0, 14);
    };

    const formatPhone = (value: string): string => {
        const v = value.replace(/\D/g, '').slice(0, 11);

        if (v.length >= 8) { // 8-11 digits
            return `(${v.slice(0, 2)}) ${v.slice(2, 3)} ${v.slice(3, 7)}-${v.slice(7)}`;
        } else if (v.length >= 4) { // 4-7 digits
            return `(${v.slice(0, 2)}) ${v.slice(2, 3)} ${v.slice(3)}`;
        } else if (v.length >= 3) { // 3 digits
            return `(${v.slice(0, 2)}) ${v.slice(2)}`;
        }
        
        return v;
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!name || cpf.length !== 14 || phone.length < 16) {
            setError('Por favor, preencha todos os campos corretamente.');
            return;
        }
        setLoading(true);
        try {
            const rentalData = await startRental(item.id, { name, cpf, phone });
            if (rentalData && rentalData.length > 0) {
                 onSuccess({ name, cpf, phone }, rentalData[0] as ActiveRental);
            } else {
                throw new Error("Não foi possível obter os detalhes do aluguel após a criação.");
            }
        } catch (err: any) {
            setError(err.message || 'Falha ao iniciar o aluguel. Por favor, tente novamente.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-lg mx-auto bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-3xl font-bold text-center mb-2">Alugar Item</h2>
            <p className="text-center text-slate-600 mb-6">Você está alugando: <strong className="text-indigo-600">{item.type} #{item.id_visual}</strong></p>
            <form onSubmit={handleSubmit}>
                {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4">{error}</p>}
                <div className="mb-4">
                    <label className="block text-slate-700 text-sm font-bold mb-2" htmlFor="name">
                        Nome Completo
                    </label>
                    <input
                        className="shadow appearance-none border rounded w-full py-3 px-4 bg-white text-slate-900 placeholder:text-slate-400 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-slate-700 text-sm font-bold mb-2" htmlFor="cpf">
                        CPF
                    </label>
                    <input
                        className="shadow appearance-none border rounded w-full py-3 px-4 bg-white text-slate-900 placeholder:text-slate-400 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        id="cpf"
                        type="text"
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={(e) => setCpf(formatCpf(e.target.value))}
                        required
                    />
                </div>
                <div className="mb-6">
                    <label className="block text-slate-700 text-sm font-bold mb-2" htmlFor="phone">
                        Número de Telefone
                    </label>
                    <input
                        className="shadow appearance-none border rounded w-full py-3 px-4 bg-white text-slate-900 placeholder:text-slate-400 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        id="phone"
                        type="text"
                        placeholder="(00) 9 0000-0000"
                        value={phone}
                        onChange={(e) => setPhone(formatPhone(e.target.value))}
                        required
                    />
                </div>
                <button
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors disabled:bg-indigo-300"
                    type="submit"
                    disabled={loading}
                >
                    {loading ? 'Iniciando Aluguel...' : 'Confirmar Aluguel'}
                </button>
            </form>
        </div>
    );
};

export default RentalForm;
