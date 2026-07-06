export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function uid() {
  return crypto.randomUUID();
}

export function Hud({ score = 0, time = "01:30", variant = "game", onHome }) {
  return (
    <>
      <div className={`hud hud-left ${variant}`}>
        <div className="hud-icon">⏱️</div>
        <div className="hud-content"><small>TIME LEFT</small><strong className="time-value">{time}</strong></div>
      </div>
      {onHome && (
        <button type="button" className="hud-home-btn" onClick={onHome} aria-label="Return to home screen">
          🏠 HOME
        </button>
      )}
      <div className={`hud hud-right ${variant}`}>
        <div className="hud-icon">{variant === "select" ? "🎯" : "🧠"}</div>
        <div className="hud-content"><small>SCORE</small><strong className="score-value">{score.toLocaleString()}</strong></div>
      </div>
    </>
  );
}

export function Meter({ label, value, danger }) {
  const num = Number(value);
  const safe = Number.isFinite(num) ? Math.max(0, Math.min(100, num)) : 0;
  return (
    <div className="meter arcade-panel">
      <div className="meter-label"><span>{label}</span><b>{Math.round(safe)}%</b></div>
      <div className={`meter-track ${danger ? "danger" : ""}`}><div style={{ width: `${safe}%` }} /></div>
    </div>
  );
}

export function StatusChip({ label, value, tone = "green", sub }) {
  return (
    <div className={`status-chip tone-${tone}`}>
      <small>{label}</small>
      <strong>{value}</strong>
      {sub && <span>{sub}</span>}
    </div>
  );
}

export function PhaseBanner({ label, phase }) {
  if (!label) return null;
  return <div className={`phase-banner phase-${phase}`}>{label}</div>;
}

export function CooldownMeter({ label, value, max = 100 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="cooldown-meter">
      <div className="meter-label"><span>{label}</span><b>{value <= 0 ? "READY" : `${Math.ceil(value / 10)}s`}</b></div>
      <div className="meter-track"><div className={value <= 0 ? "ready" : ""} style={{ width: `${100 - pct}%` }} /></div>
    </div>
  );
}

export function SpeedGauge({ value, label = "LICK SPEED" }) {
  const clamped = Math.max(0, Math.min(100, value));
  const rotation = -90 + (clamped / 100) * 180;
  const zone = clamped >= 70 ? "fast" : clamped >= 35 ? "mid" : "slow";

  return (
    <div className={`speed-gauge zone-${zone}`}>
      <small>{label}</small>
      <div className="speed-gauge-dial">
        <div className="speed-gauge-needle" style={{ transform: `rotate(${rotation}deg)` }} />
        <span className="speed-zone slow">SLOW</span>
        <span className="speed-zone fast">FAST!</span>
      </div>
    </div>
  );
}

export function PlateProgressHud({ name, img, value, tag, danger, combo }) {
  const label = value >= 95 ? "SO CLEAN!" : value >= 70 ? "ALMOST THERE" : value >= 40 ? "KEEP LICKING" : "MESSY";
  return (
    <div className={`plate-progress-hud ${danger ? "rival" : "player"}`}>
      <img src={img} alt={name} className="plate-hud-avatar" />
      <div className="plate-hud-body">
        <div className="plate-hud-top">
          <strong>{name.toUpperCase()}</strong>
          {combo > 1 && <span className="plate-combo-badge">x{Math.floor(combo)}</span>}
        </div>
        <div className={`plate-hud-bar ${danger ? "danger" : ""}`}>
          <div style={{ width: `${value}%` }} />
        </div>
        <div className="plate-hud-meta">
          <b>{Math.round(value)}%</b>
          <span>{tag || label}</span>
        </div>
      </div>
    </div>
  );
}

export function ResultModal({ title, body, primary, onPrimary, secondary = "Back to Roster", onSecondary }) {
  return (
    <div className="overlay">
      <div className="result-panel arcade-modal">
        <h2>{title}</h2>
        <p>{body}</p>
        <div className="result-actions">
          <button type="button" className="big-button" onClick={onPrimary}>{primary}</button>
          <button type="button" className="ghost-button" onClick={onSecondary}>{secondary}</button>
        </div>
      </div>
    </div>
  );
}
