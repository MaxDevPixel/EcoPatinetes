import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const AdminLogin: React.FC = () => {
  const [username, setUsername] = useState('Admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (username !== 'Admin') {
      setError('Nome de usuário inválido.');
      return;
    }
    const success = login(password);
    if (!success) {
      setError('Senha inválida.');
    }
  };

  return (
    <div className="flex items-center justify-center pt-10">
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-xl px-8 pt-6 pb-8 mb-4">
          <h2 className="text-3xl font-bold text-center mb-6 text-slate-700">Login do Administrador</h2>
          {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-center">{error}</p>}
          <div className="mb-4">
            <label className="block text-slate-700 text-sm font-bold mb-2" htmlFor="username">
              Usuário
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-3 px-4 text-slate-500 bg-slate-100 cursor-not-allowed leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuário"
              readOnly
            />
          </div>
          <div className="mb-6">
            <label className="block text-slate-700 text-sm font-bold mb-2" htmlFor="password">
              Senha
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-3 px-4 bg-white text-slate-900 placeholder:text-slate-400 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="******************"
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors"
              type="submit"
            >
              Entrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;