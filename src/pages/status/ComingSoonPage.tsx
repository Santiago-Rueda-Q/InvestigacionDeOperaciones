import React from 'react';
import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { StatusScreen } from './StatusScreen';
import { matchPlanned } from './plannedRoutes';

export const ComingSoonPage: React.FC = () => {
  const { pathname } = useLocation();
  const planned = matchPlanned(pathname);

  const tip =
    planned?.label === 'Simplex Revisado'
      ? 'Tip: ya está dentro de Método Simplex'
      : planned?.note ?? 'Disponible próximamente';

  return (
    <StatusScreen
      tone="amber"
      badge={planned?.unit ?? 'Módulo pendiente'}
      icon={Construction}
      title={planned ? planned.label : 'Módulo en construcción'}
      description={
        planned
          ? 'Este tema está en el temario, pero la vista interactiva aún no está lista. Usa los módulos disponibles del panel.'
          : 'Este módulo se está preparando. Pronto podrás resolver ejercicios paso a paso aquí.'
      }
      pathHint={pathname}
      meta={tip}
      actions={[
        { label: 'Ir al panel', to: '/', primary: true },
        { label: 'Simplex', to: '/unidad1/simplex' },
        { label: 'Transporte', to: '/unidad2/transporte' },
      ]}
    />
  );
};
