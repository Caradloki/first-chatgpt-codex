import type { RewardRecord } from '#types';
import { Trophy, Gift, Sparkles } from 'lucide-react';

interface Props {
  rewards: RewardRecord[];
  totalXp: number;
  loading: boolean;
}

const RewardsView = ({ rewards, totalXp, loading }: Props) => {
  return (
    <div className="rewards-shell">
      <header className="rewards-header">
        <div>
          <div className="library-title">Rewards</div>
          <h1>Badges & XP</h1>
          <p className="library-subtitle">Complete sessions, hit milestones, and collect badges for your reading streaks.</p>
        </div>
        <div className="xp-pill">
          <Sparkles size={16} />
          <span>{Math.round(totalXp)} XP</span>
        </div>
      </header>

      {loading && (
        <div className="empty-state">
          <p>Calculating your achievements…</p>
        </div>
      )}

      {!loading && rewards.length === 0 && (
        <div className="empty-state">
          <p>No rewards yet. Start your first session or complete a book to earn XP.</p>
        </div>
      )}

      {!loading && rewards.length > 0 && (
        <div className="reward-grid">
          {rewards.map((reward) => {
            const granted = reward.grantedAt ? new Date(reward.grantedAt) : null;
            const label = reward.label ?? reward.type;
            const minutes = typeof reward.meta?.minutes === 'number' ? reward.meta.minutes : null;
            return (
              <article key={reward.id} className="reward-card">
                <div className="reward-icon">
                  {reward.type === 'session' ? <Trophy size={20} /> : <Gift size={20} />}
                </div>
                <div className="reward-content">
                  <strong>{label}</strong>
                  <span className="reward-meta">
                    {granted ? granted.toLocaleString() : 'Recently awarded'} · {reward.xp} XP
                  </span>
                  {typeof minutes === 'number' && (
                    <span className="reward-meta subtle">Session length · {Math.round(minutes)} min</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RewardsView;
