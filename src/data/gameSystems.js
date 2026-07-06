import { getAbility } from "./abilities";

export function createRunState() {
  return { pickupStreak: 0, supplyBonus: 0, pressure: 0, perfectDodges: 0 };
}

/** Luck stat (1–10) → crit chance on rewards */
export function rollLuck(luck, base = 0.08) {
  return Math.random() < luck * base;
}

export function getOutrunPhase(distance, horde) {
  if (horde >= 72) return { id: "surge", label: "HORDE SURGE!", hazardMult: 1.4, hordeMult: 1.25, speedMult: 1.08 };
  if (distance >= 55) return { id: "pressed", label: "DEAD ZONE", hazardMult: 1.18, hordeMult: 1.1, speedMult: 1.04 };
  if (distance >= 25) return { id: "warm", label: "INBOUND", hazardMult: 1.05, hordeMult: 1.02, speedMult: 1.02 };
  return { id: "calm", label: "OUTSKIRTS", hazardMult: 1, hordeMult: 1, speedMult: 1 };
}

export function getRivalModifier(rival) {
  const ab = rival?.id ? getAbility(rival.id) : null;
  if (!ab) return { speedBonus: 0, surgeChance: 0.08, label: "Hungry" };

  const map = {
    boostDuration: { speedBonus: 0.35, surgeChance: 0.14, label: "Sprint bursts" },
    trapResistance: { speedBonus: 0.1, surgeChance: 0.06, label: "Dirty fighter" },
    earlyWarning: { speedBonus: 0.2, surgeChance: 0.1, label: "Calculated licks" },
    agility: { speedBonus: 0.28, surgeChance: 0.12, label: "Quick tongue" },
    stamina: { speedBonus: 0.15, surgeChance: 0.05, label: "Marathon licker" },
    comboHold: { speedBonus: 0.18, surgeChance: 0.09, label: "Combo predator" },
    shield: { speedBonus: 0.12, surgeChance: 0.07, label: "Bulldozer licks" },
    scoreMultiplier: { speedBonus: 0.22, surgeChance: 0.11, label: "Score hunter" },
    healing: { speedBonus: 0.08, surgeChance: 0.04, label: "Steady grind" },
    hazardReduction: { speedBonus: 0.14, surgeChance: 0.06, label: "Patient hunter" },
  };

  const key = ab.outrunBonus || ab.plateBonus || ab.globalBonus;
  return { ...(map[key] ?? { speedBonus: 0.12, surgeChance: 0.08 }), label: map[key]?.label ?? ab.name };
}

export function stinkWeight(basePressure) {
  return 15 + Math.min(12, basePressure * 4);
}
