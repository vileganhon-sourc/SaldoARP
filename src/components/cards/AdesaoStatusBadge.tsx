import React from 'react';
import { Check, X, AlertCircle, HelpCircle } from 'lucide-react';
import type { AdesaoStatusType } from '../../types';

interface AdesaoStatusBadgeProps {
  status: AdesaoStatusType;
  className?: string;
}

export const AdesaoStatusBadge: React.FC<AdesaoStatusBadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'ACEITA':
      return (
        <span 
          className={`adesao-status-badge status-aceita ${className}`}
          aria-label="Condição de adesão: Aceita adesão"
        >
          <Check size={14} className="adesao-status-icon" aria-hidden="true" strokeWidth={2.5} />
          <span className="adesao-status-text">Aceita adesão</span>
        </span>
      );

    case 'NAO_ACEITA':
      return (
        <span 
          className={`adesao-status-badge status-nao-aceita ${className}`}
          aria-label="Condição de adesão: Não aceita adesão"
        >
          <X size={14} className="adesao-status-icon" aria-hidden="true" strokeWidth={2.5} />
          <span className="adesao-status-text">Não aceita adesão</span>
        </span>
      );

    case 'VARIAVEL':
      return (
        <span 
          className={`adesao-status-badge status-variavel ${className}`}
          aria-label="Condição de adesão: Adesão varia por item"
        >
          <AlertCircle size={14} className="adesao-status-icon" aria-hidden="true" strokeWidth={2} />
          <span className="adesao-status-text">Adesão varia por item</span>
        </span>
      );

    case 'NAO_INFORMADA':
    default:
      return (
        <span 
          className={`adesao-status-badge status-nao-informada ${className}`}
          aria-label="Condição de adesão: Adesão não informada"
        >
          <HelpCircle size={14} className="adesao-status-icon" aria-hidden="true" strokeWidth={2} />
          <span className="adesao-status-text">Adesão não informada</span>
        </span>
      );
  }
};
