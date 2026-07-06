import { getAbility } from "../data/abilities";

const BRIEFINGS = {
  1: {
    title: "HORDE EVADED!",
    subtitle: "Apocalypse Scoreboard — Leg 1 Complete",
    quotes: [
      "Your knees hate you, but your ego is thriving.",
      "The horde is still chewing on your dust.",
      "Safe zone smells like victory and old coffee.",
    ],
    nextLabel: "ENTER MESS HALL →",
  },
  2: {
    title: "PLATE DOMINATED!",
    subtitle: "Apocalypse Scoreboard — Leg 2 Complete",
    quotes: [
      "Zero crumbs. Maximum dignity. Questionable hygiene.",
      "Rival is filing a formal complaint with the bunk council.",
      "Bubble bath privileges: GRANTED.",
    ],
    nextLabel: "HIT THE TUB →",
  },
};

export function BriefingScene({ player, score, leg, runState, onContinue, onRoster }) {
  const info = BRIEFINGS[leg];
  const quote = info.quotes[Math.floor(Math.random() * info.quotes.length)];
  const ability = getAbility(player.id);

  return (
    <main className="screen briefing-screen">
      <section className="scene-title">
        <h1 className="neon-green">{info.title}</h1>
        <h2>{info.subtitle}</h2>
      </section>

      <div className="briefing-board arcade-panel">
        <div className="briefing-survivor">
          <img src={player.img} alt={player.name} />
          <div>
            <strong>{player.name}</strong>
            <span>{player.title ?? player.role}</span>
          </div>
        </div>

        <div className="briefing-stats">
          <div className="brief-stat"><small>RUN SCORE</small><strong className="neon-green">{score.toLocaleString()}</strong></div>
          <div className="brief-stat"><small>LEGS CLEARED</small><strong>{leg} / 3</strong></div>
          <div className="brief-stat"><small>STATUS</small><strong>Still breathing ✓</strong></div>
        </div>

        {runState && leg >= 1 && (
          <div className="carryover-panel">
            <strong>Crew Carryover</strong>
            <ul>
              {runState.pickupStreak > 0 && <li>Pickup streak {runState.pickupStreak} → combo head start next leg</li>}
              {runState.supplyBonus > 0 && <li>Supply cache +{runState.supplyBonus} → stronger scoring</li>}
              {runState.pressure > 0 && <li>Horde pressure {runState.pressure} → more stink bubbles ahead</li>}
              {runState.perfectDodges > 0 && <li>{runState.perfectDodges} perfect dodges logged</li>}
            </ul>
          </div>
        )}

        {ability && (
          <div className="ability-callout">
            <span className="ability-badge">{ability.name}</span>
            <p>{ability.description}</p>
          </div>
        )}

        {ability?.globalBonus === "healing" && (
          <p className="medic-heal">🩹 Medic bonus: crew morale restored (+500 pts)</p>
        )}

        <blockquote className="briefing-quote">&ldquo;{quote}&rdquo;</blockquote>

        <div className="end-actions">
          <button type="button" className="big-button" onClick={onContinue}>{info.nextLabel}</button>
          <button type="button" className="ghost-button" onClick={onRoster}>Back to Roster</button>
        </div>
      </div>
    </main>
  );
}
