
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAdmin: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'ecoRentAdminAuth';
const AUTH_SESSION_DURATION = 60 * 60 * 1000; // 1 hora em milissegundos

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (storedAuth) {
      try {
        const { timestamp } = JSON.parse(storedAuth);
        const now = new Date().getTime();

        if (now - timestamp < AUTH_SESSION_DURATION) {
          setIsAdmin(true); // A sessão ainda é válida
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY); // A sessão expirou
        }
      } catch (error) {
        console.error("Falha ao analisar dados de autenticação do localStorage", error);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }, []);

  const login = (password: string): boolean => {
    // Em um aplicativo real, isso seria uma chamada para um serviço de backend.
    // Para este exemplo, usamos credenciais fixas, conforme solicitado.
    if (password === 'EcoAdm00') {
      const authData = {
        timestamp: new Date().getTime()
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
