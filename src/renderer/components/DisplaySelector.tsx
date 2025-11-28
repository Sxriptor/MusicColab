import React from 'react';

export interface DisplayOption {
  displayId: string;
  displayName: string;
  isPrimary: boolean;
}

interface DisplaySelectorProps {
  displays: DisplayOption[];
  selectedDisplayId: string;
  onSelectDisplay: (displayId: string) => void;
  disabled?: boolean;
}

export const DisplaySelector: React.FC<DisplaySelectorProps> = ({
  displays,
  selectedDisplayId,
  onSelectDisplay,
  disabled = false,
}) => {
  return (
    <div className="display-selector">
      <label htmlFor="display-select">Select Display:</label>
      <select
        id="display-select"
        value={selectedDisplayId}
        onChange={(e) => onSelectDisplay(e.target.value)}
        disabled={disabled}
        className="display-dropdown"
      >
        <option value="">-- Select a display --</option>
        {displays.map((display) => (
          <option key={display.displayId} value={display.displayId}>
            {display.displayName} {display.isPrimary ? '(Primary)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
};
