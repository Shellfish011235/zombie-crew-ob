function StatBar({ label, value, max = 10, color }) {
  const pct = (value / max) * 100
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <div className="stat-track">
        <div className="stat-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="stat-value">{value}</span>
    </div>
  )
}

export function PlayerCard({ player, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`player-card ${selected ? 'selected' : ''}`}
      style={{ '--card-theme': player.theme }}
      onClick={() => onSelect(player.id)}
    >
      <div className="player-card-header">
        <span className="player-number">PLAYER {player.id}</span>
        <span className="player-role-icon">{player.icon}</span>
      </div>

      <div className="player-portrait">
        <img
          src={player.image}
          alt={player.name}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            e.currentTarget.nextElementSibling?.classList.add('visible')
          }}
        />
        <div className="portrait-fallback">
          <span>{player.icon}</span>
          <small>player{player.id}.png</small>
        </div>
      </div>

      <div className="player-stats">
        <StatBar label="Speed" value={player.speed} color={player.theme} />
        <StatBar label="Stamina" value={player.stamina} color={player.theme} />
        <StatBar label="Luck" value={player.luck} color={player.theme} />
      </div>
    </button>
  )
}

export default PlayerCard
