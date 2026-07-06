import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyScoreBonus, getAbility } from "./data/abilities";
import { survivors, statLegend } from "./data/survivors";
import { createRunState } from "./data/gameSystems";
import { BriefingScene } from "./components/BriefingScene";
import { Hud } from "./components/GameUI";
import { PlayerProfile } from "./components/PlayerProfile";
import { loadAllPlayerStats, recordGameResult, recordGameStart } from "./data/playerStats";
import { OutrunScene } from "./scenes/OutrunScene";
import { PlateScene } from "./scenes/PlateScene";
import { BubbleScene } from "./scenes/BubbleScene";
import "./App.css";

const PLAY_MODES = [
  { id: "full", label: "Full Gauntlet", desc: "All 3 challenges back-to-back", icon: "🏆", cta: "START GAUNTLET", jump: "Jump into full run" },
  { id: "outrun", label: "Outrun", desc: "Challenge 1 — dodge the horde", icon: "🏃", cta: "PLAY OUTRUN", jump: "Jump to Outrun" },
  { id: "plate", label: "Plate Licking", desc: "Challenge 2 — mess hall showdown", icon: "🍽️", cta: "PLAY PLATE", jump: "Jump to Plate" },
  { id: "bubble", label: "Bubble Pop", desc: "Challenge 3 — bath time blast", icon: "🫧", cta: "PLAY BUBBLES", jump: "Jump to Bubbles" },
];

const CHALLENGE_NAMES = {
  outrun: "Outrun the Horde",
  plate: "Plate Licking Showdown",
  bubble: "Bath Time Bubble Pop",
};

function pickRandomRival(player) {
  return survivors.filter((p) => p.id !== player.id)[Math.floor(Math.random() * (survivors.length - 1))];
}

function PlayerCard({ player, selected, onClick }) {
  return (
    <button type="button" className={`player-card roster-thumb ${player.color} ${selected ? "selected" : ""}`} onClick={onClick} aria-pressed={selected}>
      <span className="card-number">{player.id}</span>
      <div className="portrait-wrap card-image">
        <img src={player.img} alt={player.name} onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.add("visible"); }} />
        <div className="portrait-fallback"><span className="fallback-icon">{player.icon}</span></div>
      </div>
      <span className="roster-thumb-name">{player.name}</span>
    </button>
  );
}

function SelectionScene({ selectedPlayer, setSelectedPlayer, playMode, startGameWithMode, allStats }) {
  return (
    <main className="screen selection-screen">
      <div className="selection-bg" aria-hidden="true" />
      <div className="selection-vignette" aria-hidden="true" />
      <Hud variant="select" />
      <section className="hero-title title-stack compact-roster-title">
        <h1>OUTRUN THE ZOMBIE HORDE!</h1>
        <h2>CHOOSE YOUR SURVIVOR</h2>
      </section>

      <div className="roster-layout">
        <div className="roster-main">
          <section className="player-grid roster-grid">
            {survivors.map((player) => (
              <PlayerCard key={player.id} player={player} selected={selectedPlayer?.id === player.id} onClick={() => setSelectedPlayer(player)} />
            ))}
          </section>

          <section className="mode-picker arcade-panel">
            <h3 className="mode-picker-title">Jump To A Challenge</h3>
            <p className="mode-picker-sub">Pick a survivor, then tap any trial to launch straight in.</p>
            <div className="mode-picker-grid">
              {PLAY_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={`mode-card mode-launch ${playMode === mode.id ? "last-played" : ""} ${mode.id === "full" ? "mode-gauntlet" : ""}`}
                  disabled={!selectedPlayer}
                  onClick={() => startGameWithMode(mode.id)}
                  title={mode.jump}
                >
                  <span className="mode-icon">{mode.icon}</span>
                  <strong>{mode.label}</strong>
                  <small>{mode.desc}</small>
                  <span className="mode-jump-cta">{mode.cta} ➜</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <PlayerProfile player={selectedPlayer} allStats={allStats} />
      </div>

      <section className="bottom-bar footer-row home-footer">
        <div className="tips-sign"><span className="tips-nail" /><strong>TIPS:</strong> Tap a challenge above or use the quick-launch buttons below!</div>
        <div className="home-launch-row">
          {PLAY_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`home-launch-btn ${mode.id === "full" ? "gauntlet" : ""}`}
              disabled={!selectedPlayer}
              onClick={() => startGameWithMode(mode.id)}
            >
              <span className="home-launch-icon">{mode.icon}</span>
              <span className="home-launch-label">{mode.cta}</span>
            </button>
          ))}
        </div>
        <div className="stat-legend">{statLegend.map((item) => (<span key={item.label} className="legend-item">{item.icon} {item.label}</span>))}</div>
      </section>
    </main>
  );
}

