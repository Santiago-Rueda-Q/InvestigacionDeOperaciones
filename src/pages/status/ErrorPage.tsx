import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { StatusScreen } from './StatusScreen';

interface Props {
  error?: Error | null;
  onRetry?: () => void;
  title?: string;
  description?: string;
}

export const ErrorPage: React.FC<Props> = ({
  error,
  onRetry,
  title = 'Algo salió mal',
  description = 'Error inesperado al mostrar esta vista. Puedes reintentar o volver al panel.',
}) => (
  <StatusScreen
    tone="rose"
    badge="Error de aplicación"
    code="Error"
    icon={AlertTriangle}
    title={title}
    description={description}
    pathHint={error ? `${error.name}: ${error.message}` : undefined}
    meta={error ? 'Detalle técnico del fallo' : undefined}
    actions={[
      ...(onRetry ? [{ label: 'Reintentar', onClick: onRetry, primary: true as const }] : []),
      { label: 'Volver al panel', to: '/', primary: !onRetry },
    ]}
  />
);
