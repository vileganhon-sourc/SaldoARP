import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { ArpItemRecord } from '../../types';
import { formatCurrencyBRL, formatItemNumber } from '../../utils/ataGrouping';

interface AtaItemRowProps {
  item: ArpItemRecord;
  onClick: () => void;
}

export const AtaItemRow: React.FC<AtaItemRowProps> = ({ item, onClick }) => {
  const itemFormattedNumber = formatItemNumber(item.numeroItem);
  const formattedPrice = formatCurrencyBRL(item.valorUnitario);
  const description = item.descricaoItem || 'Item sem descrição detalhada informada';

  return (
    <button
      type="button"
      className="ata-item-row"
      onClick={onClick}
      aria-label={`Ver detalhes do Item ${itemFormattedNumber} - ${description}. Valor unitário: ${formattedPrice}`}
      title={`Item ${itemFormattedNumber}: ${description} (${formattedPrice})`}
    >
      <div className="ata-item-left">
        <span className="ata-item-number">{itemFormattedNumber}</span>
        <span className="ata-item-separator" aria-hidden="true">·</span>
        <span className="ata-item-desc">{description}</span>
      </div>

      <div className="ata-item-right">
        <span className="ata-item-price">{formattedPrice}</span>
        <ChevronRight size={16} className="ata-item-chevron" aria-hidden="true" />
      </div>
    </button>
  );
};
