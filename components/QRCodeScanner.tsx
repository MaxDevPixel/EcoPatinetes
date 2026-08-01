import React, { useEffect, useRef } from 'react';

// @ts-ignore - html5-qrcode é carregado a partir de uma tag de script
const Html5Qrcode = window.Html5Qrcode;

interface QRCodeScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onCancel: () => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScanSuccess, onCancel }) => {
    const scannerRef = useRef<any>(null); // Usando 'any' para contornar problemas de tipo com a biblioteca carregada globalmente
    const readerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!readerRef.current) return;
        
        // Garante que o ID é único para evitar conflitos se o componente for remontado
        const readerId = `qr-reader-${Math.random().toString(36).substr(2, 9)}`;
        readerRef.current.id = readerId;

        const html5QrcodeScanner = new Html5Qrcode(readerId);
        scannerRef.current = html5QrcodeScanner;

        const startScanner = async () => {
            try {
                await html5QrcodeScanner.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 }
                    },
                    (decodedText: string, decodedResult: any) => {
                        // sucesso
                        onScanSuccess(decodedText);
                    },
                    (errorMessage: string) => {
                        // erro de parse, ignorar.
                    }
                );
            } catch (err) {
                console.error("Não foi possível iniciar a digitalização.", err);
                // TODO: Lidar com erro de permissão de câmera negada
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch((err: any) => console.error("Falha ao parar o scanner na limpeza", err));
            }
        };
    }, [onScanSuccess]);

    return (
        <div className="max-w-lg mx-auto bg-white p-8 rounded-xl shadow-lg text-center">
            <h2 className="text-2xl font-bold mb-4">Escanear QR Code</h2>
            <p className="text-slate-600 mb-4">Aponte a câmera para o QR code do próximo item.</p>
            <div ref={readerRef} style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}></div>
            <button
                onClick={() => {
                     if (scannerRef.current && scannerRef.current.isScanning) {
                        scannerRef.current.stop().catch((err: any) => console.error("Falha ao parar o scanner no cancelamento", err));
                    }
                    onCancel();
                }}
                className="mt-6 w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-3 px-4 rounded-lg transition-colors"
            >
                Cancelar
            </button>
        </div>
    );
};

export default QRCodeScanner;