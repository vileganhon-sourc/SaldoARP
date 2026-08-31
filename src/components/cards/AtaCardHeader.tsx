import React from 'react';
import type { ArpRecord, AdesaoStatusType } from '../../types';
import { AdesaoStatusBadge } from './AdesaoStatusBadge';

interface AtaCardHeaderProps {
  arp: ArpRecord;
  fornecedorNome: string;
  fornecedorCnpj?: string;
  adesaoStatus: AdesaoStatusType;
}

export const AtaCardHeader: React.FC<AtaCardHeaderProps> = ({
  arp,
  fornecedorNome,
  fornecedorCnpj,
  adesaoStatus
}) => {
  // Format: "ATA 00017/2026"
  const rawNum = arp.numeroAtaRegistroPreco || '';
  const ataDisplay = rawNum.toUpperCase().startsWith('ATA') 
    ? rawNum.toUpperCase() 
    : `ATA ${rawNum}`;

  return (
    <header className="ata-card-header">
      <div className="ata-card-header-left">
        <h3 className="ata-card-number">{ataDisplay}</h3>
        <p className="ata-card-supplier" title={fornecedorCnpj ? `${fornecedorNome} (${fornecedorCnpj})` : fornecedorNome}>
          {fornecedorNome}
        </p>
      </div>

      <div className="ata-card-header-right">
        <AdesaoStatusBadge status={adesaoStatus} />
      </div>
    </header>
  );
};