function ChallengeCompleteScene({ player, score, playMode, onRetry, onRoster, onFullRun }) {
  const label = CHALLENGE_NAMES[playMode] ?? "Challenge";
  return (
    <main className="screen end-screen victory-screen">
      <Hud score={score} time="∞" />
      <section className="scene-title"><h1>CHALLENGE CLEAR!</h1><h2>{label.toUpperCase()}</h2></section>
      <div className="end-card win arcade-panel">
        <img src={player.img} alt={player.name} />
        <p className="end-score">Score: <strong>{score.toLocaleString()}</strong></p>
        <p className="end-flavor">{player.name} nailed it. Pick another challenge or run the full gauntlet.</p>
        <div className="end-actions">
          <button type="button" className="big-button" onClick={onRetry}>PLAY AGAIN</button>
          <button type="button" className="ghost-button" onClick={onFullRun}>FULL GAUNTLET</button>
          <button type="button" className="ghost-button" onClick={onRoster}>Choose Challenge</button>
        </div>
      </div>
    </main>
  );
}

function VictoryScene({ player, score, onRoster, onPlayAgain }) {
  return (
    <main className="screen end-screen victory-screen">
      <Hud score={score} time="∞" />
      <section className="scene-title"><h1>VICTORY!</h1><h2>{player.name} SURVIVED ALL THREE CHALLENGES</h2></section>
      <div className="end-card win arcade-panel">
        <img src={player.img} alt={player.name} />
        <p className="end-score">Final Score: <strong>{score.toLocaleString()}</strong></p>
        <p className="end-flavor">Outran the horde. Licked every plate. Popped every bubble. Apocalypse MVP.</p>
        <div className="end-actions">
          <button type="button" className="big-button" onClick={onPlayAgain}>PLAY AGAIN</button>
          <button type="button" className="ghost-button" onClick={onRoster}>Back to Roster</button>
        </div>
      </div>
    </main>
  );
}

function GameOverScene({ player, score, onRoster, onRetry }) {
  return (
    <main className="screen end-screen gameover-screen">
      <Hud score={score} time="00:00" />
      <section className="scene-title"><h1>GAME OVER</h1><h2>{player.name} DID NOT SURVIVE THE CREW TRIALS</h2></section>
      <div className="end-card lose arcade-panel">
        <img src={player.img} alt={player.name} />
        <p className="end-score">Score Reached: <strong>{score.toLocaleString()}</strong></p>
        <p className="end-flavor">The zombies are still hungry. Pick another survivor and run it back.</p>
        <div className="end-actions">
          <button type="button" className="big-button" onClick={onRetry}>TRY AGAIN</button>
          <button type="button" className="ghost-button" onClick={onRoster}>Back to Roster</button>
        </div>
      </div>
    </main>
  );
}

