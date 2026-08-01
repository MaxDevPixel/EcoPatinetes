import React, { useState, useEffect, useRef } from 'react';
import type { CombinedItem } from '../types';
import { ItemStatus } from '../types';
import Modal from './Modal';
import { endRental, updateItemPrice, deleteItem, pauseRental, resumeRental } from '../services/supabase';
import { ClockIcon, CurrencyDollarIcon, PencilIcon } from '@heroicons/react/24/outline';
import { QrCodeIcon, TrashIcon, PlayIcon, PauseIcon, RocketLaunchIcon } from '@heroicons/react/24/solid';
import RentalForm from './RentalForm';

// @ts-ignore
declare var QRCode: any;

const QRCodeGenerator: React.FC<{ text: string }> = ({ text }) => {
    const qrRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (qrRef.current) {
            qrRef.current.innerHTML = ''; // Clear previous QR code
            new QRCode(qrRef.current, {
                text: text,
                width: 256,
                height: 256,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        }
    }, [text]);

    const downloadQRCode = () => {
        const canvas = qrRef.current?.querySelector('canvas');
        if (canvas) {
            const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
            let downloadLink = document.createElement("a");
            downloadLink.href = pngUrl;
            downloadLink.download = `qrcode-item-${text.split('/').pop()}.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }
    };

    return (
        <div className="flex flex-col items-center">
            <div ref={qrRef} className="p-4 bg-white border rounded-lg"></div>
            <button onClick={downloadQRCode} className="mt-4 bg-teal-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-teal-600 transition-colors">
                Baixar QR Code
            </button>
        </div>
    );
};

const EndRentalConfirmationModal: React.FC<{
    item: CombinedItem;
    rentalInfo: { cost: number; duration: string };
    onClose: () => void;
    onConfirm: () => Promise<void>;
}> = ({ item, rentalInfo, onClose, onConfirm }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleConfirm = async () => {
        setLoading(true);
        setError('');
        try {
            await onConfirm();
        } catch (err: any) {
            setError(err.message || 'Falha ao encerrar o aluguel. Por favor, tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h3 className="text-2xl font-bold text-center mb-4">Confirmar Encerramento</h3>
            <div className="bg-slate-100 p-4 rounded-lg mb-6 space-y-2 text-left">
                <p><strong>Item:</strong> {item.type} #{item.id_visual}</p>
                <p><strong>Duração Total:</strong> {rentalInfo.duration}</p>
                <p className="text-xl font-bold mt-2"><strong>Custo Final:</strong> R$ {rentalInfo.cost.toFixed(2)}</p>
            </div>
            {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-center">{error}</p>}
            <p className="text-center text-slate-600 mb-6">Deseja finalizar o aluguel com este custo?</p>
            <div className="flex justify-center gap-4">
                <button type="button" onClick={onClose} disabled={loading} className="py-2 px-6 bg-slate-200 text-slate-800 font-semibold rounded-md hover:bg-slate-300 disabled:opacity-50">
                    Cancelar
                </button>
                <button type="button" onClick={handleConfirm} disabled={loading} className="py-2 px-6 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-green-300">
                    {loading ? 'Finalizando...' : 'Confirmar e Finalizar'}
                </button>
            </div>
        </div>
    );
};

const RentalDetailsModal: React.FC<{ item: CombinedItem, onClose: () => void, onInitiateEndRental: (cost: number, duration: string) => void, onRefresh: () => void }> = ({ item, onClose, onInitiateEndRental, onRefresh }) => {
    const [duration, setDuration] = useState('00:00:00');
    const [cost, setCost] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const rental = item.activeRental;
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!rental) return;

        const calculateValues = () => {
            const startTime = new Date(rental.start_time).getTime();
            const totalPausedMs = (rental.total_paused_duration_seconds || 0) * 1000;

            let activeMs = 0;
            if (rental.paused_at) {
                const pausedAtTime = new Date(rental.paused_at).getTime();
                activeMs = (pausedAtTime - startTime) - totalPausedMs;
            } else {
                const now = new Date().getTime();
                activeMs = (now - startTime) - totalPausedMs;
            }
            
            activeMs = Math.max(0, activeMs);

            const totalMinutes = activeMs / 60000;
            const currentCost = totalMinutes * item.price_per_minute;
            setCost(currentCost);

            const hours = Math.floor(activeMs / 3600000);
            const remainingMinutes = Math.floor((activeMs % 3600000) / 60000);
            const seconds = Math.floor((activeMs % 60000) / 1000);
            setDuration(`${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
        };

        calculateValues();

        if (!rental.paused_at) {
            intervalRef.current = setInterval(calculateValues, 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [rental, item.price_per_minute]);

    const handleEndRentalClick = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        onInitiateEndRental(cost, duration);
    };

    const handlePause = async () => {
        if (!rental) return;
        setLoading(true);
        setError('');
        try {
            await pauseRental(rental.id);
            onRefresh();
        } catch (err: any) {
            setError(err.message || 'Falha ao pausar o aluguel.');
            console.error('Pause rental failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleResume = async () => {
        if (!rental || !rental.paused_at) return;
        setLoading(true);
        setError('');
        try {
            await resumeRental(rental.id, rental.paused_at, rental.total_paused_duration_seconds);
            onRefresh();
        } catch (err: any) {
            setError(err.message || 'Falha ao retomar o aluguel.');
            console.error('Resume rental failed:', err);
        } finally {
            setLoading(false);
        }
    };


    if (!rental) return null;

    const isPaused = !!rental.paused_at;

    return (
        <div>
            <h3 className="text-xl font-semibold mb-4">Detalhes do Aluguel (Item #{item.id_visual})</h3>
            {error && <p className="bg-red-100 text-red-700 p-2 rounded mb-4">{error}</p>}
            <div className="space-y-3 mb-6">
                <p><strong>Cliente:</strong> {rental.customer_name}</p>
                <p><strong>CPF:</strong> {rental.customer_cpf}</p>
                <p><strong>Telefone:</strong> {rental.customer_phone}</p>
                <p><strong>Hora de Início:</strong> {new Date(rental.start_time).toLocaleString()}</p>
                <div className="flex items-center gap-2 font-mono text-lg p-3 bg-slate-100 rounded-md">
                    <ClockIcon className="w-6 h-6 text-slate-500"/>
                    <span>Duração Ativa: {duration}</span>
                </div>
                {isPaused && (
                    <div className="flex items-center gap-2 font-mono text-sm p-2 bg-yellow-100 rounded-md text-yellow-800">
                        <PauseIcon className="w-5 h-5"/>
                        <span>Pausado</span>
                    </div>
                )}
                <div className="flex items-center gap-2 font-mono text-lg p-3 bg-green-100 rounded-md">
                    <CurrencyDollarIcon className="w-6 h-6 text-green-600"/>
                    <span>Custo Atual: R$ {cost.toFixed(2)}</span>
                </div>
            </div>
            <div className="flex justify-between items-center">
                <div>
                    {isPaused ? (
                        <button onClick={handleResume} disabled={loading} className="py-2 px-6 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:bg-green-300">
                            <PlayIcon className="w-5 h-5" />
                            {loading ? 'Retomando...' : 'Retomar'}
                        </button>
                    ) : (
                        <button onClick={handlePause} disabled={loading} className="py-2 px-6 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600 flex items-center gap-2 disabled:bg-yellow-300">
                            <PauseIcon className="w-5 h-5" />
                            {loading ? 'Pausando...' : 'Pausar'}
                        </button>
                    )}
                </div>
                <button 
                    onClick={handleEndRentalClick} 
                    className="py-2 px-6 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
                    disabled={isPaused}
                    title={isPaused ? "Retome o aluguel para poder encerrá-lo" : ""}
                >
                    Encerrar Aluguel
                </button>
            </div>
        </div>
    );
}

const EditItemModal: React.FC<{ item: CombinedItem, onClose: () => void, onRefresh: () => void }> = ({ item, onClose, onRefresh }) => {
    const [price, setPrice] = useState(item.price_per_minute.toFixed(2));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum <= 0) {
            setError('Por favor, insira um preço válido e positivo.');
            return;
        }
        setLoading(true);
        try {
            await updateItemPrice(item.id, priceNum);
            onRefresh();
            onClose();
        } catch (err) {
            setError('Falha ao atualizar o preço. Por favor, tente novamente.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <h3 className="text-xl font-semibold mb-4">Editar Preço do Item #{item.id_visual}</h3>
            {error && <p className="bg-red-100 text-red-700 p-2 rounded mb-4">{error}</p>}
            <div className="mb-6">
                <label htmlFor="price" className="block text-sm font-medium text-slate-700 mb-1">Preço por Minuto (R$)</label>
                <input 
                    type="number" 
                    id="price" 
                    value={price} 
                    onChange={e => setPrice(e.target.value)} 
                    step="0.01" 
                    min="0.01" 
                    placeholder="ex: 1.50" 
                    className="w-full p-2 border bg-white text-slate-900 placeholder:text-slate-400 border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" 
                    required 
                />
            </div>
            <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="py-2 px-4 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300">Cancelar</button>
                <button type="submit" disabled={loading} className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300">
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>
        </form>
    );
};

const DeleteConfirmationModal: React.FC<{ item: CombinedItem, onClose: () => void, onConfirm: () => Promise<void> }> = ({ item, onClose, onConfirm }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleDelete = async () => {
        setLoading(true);
        setError('');
        try {
            await onConfirm();
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro inesperado.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <h3 className="text-xl font-semibold mb-2 text-center">Confirmar Exclusão</h3>
            <p className="text-center text-slate-600 mb-6">Você deseja realmente excluir o item <span className="font-bold">{item.type} #{item.id_visual}</span>?</p>
            {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-center">{error}</p>}
            <div className="flex justify-center gap-4">
                 <button type="button" onClick={onClose} disabled={loading} className="py-2 px-6 bg-slate-200 text-slate-800 font-semibold rounded-md hover:bg-slate-300 disabled:opacity-50">
                    Cancelar
                </button>
                <button type="button" onClick={handleDelete} disabled={loading} className="py-2 px-6 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:bg-red-300">
                    {loading ? 'Excluindo...' : 'Excluir'}
                </button>
            </div>
        </div>
    );
}


const ItemCard: React.FC<{ item: CombinedItem, onRefresh: () => void }> = ({ item, onRefresh }) => {
    const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
    const [isQrModalOpen, setQrModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [isRentalModalOpen, setRentalModalOpen] = useState(false);
    const [isConfirmEndRentalModalOpen, setConfirmEndRentalModalOpen] = useState(false);
    const [finalRentalInfo, setFinalRentalInfo] = useState<{cost: number, duration: string} | null>(null);

    const isRented = item.status === ItemStatus.Rented;
    const rentalUrl = `${window.location.origin}${window.location.pathname}#/rent/${item.id}`;

    const handleDeleteItem = async () => {
        await deleteItem(item.id);
        onRefresh();
        setDeleteModalOpen(false);
    };

    const handleInitiateEndRental = (cost: number, duration: string) => {
        setFinalRentalInfo({ cost, duration });
        setDetailsModalOpen(false);
        setConfirmEndRentalModalOpen(true);
    };

    const handleConfirmEndRental = async () => {
        if (!item.activeRental || !finalRentalInfo) {
            throw new Error("Dados do aluguel não encontrados para finalização.");
        }
        await endRental(item.activeRental.id, item.id, finalRentalInfo.cost);
        onRefresh();
        setConfirmEndRentalModalOpen(false);
        setFinalRentalInfo(null);
    };

    const closeConfirmModal = () => {
        setConfirmEndRentalModalOpen(false);
        setFinalRentalInfo(null);
    }

    return (
        <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden flex flex-col">
            <div className={`p-4 ${isRented ? (item.activeRental?.paused_at ? 'bg-yellow-100' : 'bg-red-100') : 'bg-green-100'}`}>
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold">
                        {item.type} #{item.id_visual}
                    </h3>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${isRented ? (item.activeRental?.paused_at ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white') : 'bg-green-500 text-white'}`}>
                        {isRented ? (item.activeRental?.paused_at ? 'Pausado' : 'Alugado') : 'Disponível'}
                    </span>
                </div>
            </div>
            <div className="p-4 flex-grow">
                <div 
                    onClick={() => !isRented && setEditModalOpen(true)}
                    className={`group text-slate-600 ${!isRented ? 'cursor-pointer' : 'cursor-default'}`}
                    role={!isRented ? 'button' : undefined}
                    aria-label={!isRented ? 'Editar preço' : undefined}
                    tabIndex={!isRented ? 0 : -1}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !isRented) setEditModalOpen(true); }}
                >
                    Preço: <span className={`font-semibold ${!isRented ? 'group-hover:text-blue-600 transition-colors' : ''}`}>
                        R$ {item.price_per_minute.toFixed(2)}
                    </span> / minuto
                    {!isRented && <PencilIcon className="w-4 h-4 inline-block ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </div>

                {isRented && item.activeRental && (
                    <div className="mt-4 bg-slate-50 p-3 rounded-md border">
                        <p className="text-sm font-semibold">Alugado por:</p>
                        <p className="text-sm text-slate-700">{item.activeRental.customer_name}</p>
                        <p className="text-xs text-slate-500">Desde: {new Date(item.activeRental.start_time).toLocaleTimeString()}</p>
                    </div>
                )}
            </div>
            <div className="p-4 bg-slate-50 border-t flex gap-2">
                <button 
                    onClick={() => setQrModalOpen(true)}
                    className={`${isRented ? 'flex-1' : 'flex-none'} bg-gray-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2`}
                    title="Ver QR Code"
                >
                    <QrCodeIcon className="w-5 h-5"/>
                </button>
                {isRented ? (
                    <button 
                        onClick={() => setDetailsModalOpen(true)}
                        className="flex-1 bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors"
                    >
                        Ver Detalhes
                    </button>
                ) : (
                    <>
                        <button 
                            onClick={() => setRentalModalOpen(true)}
                            className="flex-1 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <RocketLaunchIcon className="w-5 h-5"/>
                            Alugar
                        </button>
                        <button
                            onClick={() => setDeleteModalOpen(true)}
                            className="bg-red-500 text-white p-3 rounded-lg hover:bg-red-600 transition-colors flex-shrink-0"
                            aria-label={`Excluir ${item.type} #${item.id_visual}`}
                        >
                            <TrashIcon className="w-5 h-5"/>
                        </button>
                    </>
                )}
            </div>

            {isRented && (
                 <Modal isOpen={isDetailsModalOpen} onClose={() => setDetailsModalOpen(false)}>
                    <RentalDetailsModal item={item} onClose={() => setDetailsModalOpen(false)} onInitiateEndRental={handleInitiateEndRental} onRefresh={onRefresh} />
                </Modal>
            )}

            {isRented && finalRentalInfo && (
                <Modal isOpen={isConfirmEndRentalModalOpen} onClose={closeConfirmModal}>
                    <EndRentalConfirmationModal
                        item={item}
                        rentalInfo={finalRentalInfo}
                        onClose={closeConfirmModal}
                        onConfirm={handleConfirmEndRental}
                    />
                </Modal>
            )}
           
            <Modal isOpen={isQrModalOpen} onClose={() => setQrModalOpen(false)}>
                <h3 className="text-xl font-semibold mb-2 text-center">QR Code para {item.type} #{item.id_visual}</h3>
                <p className="text-center text-slate-500 mb-4 break-all text-xs">{rentalUrl}</p>
                <QRCodeGenerator text={rentalUrl} />
            </Modal>
            
            <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)}>
                <EditItemModal item={item} onClose={() => setEditModalOpen(false)} onRefresh={onRefresh} />
            </Modal>

            <Modal isOpen={isRentalModalOpen} onClose={() => setRentalModalOpen(false)}>
                <div className="-m-6">
                    <RentalForm 
                        item={item} 
                        onSuccess={() => {
                            setRentalModalOpen(false);
                            onRefresh();
                        }} 
                    />
                </div>
            </Modal>

            <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
                <DeleteConfirmationModal item={item} onClose={() => setDeleteModalOpen(false)} onConfirm={handleDeleteItem} />
            </Modal>
        </div>
    );
};

export default ItemCard;