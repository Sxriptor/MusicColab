import React, { useState, useEffect, useRef } from 'react';
import { ConnectionStatus } from './components/ConnectionStatus';
import { RoomCodeDisplay } from './components/RoomCodeDisplay';
import { ControlPanel } from './components/ControlPanel';
import { ConnectedUsersList, ConnectedUser } from './components/ConnectedUsersList';
import { StreamStats, StreamStatsData } from './components/StreamStats';
import { DisplaySelector, DisplayOption } from './components/DisplaySelector';
import { ErrorDisplay, ErrorInfo } from './components/ErrorDisplay';

export const App: React.FC = () => {
  const [roomCode, setRoomCode] = useState<string>('');
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
  
  const videoStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleRoomCodeGenerated = (code: string) => {
      setRoomCode(code);
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

    const handleDisplaysUpdated = (displayList: DisplayOption[]) => {
      setDisplays(displayList);
      if (displayList.length > 0 && !selectedDisplayId) {
        setSelectedDisplayId(displayList[0].displayId);
      }
    };

    const handleStatsUpdated = (stats: StreamStatsData) => {
      setStreamStats(stats);
    };

    const handleError = (errorInfo: ErrorInfo) => {
      setError(errorInfo);
    };

    if (window.electron) {
      window.electron.ipcRenderer.on('room-code-generated', handleRoomCodeGenerated);
      window.electron.ipcRenderer.on('capture-stopped', handleCaptureStopped);
      window.electron.ipcRenderer.on('user-connected', handleUserConnected);
      window.electron.ipcRenderer.on('user-disconnected', handleUserDisconnected);
      window.electron.ipcRenderer.on('displays-updated', handleDisplaysUpdated);
      window.electron.ipcRenderer.on('stats-updated', handleStatsUpdated);
      window.electron.ipcRenderer.on('error', handleError);

      // Request initial data
      window.electron.ipcRenderer.invoke('get-displays');
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
      setError({ type: 'capture-error', message: 'No display selected' });
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
        setError({ type: 'capture-error', message: 'Failed to capture desktop' });
        window.electron.ipcRenderer.send('capture-error-renderer', 'Failed to capture desktop');
      }
    } else {
      setError({ type: 'capture-error', message: result.error || 'Failed to start capture' });
    }
  };

  const handleStopCapture = async () => {
    stopLocalCapture();
    setIsCapturing(false);
    
    if (window.electron) {
      await window.electron.ipcRenderer.invoke('stop-capture');
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

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>WebRTC Desktop Host</h1>
      </header>

      <ErrorDisplay error={error} onDismiss={handleDismissError} />

      <main className="app-main">
        <div className="status-section">
          <ConnectionStatus isCapturing={isCapturing} connectedUsers={connectedUsers.length} />
          <RoomCodeDisplay roomCode={roomCode} />
        </div>

        <div className="control-section">
          <DisplaySelector
            displays={displays}
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
      </main>
    </div>
  );
};
