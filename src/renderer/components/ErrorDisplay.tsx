import React from 'react';

export interface ErrorInfo {
  type: string;
  message: string;
  timestamp: number;
}

interface ErrorDisplayProps {
  error: ErrorInfo | null;
  onDismiss: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onDismiss }) => {
  if (!error) return null;

  return (
    <div className="error-display">
      <div className="error-content">
        <span className="error-type">{error.type}</span>
        <span className="error-message">{error.message}</span>
      </div>
      <button className="error-dismiss" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
};
