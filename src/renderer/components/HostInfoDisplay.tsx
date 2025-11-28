import React, { useState, useEffect } from 'react';

interface HostInfoDisplayProps {
  ipAddress: string;
  port: number;
  serverStatus: 'running' | 'stopped' | 'starting' | 'error';
}

export const HostInfoDisplay: React.FC<HostInfoDisplayProps> = ({ 
  ipAddress, 
  port, 
  serverStatus 
}) => {
  const [copied, setCopied] = useState(false);

  const connectionString = `${ipAddress}:${port}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(connectionString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStatusColor = () => {
    switch (serverStatus) {
      case 'running': return '#4caf50';
      case 'stopped': return '#9e9e9e';
      case 'starting': return '#ff9800';
      case 'error': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getStatusText = () => {
    switch (serverStatus) {
      case 'running': return 'Server Running';
      case 'stopped': return 'Server Stopped';
      case 'starting': return 'Starting Server...';
      case 'error': return 'Server Error';
      default: return 'Unknown';
    }
  };

  return (
    <div className="host-info-display">
      <h2>Connection Info</h2>
      
      <div className="server-status" style={{ marginBottom: '12px' }}>
        <span 
          className="status-indicator" 
          style={{ 
            display: 'inline-block',
            width: '10px', 
            height: '10px', 
            borderRadius: '50%', 
            backgroundColor: getStatusColor(),
            marginRight: '8px'
          }} 
        />
        <span>{getStatusText()}</span>
      </div>

      <div className="connection-info">
        <div className="info-row">
          <label>IP Address:</label>
          <span className="info-value">{ipAddress || 'Detecting...'}</span>
        </div>
        <div className="info-row">
          <label>Port:</label>
          <span className="info-value">{port}</span>
        </div>
      </div>

      <div className="connection-string" style={{ marginTop: '12px' }}>
        <div 
          className="connection-value" 
          style={{ 
            fontFamily: 'monospace', 
            fontSize: '1.2em',
            padding: '8px 12px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>{connectionString}</span>
          <button 
            onClick={handleCopy}
            style={{
              marginLeft: '8px',
              padding: '4px 8px',
              cursor: 'pointer'
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <p className="host-info-hint" style={{ marginTop: '12px', fontSize: '0.9em', color: '#666' }}>
        Share this IP and port with remote users. Make sure to port forward port {port} on your router.
      </p>
    </div>
  );
};
