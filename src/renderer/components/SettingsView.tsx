import { useState } from 'react';
import { Moon, Sun, Download } from 'lucide-react';

interface Props {
  onImport: () => Promise<void>;
  loading: boolean;
}

const SettingsView = ({ onImport, loading }: Props) => {
  const [ergonomics, setErgonomics] = useState({ blueLight: 35, reminder: 20 });

  return (
    <div className="settings-shell">
      <header className="settings-header">
        <div>
          <div className="library-title">Settings</div>
          <h1>Comfort & Data</h1>
          <p className="library-subtitle">Adjust ergonomics, manage your data, and keep your library safe.</p>
        </div>
      </header>

      <section className="settings-section">
        <h2>Ergonomics</h2>
        <div className="control-row">
          <label htmlFor="blueLight">Blue-light filter</label>
          <input
            id="blueLight"
            type="range"
            min={0}
            max={100}
            value={ergonomics.blueLight}
            onChange={(event) => setErgonomics((prev) => ({ ...prev, blueLight: Number(event.target.value) }))}
          />
          <span>{ergonomics.blueLight}%</span>
        </div>
        <div className="control-row">
          <label htmlFor="reminder">20-20-20 reminder cadence</label>
          <input
            id="reminder"
            type="range"
            min={10}
            max={45}
            step={5}
            value={ergonomics.reminder}
            onChange={(event) => setErgonomics((prev) => ({ ...prev, reminder: Number(event.target.value) }))}
          />
          <span>Every {ergonomics.reminder} min</span>
        </div>
        <div className="settings-hint">
          <Sun size={16} />
          <span>Scheduling and automatic warm light filters will arrive in a future release.</span>
        </div>
      </section>

      <section className="settings-section">
        <h2>Library management</h2>
        <div className="settings-card">
          <p>Import more books, sync metadata, or rebuild your analytics.</p>
          <button className="button" onClick={onImport} disabled={loading}>
            <Download size={16} /> Import books
          </button>
        </div>
        <div className="settings-card">
          <p>Backups are stored locally in your profile folder. Scheduled exports and cloud sync are on the roadmap.</p>
          <div className="settings-hint">
            <Moon size={16} /> Privacy-first: all analytics are calculated on-device.
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsView;
