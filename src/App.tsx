import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Dashboard } from './pages/Dashboard';
import { SimplexPage } from './pages/SimplexPage';
import { FormulacionPage } from './pages/FormulacionPage';
import { GraficoPage } from './pages/GraficoPage';
import { DualidadPage } from './pages/DualidadPage';
import { SensibilidadPage } from './pages/SensibilidadPage';
import { TransportePage } from './pages/TransportePage';
import { AsignacionPage } from './pages/AsignacionPage';
import { HungaroPage } from './pages/HungaroPage';
import { FlujoMaximoPage } from './pages/FlujoMaximoPage';
import { FlujoCostoMinPage } from './pages/FlujoCostoMinPage';
import { ArbolMinimoPage } from './pages/ArbolMinimoPage';
import { PertCpmPage } from './pages/PertCpmPage';
import { DinamicaPage } from './pages/DinamicaPage';
import { EnteraPage } from './pages/EnteraPage';
import { NoLinealPage } from './pages/NoLinealPage';
import { ColasPage } from './pages/ColasPage';
import { NotFoundPage } from './pages/status/NotFoundPage';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/unidad1/formulacion" element={<FormulacionPage />} />
          <Route path="/unidad1/grafico" element={<GraficoPage />} />
          <Route path="/unidad1/simplex" element={<SimplexPage />} />
          <Route path="/unidad1/dualidad" element={<DualidadPage />} />
          <Route path="/unidad1/sensibilidad" element={<SensibilidadPage />} />
          <Route path="/unidad1/simplex-revisado" element={<Navigate to="/unidad1/simplex?method=revisado" replace />} />
          <Route path="/unidad2/transporte" element={<TransportePage />} />
          <Route path="/unidad2/asignacion" element={<AsignacionPage />} />
          <Route path="/unidad2/hungaro" element={<HungaroPage />} />
          <Route path="/unidad2/flujo" element={<FlujoMaximoPage />} />
          <Route path="/unidad2/costo-min" element={<FlujoCostoMinPage />} />
          <Route path="/unidad2/arbol" element={<ArbolMinimoPage />} />
          <Route path="/unidad2/pert-cpm" element={<PertCpmPage />} />
          <Route path="/unidad3/dinamica" element={<DinamicaPage />} />
          <Route path="/unidad3/entera" element={<EnteraPage />} />
          <Route path="/unidad3/no-lineal" element={<NoLinealPage />} />
          <Route path="/unidad3/colas" element={<ColasPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
