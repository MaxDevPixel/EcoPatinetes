
import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import RentalForm from '../components/RentalForm';
import { getItemById, checkSupabaseConnection, startRental, supabase } from '../services/supabase';
import type { RentalItem, ActiveRental } from '../types';
import { ItemStatus } from '../types';

type CustomerData = { name: string; cpf: string; phone: string };

// --- Sub-componente para a tela de Aluguel Rápido ---
const QuickRental: React.FC<{
    item: RentalItem;
    customer: CustomerData;
    onSuccess: (customer: CustomerData, newRental: ActiveRental) => void;
    onUseOtherData: () => void;
}> = ({ item, customer, onSuccess, onUseOtherData }) => {
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleConfirm = async () => {
        setLoading(true);
        setError(null);
        try {
            const rentalData = await startRental(item.id, customer);
            if (rentalData && rentalData.length > 0) {
                onSuccess(customer, rentalData[0] as ActiveRental);
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
        <div className="max-w-lg mx-auto bg-white p-8 rounded-xl shadow-lg text-center">
            <h2 className="text-3xl font-bold text-center mb-2">Aluguel Rápido</h2>
            <p className="text-center text-slate-600 mb-6">
                Olá, <span className="font-bold">{customer.name.split(' ')[0]}</span>!
            </p>

            <div className="bg-slate-100 p-4 rounded-lg mb-6 space-y-2 text-left">
                <p><strong>Você está alugando:</strong></p>
                <p className="text-xl font-bold text-indigo-600">{item.type} #{item.id_visual}</p>
            </div>
            
            {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4">{error}</p>}
            
            <p className="text-center text-slate-600 mb-6">Deseja confirmar este aluguel com os dados salvos?</p>

            <div className="flex flex-col gap-3">
                <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors disabled:bg-indigo-300"
                >
                    {loading ? 'Confirmando...' : 'Sim, confirmar aluguel'}
                </button>
                <button
                    onClick={onUseOtherData}
                    disabled={loading}
                    className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                    Não, usar outros dados
                </button>
                <Link to="/" className="text-sm text-slate-500 hover:text-slate-700 mt-2">
                    Cancelar
                </Link>
            </div>
        </div>
    );
};


type ViewState = 'loading' | 'form' | 'quick_rental' | 'error';

const RentalPage: React.FC = () => {
    const { itemId } = useParams<{ itemId: string }>();
    const navigate = useNavigate();
    const [view, setView] = React.useState<ViewState>('loading');
    const [item, setItem] = React.useState<RentalItem | null>(null);
    const [customerData, setCustomerData] = React.useState<CustomerData | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [supabaseStatus] = React.useState(checkSupabaseConnection());

    React.useEffect(() => {
        let channel: any = null;

        const initialize = async () => {
            setView('loading');
            if (!itemId) {
                setError('ID do item não encontrado na URL.');
                setView('error');
                return;
            }
            if (!supabaseStatus.isConnected) {
                setError(supabaseStatus.message);
                setView('error');
                return;
            }

            try {
                const fetchedItem = await getItemById(parseInt(itemId, 10));

                if (!fetchedItem) {
                    setError('Item não encontrado. Por favor, escaneie um QR code válido.');
                    setView('error');
                    return;
                }
                
                if (fetchedItem.status === ItemStatus.Rented) {
                    const storedCustomer = sessionStorage.getItem('lastRentalCustomer');
                    if (storedCustomer) {
                        sessionStorage.removeItem('lastRentalCustomer');
                    }
                    setError('Este item já está alugado.');
                    setView('error');
                    return;
                }
                
                setItem(fetchedItem);

                // Otimização: Escuta em tempo real por mudanças no status do item.
                // Se o item for alugado enquanto o cliente preenche o formulário,
                // a UI é atualizada instantaneamente para evitar um erro na submissão.
                channel = supabase
                    .channel(`item-status-check-${itemId}`)
                    .on<RentalItem>(
                        'postgres_changes',
                        { event: 'UPDATE', schema: 'public', table: 'items', filter: `id=eq.${itemId}` },
                        (payload) => {
                            if (payload.new && payload.new.status === ItemStatus.Rented) {
                                setError('Ops! Alguém foi mais rápido. Este item acabou de ser alugado. Por favor, escaneie outro item.');
                                setView('error');
                                if (sessionStorage.getItem('lastRentalCustomer')) {
                                    sessionStorage.removeItem('lastRentalCustomer');
                                }
                            }
                        }
                    )
                    .subscribe();

                const storedCustomer = sessionStorage.getItem('lastRentalCustomer');
                if (storedCustomer) {
                    setCustomerData(JSON.parse(storedCustomer));
                    setView('quick_rental');
                } else {
                    setView('form');
                }

            } catch (e) {
                setError('Falha ao carregar os detalhes do item. Por favor, tente novamente.');
                console.error(e);
                setView('error');
            }
        };

        initialize();

        // Limpa a inscrição do canal ao desmontar o componente para evitar vazamentos de memória.
        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [itemId, supabaseStatus]);

    const handleSuccess = (customer: CustomerData, newRental: ActiveRental) => {
        sessionStorage.setItem('lastRentalCustomer', JSON.stringify(customer));
        navigate(`/track/user/${encodeURIComponent(customer.cpf)}`);
    };

    const handleUseOtherData = () => {
        sessionStorage.removeItem('lastRentalCustomer');
        setCustomerData(null);
        setView('form');
    };

    const renderContent = () => {
        switch (view) {
            case 'loading':
                return (
                    <div className="text-center p-10">
                        <p className="text-lg font-semibold">Carregando detalhes do item...</p>
                    </div>
                );
            case 'error':
                return (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
                        <p className="font-bold">Erro</p>
                        <p>{error}</p>
                    </div>
                );
            case 'form':
                if (item) {
                    return <RentalForm item={item} onSuccess={handleSuccess} />;
                }
                return null;
            case 'quick_rental':
                if (item && customerData) {
                    return <QuickRental item={item} customer={customerData} onSuccess={handleSuccess} onUseOtherData={handleUseOtherData} />;
                }
                return null;
            default:
                return null;
        }
    };
    
    return renderContent();
};

export default RentalPage;