export default function App() {
  const [scene, setScene] = useState("select");
  const [selectedPlayer, setSelectedPlayer] = useState(survivors[0]);
  const [playMode, setPlayMode] = useState("full");
  const [score, setScore] = useState(0);
  const [rival, setRival] = useState(null);
  const [runKey, setRunKey] = useState(0);
  const [medicApplied, setMedicApplied] = useState(false);
  const [runState, setRunState] = useState(createRunState);
  const [allStats, setAllStats] = useState(() => loadAllPlayerStats());
  const resultLogged = useRef(false);

  const addScore = useCallback((pts) => {
    setScore((s) => Math.max(0, s + pts));
  }, []);

  const sceneForMode = (mode) => {
    if (mode === "plate") return "plate";
    if (mode === "bubble") return "bubble";
    return "outrun";
  };

  const launchGame = (mode = playMode) => {
    if (!selectedPlayer) return;
    setPlayMode(mode);
    setScore(0);
    setRival(pickRandomRival(selectedPlayer));
    setMedicApplied(false);
    setRunState(createRunState());
    setRunKey((k) => k + 1);
    resultLogged.current = false;
    setAllStats((s) => recordGameStart(s, selectedPlayer.id));
    setScene(sceneForMode(mode));
  };

  const startGameWithMode = (mode) => launchGame(mode);

  const retryCurrent = () => {
    resultLogged.current = false;
    setRunKey((k) => k + 1);
    setScene(sceneForMode(playMode));
  };

  const startFullGauntlet = () => {
    setPlayMode("full");
    launchGame("full");
  };

  const backToRoster = () => {
    setAllStats(loadAllPlayerStats());
    setScene("select");
  };

  const goGameOver = () => setScene("gameover");
  const isFullRun = playMode === "full";

  useEffect(() => {
    if (!["victory", "challengeComplete", "gameover"].includes(scene)) return;
    if (resultLogged.current) return;
    resultLogged.current = true;
    setAllStats((s) => recordGameResult(s, selectedPlayer.id, {
      score,
      won: scene !== "gameover",
      mode: playMode,
    }));
  }, [scene, score, selectedPlayer.id, playMode]);

  const applyMedicIfNeeded = useCallback(() => {
    if (medicApplied) return;
    const ab = getAbility(selectedPlayer.id);
    if (ab?.globalBonus === "healing") {
      addScore(applyScoreBonus(500, selectedPlayer.id));
      setMedicApplied(true);
    }
  }, [medicApplied, selectedPlayer.id, addScore]);

  useEffect(() => {
    if (scene === "briefing1" || scene === "briefing2") applyMedicIfNeeded();
  }, [scene, applyMedicIfNeeded]);

  const runProps = useMemo(() => ({
    player: selectedPlayer,
    score,
    addScore,
    runState,
    onRoster: backToRoster,
    onGameOver: goGameOver,
  }), [selectedPlayer, score, addScore, runState]);

  return (
    <>
      {scene === "select" && (
        <SelectionScene
          selectedPlayer={selectedPlayer}
          setSelectedPlayer={setSelectedPlayer}
          playMode={playMode}
          startGameWithMode={startGameWithMode}
          allStats={allStats}
        />
      )}
      {scene === "outrun" && (
        <OutrunScene
          key={`outrun-${runKey}`}
          {...runProps}
          roster={survivors}
          onWin={(stats) => {
            setRunState((s) => ({ ...s, ...stats }));
            setScene(isFullRun ? "briefing1" : "challengeComplete");
          }}
          onRetry={retryCurrent}
        />
      )}
      {scene === "briefing1" && isFullRun && (
        <BriefingScene player={selectedPlayer} score={score} leg={1} runState={runState} onContinue={() => setScene("plate")} onRoster={backToRoster} />
      )}
      {scene === "plate" && rival && (
        <PlateScene
          key={`plate-${runKey}`}
          {...runProps}
          rival={rival}
          onWin={() => setScene(isFullRun ? "briefing2" : "challengeComplete")}
          onRetry={retryCurrent}
        />
      )}
      {scene === "briefing2" && isFullRun && (
        <BriefingScene player={selectedPlayer} score={score} leg={2} runState={runState} onContinue={() => setScene("bubble")} onRoster={backToRoster} />
      )}
      {scene === "bubble" && (
        <BubbleScene
          key={`bubble-${runKey}`}
          {...runProps}
          onWin={() => setScene(isFullRun ? "victory" : "challengeComplete")}
          onRetry={retryCurrent}
        />
      )}
      {scene === "challengeComplete" && (
        <ChallengeCompleteScene
          player={selectedPlayer}
          score={score}
          playMode={playMode}
          onRetry={retryCurrent}
          onRoster={backToRoster}
          onFullRun={startFullGauntlet}
        />
      )}
      {scene === "victory" && (
        <VictoryScene player={selectedPlayer} score={score} onRoster={backToRoster} onPlayAgain={startFullGauntlet} />
      )}
      {scene === "gameover" && (
        <GameOverScene player={selectedPlayer} score={score} onRoster={backToRoster} onRetry={retryCurrent} />
      )}
    </>
  );
}
