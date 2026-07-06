import { useCallback, useEffect, useState } from "react";
import "./AbilityCutIn.css";

export function AbilityCutIn({ survivor, visible }) {
  if (!visible || !survivor) return null;

  return (
    <div className="ability-cut-in" role="status" aria-live="polite">
      <div className={`cut-in-card token-${survivor.color}`}>
        <img src={survivor.img} alt="" className="cut-in-portrait" draggable={false} />
        <div className="cut-in-text">
          <small>ABILITY ACTIVATED</small>
          <strong>{survivor.abilityName}</strong>
          <p>{survivor.abilityDescription}</p>
        </div>
      </div>
    </div>
  );
}

export function useAbilityCutIn(cooldownMs = 2200) {
  const [survivor, setSurvivor] = useState(null);
  const lastRef = { t: 0 };

  const triggerCutIn = useCallback((s) => {
    if (!s) return;
    const now = Date.now();
    if (now - lastRef.t < cooldownMs) return;
    lastRef.t = now;
    setSurvivor(s);
  }, [cooldownMs]);

  useEffect(() => {
    if (!survivor) return;
    const t = setTimeout(() => setSurvivor(null), 1100);
    return () => clearTimeout(t);
  }, [survivor]);

  return {
    triggerCutIn,
    cutInVisible: !!survivor,
    cutInSurvivor: survivor,
    CutInLayer: () => <AbilityCutIn survivor={survivor} visible={!!survivor} />,
  };
}
