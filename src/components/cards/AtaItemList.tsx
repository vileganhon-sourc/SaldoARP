import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ArpItemRecord } from '../../types';
import { AtaItemRow } from './AtaItemRow';

interface AtaItemListProps {
  itens: ArpItemRecord[];
  onSelectItem: (item: ArpItemRecord) => void;
  isLoading?: boolean;
}

export const AtaItemList: React.FC<AtaItemListProps> = ({
  itens,
  onSelectItem,
  isLoading = false
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (isLoading) {
    return (
      <div className="ata-item-list-loading" aria-live="polite">
        <div className="ata-item-skeleton-row" />
        <div className="ata-item-skeleton-row" />
      </div>
    );
  }

  if (!itens || itens.length === 0) {
    return (
      <div className="ata-item-list-empty" role="status">
        <p className="ata-item-empty-text">Nenhum item disponível</p>
      </div>
    );
  }

  const totalItems = itens.length;
  const hasMoreThanThree = totalItems > 3;
  const visibleItems = isExpanded || !hasMoreThanThree ? itens : itens.slice(0, 3);

  return (
    <div className="ata-item-list-container">
      {/* Column Headers */}
      <div className="ata-item-list-header" aria-hidden="true">
        <span className="ata-col-header ata-col-itens">ITENS</span>
        <span className="ata-col-header ata-col-valor">VALOR UNITÁRIO</span>
      </div>

      {/* Item Rows */}
      <div className="ata-item-list-rows" role="list">
        {visibleItems.map((item, idx) => (
          <AtaItemRow
            key={`item-${item.numeroItem || idx}-${item.codigoItem || idx}`}
            item={item}
            onClick={() => onSelectItem(item)}
          />
        ))}
      </div>

      {/* Expand / Collapse Action */}
      {hasMoreThanThree && (
        <div className="ata-item-list-footer">
          <button
            type="button"
            className="ata-expand-button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Mostrar menos itens' : `Ver todos os ${totalItems} itens da Ata`}
          >
            <span>{isExpanded ? 'Mostrar menos' : `Ver todos os ${totalItems} itens`}</span>
            {isExpanded ? (
              <ChevronUp size={15} aria-hidden="true" />
            ) : (
              <ChevronDown size={15} aria-hidden="true" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};
