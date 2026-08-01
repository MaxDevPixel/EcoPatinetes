
import React from 'react';
import { MemoryRouter, HashRouter, Routes, Route, Link } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import RentalPage from './pages/RentalPage';
import HomePage from './pages/HomePage';
import TrackingPage from './pages/TrackingPage';
import { AuthProvider } from './hooks/useAuth';

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <div className="min-h-screen flex flex-col">
          <header className="bg-white shadow-md">
            <nav className="container mx-auto px-6 py-4">
              <Link to="/" className="text-2xl font-bold text-slate-800 hover:text-teal-600 transition-colors">
                Eco Rent
              </Link>
            </nav>
          </header>
          <main className="flex-grow container mx-auto p-4 md:p-6">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/rent/:itemId" element={<RentalPage />} />
              <Route path="/track/user/:customerCpf" element={<TrackingPage />} />
            </Routes>
          </main>
          <footer className="bg-slate-800 text-white text-center p-4 mt-8">
            <p>@Criado por Max Oliveira (94) 9 9969-7321</p>
          </footer>
        </div>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
