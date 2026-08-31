import React from 'react';

export const AtaCardSkeleton: React.FC = () => {
  return (
    <div className="ata-card ata-card-skeleton" aria-hidden="true">
      <div className="ata-card-header">
        <div className="ata-card-header-left">
          <div className="skeleton-box skeleton-title" />
          <div className="skeleton-box skeleton-subtitle" />
        </div>
        <div className="ata-card-header-right">
          <div className="skeleton-box skeleton-badge" />
        </div>
      </div>

      <div className="ata-item-list-container">
        <div className="ata-item-list-header">
          <div className="skeleton-box skeleton-label-left" />
          <div className="skeleton-box skeleton-label-right" />
        </div>
        <div className="ata-item-list-rows">
          <div className="ata-item-skeleton-row">
            <div className="skeleton-box skeleton-item-text" />
            <div className="skeleton-box skeleton-item-price" />
          </div>
          <div className="ata-item-skeleton-row">
            <div className="skeleton-box skeleton-item-text" style={{ width: '65%' }} />
            <div className="skeleton-box skeleton-item-price" />
          </div>
          <div className="ata-item-skeleton-row">
            <div className="skeleton-box skeleton-item-text" style={{ width: '50%' }} />
            <div className="skeleton-box skeleton-item-price" />
          </div>
        </div>
      </div>
    </div>
  );
};
