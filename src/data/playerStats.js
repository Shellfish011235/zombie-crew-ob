const STORAGE_KEY = "zombie-crew-ob-player-stats";

function emptyRecord() {
  return {
    games: 0,
    wins: 0,
    losses: 0,
    bestScore: 0,
    outrunClears: 0,
    plateClears: 0,
    bubbleClears: 0,
  };
}

export function loadAllPlayerStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getPlayerRecord(allStats, playerId) {
  return allStats[playerId] ?? emptyRecord();
}

function saveAll(allStats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allStats));
  } catch {
    /* storage full or blocked */
  }
}

export function recordGameStart(allStats, playerId) {
  const next = { ...allStats };
  const rec = { ...getPlayerRecord(next, playerId) };
  rec.games += 1;
  next[playerId] = rec;
  saveAll(next);
  return next;
}

export function recordGameResult(allStats, playerId, { score, won, mode }) {
  const next = { ...allStats };
  const rec = { ...getPlayerRecord(next, playerId) };

  if (score > rec.bestScore) rec.bestScore = score;

  if (won) {
    if (mode === "full") rec.wins += 1;
    else if (mode === "outrun") rec.outrunClears += 1;
    else if (mode === "plate") rec.plateClears += 1;
    else if (mode === "bubble") rec.bubbleClears += 1;
  } else {
    rec.losses += 1;
  }

  next[playerId] = rec;
  saveAll(next);
  return next;
}

export function winRate(record) {
  const total = record.wins + record.losses;
  return total ? Math.round((record.wins / total) * 100) : 0;
}
