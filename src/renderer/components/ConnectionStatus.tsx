import React from 'react';

interface ConnectionStatusProps {
  isCapturing: boolean;
  connectedUsers: number;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isCapturing,
  connectedUsers,
}) => {
  return (
    <div className="connection-status">
      <div className="status-item">
        <span className="status-label">Capture Status:</span>
        <span className={`status-value ${isCapturing ? 'active' : 'inactive'}`}>
          {isCapturing ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div className="status-item">
        <span className="status-label">Connected Users:</span>
        <span className="status-value">{connectedUsers}</span>
      </div>
    </div>
  );
};
