import React from 'react';

interface RoomCodeDisplayProps {
  roomCode: string;
}

export const RoomCodeDisplay: React.FC<RoomCodeDisplayProps> = ({ roomCode }) => {
  return (
    <div className="room-code-display">
      <h2>Room Code</h2>
      <div className="room-code-value">{roomCode || 'Generating...'}</div>
      <p className="room-code-hint">Share this code with remote users to connect</p>
    </div>
  );
};
