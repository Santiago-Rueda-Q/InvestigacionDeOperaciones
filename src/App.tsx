import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { SimplexPage } from './pages/SimplexPage';

const ComingSoon = () => (
  <div
    className="min-h-screen flex flex-col items-center justify-center text-center px-6"
    style={{ background: 'linear-gradient(135deg, #060810, #0d1020)' }}
  >
    <div className="text-8xl font-black text-transparent bg-clip-text"
      style={{ backgroundImage: 'linear-gradient(90deg, #818cf8, #a78bfa, #38bdf8)' }}
    >
      🚧
    </div>
    <h2 className="text-3xl font-extrabold text-white mt-6 mb-2">Módulo en Construcción</h2>
    <p className="text-white/40 text-lg mb-8">Este módulo estará disponible muy pronto.</p>
    <Link
      to="/"
      className="px-6 py-3 rounded-xl text-white font-bold text-sm transition-all"
      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
    >
      ← Volver al Panel
    </Link>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                   element={<Dashboard />} />
        <Route path="/unidad1/simplex"    element={<SimplexPage />} />
        <Route path="*"                   element={<ComingSoon />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
