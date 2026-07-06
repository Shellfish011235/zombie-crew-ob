import { useEffect, useState } from "react";
import "./SurvivorActor.css";

/**
 * Animated survivor — larger than a roster card, with pose-specific motion.
 */
export function SurvivorActor({
  img,
  name,
  color = "blue",
  pose = "idle",
  action = null,
  facing = "right",
  size = "md",
  variant = "card",
  className = "",
  style = {},
  showName = true,
  showAura = false,
  hideRunLegs = false,
  hideRunArms = false,
}) {
  const [actionPulse, setActionPulse] = useState(false);

  useEffect(() => {
    if (!action) return;
    setActionPulse(true);
    const t = setTimeout(() => setActionPulse(false), 420);
    return () => clearTimeout(t);
  }, [action]);

  return (
    <div
      className={[
        "survivor-actor",
        `survivor-${color}`,
        `variant-${variant}`,
        `pose-${pose}`,
        `size-${size}`,
        `facing-${facing}`,
        action ? `action-${action}` : "",
        actionPulse ? "action-pulse" : "",
        showAura ? "has-aura" : "",
        className,
      ].filter(Boolean).join(" ")}
      style={style}
    >
      {pose === "run" && (
        <>
          <div className="run-fx speed-lines" aria-hidden="true" />
          <div className="run-fx dust-trail" aria-hidden="true" />
        </>
      )}

      {pose === "lick" && actionPulse && <div className="lick-fx" aria-hidden="true">👅</div>}
      {pose === "bath" && <div className="bath-foam" aria-hidden="true" />}

      <div className={`survivor-body ${actionPulse && action ? `body-action-${action}` : ""}`}>
        {variant === "sprite" && pose === "run" && !hideRunArms && (
          <>
            <span className="run-arm arm-back" aria-hidden="true" />
            <span className="run-arm arm-front" aria-hidden="true" />
          </>
        )}

        <div className="survivor-frame">
          <img src={img} alt={name} className="survivor-img" draggable={false} />
          {variant === "card" && <div className="survivor-shine" aria-hidden="true" />}
        </div>

        {variant === "sprite" && <div className="ground-shadow" aria-hidden="true" />}

        {pose === "run" && !hideRunLegs && (
          <div className="run-legs" aria-hidden="true">
            <span className="leg leg-a" />
            <span className="leg leg-b" />
          </div>
        )}
      </div>

      {showName && <span className="survivor-name">{name}</span>}
    </div>
  );
}

export function DuckCannon({ firing, onFire, disabled }) {
  return (
    <button type="button" className={`duck-cannon ${firing ? "firing" : ""}`} onClick={onFire} disabled={disabled}>
      <span className="cannon-mount">
        <img src="/ui/duck.svg" alt="" className="duck-img" />
        <span className="cannon-barrel" />
      </span>
      SPLASH!
    </button>
  );
}
