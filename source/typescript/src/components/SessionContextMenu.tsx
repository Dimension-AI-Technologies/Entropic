import React, { useEffect } from 'react';

interface Props {
  x: number;
  y: number;
  onCopyId: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  sessionId?: string;
  isSelected?: boolean;
  onEnsureSelected?: () => void;
}

export function SessionContextMenu({ x, y, onCopyId, onDelete, onClose, sessionId, isSelected, onEnsureSelected }: Props) {
  useEffect(() => {
    if (!isSelected && onEnsureSelected) {
      onEnsureSelected();
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div>
      {/* Backdrop for click-to-close */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 999 }}
        onClick={onClose}
      />
      <div className="context-menu" style={{ left: x, top: y, position: 'fixed', zIndex: 1000 }} onClick={(e) => e.stopPropagation()}>
        <div className="context-menu-item" onClick={() => { onCopyId(); onClose?.(); }}>
          Copy Session ID
        </div>
        {onDelete && (
          <div className="context-menu-item" onClick={() => { onDelete(); onClose?.(); }}>
            Delete Session
          </div>
        )}
      </div>
    </div>
  );
}
