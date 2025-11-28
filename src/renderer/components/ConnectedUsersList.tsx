import React from 'react';

export interface ConnectedUser {
  userId: string;
  connectionState: string;
  connectedAt: number;
}

interface ConnectedUsersListProps {
  users: ConnectedUser[];
}

export const ConnectedUsersList: React.FC<ConnectedUsersListProps> = ({ users }) => {
  const formatDuration = (connectedAt: number): string => {
    const duration = Date.now() - connectedAt;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="connected-users-list">
      <h3>Connected Users ({users.length})</h3>
      {users.length === 0 ? (
        <p className="no-users">No users connected</p>
      ) : (
        <ul className="users-list">
          {users.map((user) => (
            <li key={user.userId} className="user-item">
              <span className="user-id">{user.userId.substring(0, 8)}...</span>
              <span className={`user-status ${user.connectionState}`}>
                {user.connectionState}
              </span>
              <span className="user-duration">{formatDuration(user.connectedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
