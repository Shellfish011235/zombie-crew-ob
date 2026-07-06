import { getSurvivorAbility } from "./survivors";

export function getAbility(playerId) {
  return getSurvivorAbility(playerId);
}

export function applyScoreBonus(points, playerId) {
  const ab = getSurvivorAbility(playerId);
  if (ab?.globalBonus === "scoreMultiplier") return Math.floor(points * 1.3);
  return points;
}
