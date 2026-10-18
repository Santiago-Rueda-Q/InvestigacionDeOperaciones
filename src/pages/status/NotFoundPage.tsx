import React from 'react';
import { useLocation } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { StatusScreen } from './StatusScreen';
import { matchPlanned } from './plannedRoutes';
import { ComingSoonPage } from './ComingSoonPage';

export const NotFoundPage: React.FC = () => {
  const { pathname } = useLocation();

  if (matchPlanned(pathname)) {
    return <ComingSoonPage />;
  }

  return (
    <StatusScreen
      tone="indigo"
      badge="Navegación"
      code="404"
      icon={SearchX}
      title="Página no encontrada"
      description="Esa ruta no existe. Revisa el enlace o vuelve al panel para abrir un módulo disponible."
      pathHint={pathname}
      meta="Los temas con “Pronto” aún no tienen vista completa"
      actions={[
        { label: 'Volver al panel', to: '/', primary: true },
        { label: 'Método Simplex', to: '/unidad1/simplex' },
      ]}
    />
  );
};
