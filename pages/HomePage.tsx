import React from 'react';
import { Link } from 'react-router-dom';
import { QrCodeIcon, UserIcon } from '@heroicons/react/24/outline';

const HomePage: React.FC = () => {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-4">Bem-vindo à Eco Mobilidade</h1>
      <p className="text-lg text-slate-600 mb-12 max-w-2xl mx-auto">
        Sua solução completa para alugar patinetes elétricos e pelúcias. Comece abaixo!
      </p>
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <div className="bg-white p-8 rounded-lg shadow-lg border border-slate-200 flex flex-col items-center">
          <QrCodeIcon className="w-16 h-16 text-teal-500 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Você é um cliente?</h2>
          <p className="text-slate-500 text-center">
            Para alugar um item, encontre um disponível e escaneie o QR code nele com a câmera do seu celular. Você será direcionado para um formulário de aluguel rápido.
          </p>
        </div>
        <div className="bg-white p-8 rounded-lg shadow-lg border border-slate-200 flex flex-col items-center">
          <UserIcon className="w-16 h-16 text-indigo-500 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Você é um administrador?</h2>
          <p className="text-slate-500 mb-6 text-center">
            Faça login para acessar o painel de administração para gerenciar itens, visualizar aluguéis ativos e gerar QR codes.
          </p>
          <Link
            to="/admin"
            className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-all duration-300 text-center"
          >
            Ir para o Painel Admin
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;