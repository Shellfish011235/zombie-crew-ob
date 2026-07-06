import { getAbility } from "../data/abilities";
import { getPlayerRecord, winRate } from "../data/playerStats";

function StatBars({ label, value, colorClass, icon }) {
  return (
    <div className="profile-stat-row">
      <span className="profile-stat-label">{icon} {label}</span>
      <div className="profile-stat-track">
        <div className={`profile-stat-fill ${colorClass}`} style={{ width: `${value * 10}%` }} />
      </div>
      <b className="profile-stat-num">{value}/10</b>
    </div>
  );
}

function CareerStat({ label, value, highlight }) {
  return (
    <div className={`career-stat ${highlight ? "highlight" : ""}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

export function PlayerProfile({ player, allStats }) {
  if (!player) {
    return (
      <aside className="player-spotlight empty arcade-panel">
        <p>Select a survivor to view their full dossier.</p>
      </aside>
    );
  }

  const ability = getAbility(player.id);
  const record = getPlayerRecord(allStats, player.id);
  const rate = winRate(record);
  const totalClears = record.outrunClears + record.plateClears + record.bubbleClears;

  const abilityName = player.abilityName ?? ability?.name;
  const abilityDescription = player.abilityDescription ?? ability?.description;

  return (
    <aside className={`player-spotlight ${player.color} arcade-panel`}>
      <div className="spotlight-portrait">
        <img src={player.img} alt={player.name} className="spotlight-img" />
        <div className="spotlight-glow" aria-hidden="true" />
        <span className="spotlight-badge">{player.icon}</span>
      </div>

      <div className="spotlight-info">
        <span className="spotlight-number">SURVIVOR {player.id}</span>
        <h3 className="spotlight-name">{player.name}</h3>
        <p className="spotlight-role">{player.title ?? player.role}</p>

        {abilityName && (
          <div className="spotlight-ability">
            <strong>{abilityName}</strong>
            <p>{abilityDescription}</p>
          </div>
        )}

        <div className="spotlight-stats">
          <h4>Core Stats</h4>
          <StatBars label="Speed" value={player.speed} colorClass={player.color} icon="⚡" />
          <StatBars label="Stamina" value={player.stamina} colorClass={player.color} icon="❤️" />
          <StatBars label="Luck" value={player.luck} colorClass={player.color} icon="🍀" />
        </div>

        <div className="spotlight-career">
          <h4>Crew Record</h4>
          <div className="career-grid">
            <CareerStat label="Games" value={record.games} />
            <CareerStat label="Gauntlet Wins" value={record.wins} highlight />
            <CareerStat label="Losses" value={record.losses} />
            <CareerStat label="Win Rate" value={record.wins + record.losses ? `${rate}%` : "—"} />
            <CareerStat label="Best Score" value={record.bestScore.toLocaleString()} highlight />
            <CareerStat label="Solo Clears" value={totalClears} />
          </div>
          <div className="challenge-clears">
            <span>🏃 {record.outrunClears}</span>
            <span>🍽️ {record.plateClears}</span>
            <span>🫧 {record.bubbleClears}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
