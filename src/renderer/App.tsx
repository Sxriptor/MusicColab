import React, { useState, useEffect, useRef } from 'react';
import { ConnectionStatus } from './components/ConnectionStatus';
import { HostInfoDisplay } from './components/HostInfoDisplay';
import { ControlPanel } from './components/ControlPanel';
import { ConnectedUsersList, ConnectedUser } from './components/ConnectedUsersList';
import { StreamStats, StreamStatsData } from './components/StreamStats';
import { DisplaySelector, DisplayOption } from './components/DisplaySelector';
import { ErrorDisplay, ErrorInfo } from './components/ErrorDisplay';

export const App: React.FC = () => {
  const [hostIp, setHostIp] = useState<string>('');
  const [signalingPort, setSignalingPort] = useState<number>(8765);
  const [serverStatus, setServerStatus] = useState<'running' | 'stopped' | 'starting' | 'error'>('stopped');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [displays, setDisplays] = useState<DisplayOption[]>([]);
  const [selectedDisplayId, setSelectedDisplayId] = useState<string>('');
  const [streamStats, setStreamStats] = useState<StreamStatsData>({
    bitrate: 0,
    latency: 0,
    frameRate: 0,
    packetsLost: 0,
  });
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'host' | 'join'>('host');
  const [joinIp, setJoinIp] = useState<string>('');
  const [joinPort, setJoinPort] = useState<string>('8765');
  
  const videoStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleHostInfoUpdated = (info: { ip: string; port: number }) => {
      setHostIp(info.ip);
      setSignalingPort(info.port);
    };

    const handleServerStatusChanged = (status: 'running' | 'stopped' | 'starting' | 'error') => {
      setServerStatus(status);
    };

    const handleCaptureStopped = () => {
      stopLocalCapture();
      setIsCapturing(false);
    };

    const handleUserConnected = (user: ConnectedUser) => {
      setConnectedUsers((prev) => [...prev, user]);
    };

    const handleUserDisconnected = (userId: string) => {
      setConnectedUsers((prev) => prev.filter((u) => u.userId !== userId));
    };

    const handleDisplaysUpdated = (displayList: DisplayOption[] | undefined) => {
      console.log('Displays updated:', displayList);
      if (displayList && Array.isArray(displayList)) {
        console.log(`Setting ${displayList.length} displays`);
        setDisplays(displayList);
        if (displayList.length > 0 && !selectedDisplayId) {
          setSelectedDisplayId(displayList[0].displayId);
        }
      } else {
        console.log('Invalid display list received:', displayList);
      }
    };

    const handleStatsUpdated = (stats: StreamStatsData) => {
      setStreamStats(stats);
    };

    const handleError = (errorInfo: ErrorInfo | { type: string; message: string }) => {
      const error = 'timestamp' in errorInfo ? errorInfo : { ...errorInfo, timestamp: Date.now() };
      setError(error);
    };

    if (window.electron) {
      window.electron.ipcRenderer.on('host-info-updated', (_, info: { ip: string; port: number }) => handleHostInfoUpdated(info));
      window.electron.ipcRenderer.on('server-status-changed', (_, status: 'running' | 'stopped' | 'starting' | 'error') => handleServerStatusChanged(status));
      window.electron.ipcRenderer.on('capture-stopped', () => handleCaptureStopped());
      window.electron.ipcRenderer.on('user-connected', (_, user: ConnectedUser) => handleUserConnected(user));
      window.electron.ipcRenderer.on('user-disconnected', (_, userId: string) => handleUserDisconnected(userId));
      window.electron.ipcRenderer.on('displays-updated', (_, displayList: DisplayOption[]) => handleDisplaysUpdated(displayList));
      window.electron.ipcRenderer.on('stats-updated', (_, stats: StreamStatsData) => handleStatsUpdated(stats));
      window.electron.ipcRenderer.on('error', (_, errorInfo: ErrorInfo | { type: string; message: string }) => handleError(errorInfo));

      // Request initial data
      (window.electron.ipcRenderer.invoke('get-displays') as Promise<DisplayOption[]>).then((displayList: DisplayOption[]) => {
        handleDisplaysUpdated(displayList);
      }).catch(() => {});
      
      // Request host info
      (window.electron.ipcRenderer.invoke('get-host-info') as Promise<{ ip: string; port: number }>).then((info) => {
        if (info) {
          setHostIp(info.ip);
          setSignalingPort(info.port);
        }
      }).catch(() => {});

      // Request server status
      (window.electron.ipcRenderer.invoke('get-server-status') as Promise<'running' | 'stopped' | 'starting' | 'error'>).then((status) => {
        if (status) {
          setServerStatus(status);
        }
      }).catch(() => {});
    }

    return () => {
      stopLocalCapture();
    };
  }, []);

  const stopLocalCapture = () => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
  };

  const startLocalCapture = async (sourceId: string): Promise<boolean> => {
    try {
      // Stop any existing capture
      stopLocalCapture();

      console.log('Starting capture for source:', sourceId);

      // Capture video using the source ID from main process
      const constraints: any = {
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            minFrameRate: 30,
            maxFrameRate: 60,
          },
        },
      };

      console.log('Using constraints:', constraints);

      const videoStream = await navigator.mediaDevices.getUserMedia(constraints);

      console.log('Got video stream:', videoStream);
      console.log('Video tracks:', videoStream.getVideoTracks());

      videoStreamRef.current = videoStream;

      // Check stream status
      const videoTracks = videoStream.getVideoTracks();
      console.log('Video track enabled:', videoTracks[0]?.enabled);
      console.log('Video track muted:', videoTracks[0]?.muted);
      console.log('Video track readyState:', videoTracks[0]?.readyState);

      // Show preview
      if (previewVideoRef.current && videoStreamRef.current) {
        console.log('Setting video stream to element');
        previewVideoRef.current.srcObject = videoStreamRef.current;
        
        // Enable the video track if it's disabled
        videoTracks.forEach(track => {
          if (!track.enabled) {
            console.log('Enabling video track');
            track.enabled = true;
          }
        });
        
        // Force play with proper error handling
        setTimeout(() => {
          if (previewVideoRef.current) {
            console.log('Attempting to play video');
            previewVideoRef.current.play()
              .then(() => console.log('Video playing successfully'))
              .catch(err => console.error('Play error:', err));
          }
        }, 100);
      }

      console.log('Desktop capture started successfully');
      return true;
    } catch (error) {
      console.error('Failed to start local capture:', error);
      return false;
    }
  };

  const handleStartCapture = async () => {
    if (!window.electron) return;

    const displayId = selectedDisplayId || displays[0]?.displayId;
    if (!displayId) {
      setError({ type: 'capture-error', message: 'No display selected', timestamp: Date.now() });
      return;
    }

    // Get the source ID from main process
    const result = await window.electron.ipcRenderer.invoke('start-capture', displayId);
    
    if (result.success && result.sourceId) {
      // Start local capture in renderer
      const captureSuccess = await startLocalCapture(result.sourceId);
      
      if (captureSuccess) {
        setIsCapturing(true);
        // Notify main process that capture started
        window.electron.ipcRenderer.send('capture-started-renderer', result.sourceId);
      } else {
        setError({ type: 'capture-error', message: 'Failed to capture desktop', timestamp: Date.now() });
        window.electron.ipcRenderer.send('capture-error-renderer', 'Failed to capture desktop');
      }
    } else {
      setError({ type: 'capture-error', message: result.error || 'Failed to start capture', timestamp: Date.now() });
    }
  };

  const handleStopCapture = async () => {
    stopLocalCapture();
    setIsCapturing(false);
    
    if (window.electron) {
      await (window.electron.ipcRenderer.invoke('stop-capture') as Promise<any>).catch(() => {});
    }
  };

  const handleSelectDisplay = async (displayId: string) => {
    setSelectedDisplayId(displayId);
    
    if (window.electron && isCapturing) {
      const result = await window.electron.ipcRenderer.invoke('switch-display', displayId);
      if (result.success && result.sourceId) {
        await startLocalCapture(result.sourceId);
      }
    }
  };

  const handleDismissError = () => {
    setError(null);
  };

  const handleJoinHost = () => {
    if (!joinIp.trim()) {
      setError({ type: 'join-error', message: 'Please enter the host IP address', timestamp: Date.now() });
      return;
    }
    
    const port = parseInt(joinPort, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      setError({ type: 'join-error', message: 'Please enter a valid port number (1-65535)', timestamp: Date.now() });
      return;
    }
    
    if (window.electron) {
      window.electron.ipcRenderer.invoke('join-host', { ip: joinIp.trim(), port }).then((result: any) => {
        if (result.success) {
          setError(null);
        } else {
          setError({ type: 'join-error', message: result.error || 'Failed to connect to host', timestamp: Date.now() });
        }
      });
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>WebRTC Desktop Host</h1>
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'host' ? 'active' : ''}`}
            onClick={() => setActiveTab('host')}
          >
            Host
          </button>
          <button
            className={`tab-button ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => setActiveTab('join')}
          >
            Join
          </button>
        </div>
      </header>

      <ErrorDisplay error={error} onDismiss={handleDismissError} />

      <main className="app-main">
        {activeTab === 'host' ? (
          <>
            <div className="status-section">
              <ConnectionStatus isCapturing={isCapturing} connectedUsers={connectedUsers.length} />
              <HostInfoDisplay 
                ipAddress={hostIp} 
                port={signalingPort} 
                serverStatus={serverStatus} 
              />
            </div>

            <div className="control-section">
              <DisplaySelector
                displays={displays || []}
                selectedDisplayId={selectedDisplayId}
                onSelectDisplay={handleSelectDisplay}
                disabled={false}
              />
              <ControlPanel
                isCapturing={isCapturing}
                onStartCapture={handleStartCapture}
                onStopCapture={handleStopCapture}
              />
            </div>

            {isCapturing && (
              <div className="preview-section">
                <h3>Preview</h3>
                <video
                  ref={previewVideoRef}
                  autoPlay
                  muted
                  playsInline
                  controls
                  className="preview-video"
                  style={{ width: '100%', height: '600px', backgroundColor: '#000', display: 'block' }}
                />
              </div>
            )}

            <div className="info-section">
              <ConnectedUsersList users={connectedUsers} />
              {isCapturing && <StreamStats stats={streamStats} />}
            </div>
          </>
        ) : (
          <div className="join-section">
            <div className="join-container">
              <h2>Connect to Host</h2>
              <p>Enter the host's IP address and port to connect</p>
              <div className="join-form">
                <div className="input-group" style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    placeholder="IP Address (e.g., 192.168.1.100)"
                    value={joinIp}
                    onChange={(e) => setJoinIp(e.target.value)}
                    className="join-input"
                    style={{ flex: 2 }}
                  />
                  <input
                    type="text"
                    placeholder="Port"
                    value={joinPort}
                    onChange={(e) => setJoinPort(e.target.value.replace(/\D/g, ''))}
                    onKeyPress={(e) => e.key === 'Enter' && handleJoinHost()}
                    className="join-input"
                    style={{ flex: 1, maxWidth: '100px' }}
                    maxLength={5}
                  />
                </div>
                <button onClick={handleJoinHost} className="join-button">
                  Connect
                </button>
              </div>
              <p style={{ marginTop: '16px', fontSize: '0.9em', color: '#666' }}>
                The host needs to share their IP address and port with you.
                Make sure the host has port forwarded the signaling port on their router.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
