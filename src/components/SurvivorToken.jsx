import "./SurvivorToken.css";

/**
 * Small circular gameplay avatar — use in lanes, tub, plate sides.
 * Full portrait is reserved for roster, HUD, and cut-ins.
 */
export function SurvivorToken({
  survivor,
  size = "md",
  pose = "idle",
  glowing = false,
  active = false,
  className = "",
  label,
}) {
  if (!survivor) return null;

  return (
    <div
      className={[
        "survivor-token",
        `token-${survivor.color}`,
        `size-${size}`,
        `pose-${pose}`,
        glowing ? "token-glow" : "",
        active ? "token-active" : "",
        className,
      ].filter(Boolean).join(" ")}
      title={survivor.name}
    >
      <div className="token-ring" aria-hidden="true" />
      <img src={survivor.img} alt="" className="token-avatar" draggable={false} />
      {label && <span className="token-label">{label}</span>}
    </div>
  );
}

/** Full-face HUD portrait — corner display, not the lane token. */
export function HudPortrait({ survivor, sublabel }) {
  if (!survivor) return null;

  return (
    <div className={`hud-portrait token-${survivor.color}`}>
      <img src={survivor.img} alt={survivor.name} className="hud-portrait-img" draggable={false} />
      <div className="hud-portrait-meta">
        <strong>{survivor.name}</strong>
        {sublabel && <small>{sublabel}</small>}
      </div>
    </div>
  );
}
