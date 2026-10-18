import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Dashboard } from './pages/Dashboard';
import { SimplexPage } from './pages/SimplexPage';
import { TransportePage } from './pages/TransportePage';
import { AsignacionPage } from './pages/AsignacionPage';
import { HungaroPage } from './pages/HungaroPage';
import { FlujoMaximoPage } from './pages/FlujoMaximoPage';
import { FlujoCostoMinPage } from './pages/FlujoCostoMinPage';
import { ComingSoonPage } from './pages/status/ComingSoonPage';
import { NotFoundPage } from './pages/status/NotFoundPage';
import { PLANNED_ROUTES } from './pages/status/plannedRoutes';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/unidad1/simplex" element={<SimplexPage />} />
          <Route path="/unidad2/transporte" element={<TransportePage />} />
          <Route path="/unidad2/asignacion" element={<AsignacionPage />} />
          <Route path="/unidad2/hungaro" element={<HungaroPage />} />
          <Route path="/unidad2/flujo" element={<FlujoMaximoPage />} />
          <Route path="/unidad2/costo-min" element={<FlujoCostoMinPage />} />

          {Object.keys(PLANNED_ROUTES).map(path => (
            <Route key={path} path={path} element={<ComingSoonPage />} />
          ))}

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
