import React from 'react';

interface ControlPanelProps {
  isCapturing: boolean;
  onStartCapture: () => void;
  onStopCapture: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isCapturing,
  onStartCapture,
  onStopCapture,
}) => {
  return (
    <div className="control-panel">
      <button
        className="btn btn-primary"
        onClick={onStartCapture}
        disabled={isCapturing}
      >
        Start Sharing
      </button>
      <button
        className="btn btn-danger"
        onClick={onStopCapture}
        disabled={!isCapturing}
      >
        Stop Sharing
      </button>
    </div>
  );
};
