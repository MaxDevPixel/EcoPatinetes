

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase, getActiveRentalsByCpf } from '../services/supabase';
import type { RentalWithItem } from '../types';
import { ClockIcon, CurrencyDollarIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { QrCodeIcon } from '@heroicons/react/24/solid';
import QRCodeScanner from '../components/QRCodeScanner';

// --- Componente para exibir um único aluguel ativo ---
const ActiveRentalCard: React.FC<{ rental: RentalWithItem }> = ({ rental }) => {
    const [duration, setDuration] = useState('00:00:00');
    const [cost, setCost] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Usamos useCallback para memoizar a função de cálculo.
    // Isso evita que ela seja recriada em cada renderização, a menos que `rental` mude.
    const calculateValues = useCallback(() => {
        if (!rental || !rental.items) return;

        const startTime = new Date(rental.start_time).getTime();
        const totalPausedMs = (rental.total_paused_duration_seconds || 0) * 1000;
        let activeMs = 0;

        // Se estiver pausado, calcula a duração até o momento da pausa.
        if (rental.paused_at) {
            const pausedAtTime = new Date(rental.paused_at).getTime();
            activeMs = (pausedAtTime - startTime) - totalPausedMs;
        } else { // Caso contrário, calcula até o momento atual.
            const now = new Date().getTime();
            activeMs = (now - startTime) - totalPausedMs;
        }
        
        activeMs = Math.max(0, activeMs);

        const totalMinutes = activeMs / 60000;
        const currentCost = totalMinutes * rental.items.price_per_minute;
        setCost(currentCost);

        const hours = Math.floor(activeMs / 3600000);
        const remainingMinutes = Math.floor((activeMs % 3600000) / 60000);
        const seconds = Math.floor((activeMs % 60000) / 1000);
        setDuration(`${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }, [rental]);

    // Este useEffect é responsável por gerenciar o intervalo do timer.
    useEffect(() => {
        // Calcula os valores uma vez, imediatamente quando o componente renderiza ou `rental` muda.
        calculateValues();

        // Configura um novo intervalo apenas se o aluguel estiver ativo (não pausado e não finalizado).
        if (!rental.paused_at && !rental.end_time) {
            intervalRef.current = setInterval(calculateValues, 1000);
        }

        // A função de limpeza é crucial. Ela é executada quando o componente é desmontado
        // ou antes que o efeito seja executado novamente (devido à mudança em `rental` ou `calculateValues`).
        // Isso garante que nenhum intervalo antigo seja deixado em execução.
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [rental, calculateValues]);
    
    let statusText = "Em andamento";
    let statusBgColor = "bg-blue-100 text-blue-800";
    if (rental.paused_at) {
        statusText = "Pausado";
        statusBgColor = "bg-yellow-100 text-yellow-800";
    }

    return (
         <div className="bg-slate-50 p-4 rounded-lg border">
            <div className="flex justify-between items-center mb-4">
                <p className="text-lg font-bold text-indigo-600">{rental.items?.type} #{rental.items?.id_visual}</p>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusBgColor}`}>
                    {statusText}
                </span>
            </div>
            <div className="flex justify-around items-center text-center">
                 <div>
                    <div className="flex items-center justify-center gap-2 text-slate-600 text-sm">
                        <ClockIcon className="w-5 h-5" />
                        <span>Duração</span>
                    </div>
                    <p className="text-3xl font-mono font-bold text-slate-900 tracking-tight">{duration}</p>
                 </div>
                 <div>
                    <div className="flex items-center justify-center gap-2 text-slate-600 text-sm">
                        <CurrencyDollarIcon className="w-5 h-5" />
                        <span>Custo Atual</span>
                    </div>
                    <p className="text-3xl font-mono font-bold text-teal-600">R$ {cost.toFixed(2)}</p>
                 </div>
            </div>
        </div>
    );
};


// --- Página principal de Acompanhamento ---
const TrackingPage: React.FC = () => {
    const { customerCpf } = useParams<{ customerCpf: string }>();
    const navigate = useNavigate();
    const [rentals, setRentals] = useState<RentalWithItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showScanner, setShowScanner] = useState(false);

    useEffect(() => {
        if (!customerCpf) {
            setError("CPF do cliente não encontrado na URL.");
            setLoading(false);
            return;
        }

        const decodedCpf = decodeURIComponent(customerCpf);

        const fetchRentals = async () => {
            try {
                const data = await getActiveRentalsByCpf(decodedCpf);
                setRentals(data);
                return data;
            } catch (err) {
                console.error("Falha ao buscar aluguéis:", err);
                throw err;
            }
        };

        const initialLoad = async () => {
            setLoading(true);
            try {
                const data = await fetchRentals();
                if (data.length === 0) {
                    const lastCustomer = sessionStorage.getItem('lastRentalCustomer');
                    if (!lastCustomer) {
                        setError("Nenhum aluguel ativo encontrado para este CPF.");
                    }
                }
            } catch (err: any) {
                setError(err.message || "Falha ao buscar dados do aluguel.");
            } finally {
                setLoading(false);
            }
        };

        initialLoad();

        const channel = supabase
            .channel(`customer-rentals-${decodedCpf}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'rentals', filter: `customer_cpf=eq.${decodedCpf}` },
                () => fetchRentals()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [customerCpf]);

    const handleScanSuccess = (decodedText: string) => {
        try {
            const url = new URL(decodedText);
            const path = url.hash;
            const match = path.match(/#\/rent\/(\d+)/);
            
            if (match && match[1]) {
                const newItemId = match[1];
                setShowScanner(false);
                navigate(`/rent/${newItemId}`);
            } else {
                setError("QR code inválido. Por favor, escaneie o QR code de um item para aluguel.");
                setShowScanner(false);
            }
        } catch (e) {
            console.error("Error parsing QR code:", e);
            setError("QR code ilegível. Por favor, tente escanear novamente.");
            setShowScanner(false);
        }
    };
    
    const handleRentAnotherClick = () => {
        // Garante que os dados do cliente estão na sessão para o fluxo de "Aluguel Rápido"
        if (rentals.length > 0) {
            const customer = {
                name: rentals[0].customer_name,
                cpf: rentals[0].customer_cpf,
                phone: rentals[0].customer_phone,
            };
            sessionStorage.setItem('lastRentalCustomer', JSON.stringify(customer));
        }
        setError(null);
        setShowScanner(true);
    };


    if (loading) {
        return (
            <div className="text-center p-10">
                <p className="text-lg font-semibold">Carregando seus aluguéis...</p>
            </div>
        );
    }

    if (showScanner) {
        return (
            <QRCodeScanner
                onScanSuccess={handleScanSuccess}
                onCancel={() => {
                    setShowScanner(false);
                    setError(null);
                }}
            />
        );
    }
    
    const customerName = rentals.length > 0 ? rentals[0].customer_name.split(' ')[0] : (JSON.parse(sessionStorage.getItem('lastRentalCustomer') || '{}').name || '').split(' ')[0];

    return (
        <div className="max-w-2xl mx-auto">
             {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6" role="alert">
                    <p className="font-bold">Erro</p>
                    <p>{error}</p>
                </div>
            )}
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border">
                <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2 text-slate-800">Seus Aluguéis</h2>
                <p className="text-center text-slate-500 mb-6">
                    {customerName ? `Olá, ${customerName}!` : 'Acompanhe seus itens aqui.'}
                </p>

                <div className="space-y-4 mb-6">
                    {rentals.length > 0 ? (
                        rentals.map(rental => <ActiveRentalCard key={rental.id} rental={rental} />)
                    ) : (
                        <div className="text-center py-8 px-4 bg-slate-50 rounded-lg">
                            <h3 className="text-xl font-semibold text-slate-700">Nenhum item alugado</h3>
                            <p className="text-slate-500 mt-2">Você não possui aluguéis ativos no momento. Clique abaixo para começar!</p>
                        </div>
                    )}
                </div>
                
                <div className="bg-sky-50 p-4 rounded-lg text-sky-800 flex items-start gap-3 mb-8">
                    <InformationCircleIcon className="w-6 h-6 flex-shrink-0 mt-1"/>
                    <div>
                         <h3 className="font-semibold">Como finalizar o aluguel?</h3>
                         <p className="text-sm">Para encerrar, retorne os itens ao nosso balcão de atendimento. O pagamento será processado no local.</p>
                    </div>
                </div>

                <div>
                    <button
                        onClick={handleRentAnotherClick}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors flex items-center justify-center gap-2"
                    >
                        <QrCodeIcon className="w-6 h-6" />
                        Alugar Outro Item
                    </button>
                </div>

                <div className="text-center mt-6">
                    <Link to="/" className="text-sm text-slate-500 hover:text-slate-700 hover:underline">
                        Voltar para a Página Inicial
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default TrackingPage;