import type { ComponentType } from 'react';
import type { OverviewStats } from '#types';
import { BarChart3, Library, Settings, Trophy } from 'lucide-react';
import { Flame, Sparkles } from 'lucide-react';

interface Props {
  active: 'library' | 'insights' | 'rewards' | 'settings';
  onSelect: (view: 'library' | 'insights' | 'rewards' | 'settings') => void;
  overview: OverviewStats | null;
}

const Navigation = ({ active, onSelect, overview }: Props) => {
  const navItems: Array<{
    key: Props['active'];
    label: string;
    description: string;
    icon: ComponentType<{ size?: number }>;
  }> = [
    { key: 'library', label: 'Library', description: 'Browse your collection', icon: Library },
    { key: 'insights', label: 'Insights', description: 'Reading analytics', icon: BarChart3 },
    { key: 'rewards', label: 'Rewards', description: 'Badges and XP', icon: Trophy },
    { key: 'settings', label: 'Settings', description: 'Preferences & data', icon: Settings },
  ];

  return (
    <aside className="app-sidebar">
      <div className="app-brand">
        <span className="brand-accent" />
        <div>
          <h2>Lumina Reader</h2>
          <p>Deep reading, measured.</p>
        </div>
      </div>

      <nav className="nav-group">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              className={`nav-button${isActive ? ' active' : ''}`}
              onClick={() => onSelect(item.key)}
            >
              <span className="nav-icon">
                <Icon size={18} />
              </span>
              <span className="nav-labels">
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-summary">
        <div className="summary-card">
          <div className="summary-icon streak">
            <Flame size={16} />
          </div>
          <div>
            <span className="summary-label">Active streak</span>
            <strong>{overview?.streakDays ?? 0} days</strong>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon xp">
            <Sparkles size={16} />
          </div>
          <div>
            <span className="summary-label">Lifetime XP</span>
            <strong>{overview?.totalXp ?? 0}</strong>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Navigation;
