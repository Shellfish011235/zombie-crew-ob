import { useCallback, useEffect, useRef, useState } from "react";
import { getAbility, applyScoreBonus } from "../data/abilities";
import { stinkWeight } from "../data/gameSystems";
import { usePopups } from "../components/GamePopups";
import { BathTubPlayer } from "../components/BathTubPlayer";
import { CooldownMeter, Meter, ResultModal, formatTime, uid } from "../components/GameUI";
import { HudPortrait } from "../components/SurvivorToken";
import { useAbilityCutIn } from "../components/AbilityCutIn";

const SHOT_COOLDOWN = 16;
const DUCK_COOLDOWN = 5;
const CHAIN_WINDOW = 700;
const HIT_RADIUS = 10;
const AIM_SNAP = 16;

const BUBBLE_TYPES = [
  { type: "normal", weight: 45, loot: "" },
  { type: "bonus", weight: 12, loot: "✨" },
  { type: "stink", weight: 14, loot: "💀" },
  { type: "soap", weight: 14, loot: "🧽" },
  { type: "mega", weight: 8, mega: true, loot: "🦆" },
  { type: "loot", weight: 7, loot: "🥫" },
];

const LOOT_POOL = ["🦆", "🧽", "🥫", "🍺", "🌶️"];

function pickBubbleType(pressure) {
  const pool = BUBBLE_TYPES.map((b) => (
    b.type === "stink" ? { ...b, weight: stinkWeight(pressure) } : b
  ));
  const total = pool.reduce((s, b) => s + b.weight, 0);
  const roll = Math.random() * total;
  let acc = 0;
  for (const b of pool) {
    acc += b.weight;
    if (roll <= acc) return b;
  }
  return pool[0];
}

function makeBubbles(count, pressure) {
  return Array.from({ length: count }).map(() => {
    const b = pickBubbleType(pressure);
    const loot = b.type === "loot" ? LOOT_POOL[Math.floor(Math.random() * LOOT_POOL.length)] : b.loot;
    return {
      id: uid(),
      x: 32 + Math.random() * 54,
      y: 8 + Math.random() * 58,
      size: b.mega ? 56 + Math.random() * 16 : 38 + Math.random() * 28,
      hits: b.mega ? 2 : 1,
      vx: (Math.random() - 0.5) * 0.14,
      vy: (Math.random() - 0.5) * 0.12 - 0.03,
      wobble: Math.random() * Math.PI * 2,
      ...b,
      loot,
    };
  });
}

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function findBubbleHit(bubbles, x1, y1, x2, y2) {
  let hit = null;
  let best = Infinity;
  for (const b of bubbles) {
    const radius = HIT_RADIUS + b.size / 18;
    const dist = pointToSegmentDist(b.x, b.y, x1, y1, x2, y2);
    if (dist <= radius && dist < best) {
      best = dist;
      hit = b;
    }
  }
  return hit;
}

function snapTarget(bubbles, cx, cy) {
  let best = null;
  let bestDist = AIM_SNAP;
  for (const b of bubbles) {
    const d = Math.hypot(b.x - cx, b.y - cy);
    if (d < bestDist) {
      bestDist = d;
      best = b;
    }
  }
  if (best) return { x: best.x, y: best.y, bubble: best };
  return { x: cx, y: cy, bubble: null };
}

export function BubbleScene({ player, score, addScore, runState, onWin, onRetry, onGameOver, onRoster }) {
  const ability = getAbility(player.id);
  const pressure = runState?.pressure ?? 0;
  const totalBubbles = 28;
  const stageRef = useRef(null);
  const duckRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(58);
  const [bubbles, setBubbles] = useState(() => makeBubbles(totalBubbles, pressure));
  const [combo, setCombo] = useState(1 + (runState?.supplyBonus ?? 0) * 0.15);
  const [chain, setChain] = useState(0);
  const [duckBlast, setDuckBlast] = useState(false);
  const [duckCooldown, setDuckCooldown] = useState(0);
  const [shotCooldown, setShotCooldown] = useState(0);
  const [modal, setModal] = useState(null);
  const [playerAction, setPlayerAction] = useState(null);
  const [aimAngle, setAimAngle] = useState(-25);
  const [aimPoint, setAimPoint] = useState({ x: 55, y: 35 });
  const [muzzle, setMuzzle] = useState({ x: 14, y: 72 });
  const [streams, setStreams] = useState([]);
  const [popFx, setPopFx] = useState([]);
  const [escaped, setEscaped] = useState(0);
  const lastPopRef = useRef(0);
  const { spawnPopup, PopupLayer } = usePopups();
  const { triggerCutIn, CutInLayer } = useAbilityCutIn();

  const sudsLevel = Math.min(100, combo * 10 + chain * 4);

  const readMuzzle = useCallback(() => {
    if (!stageRef.current || !duckRef.current) return { x: 14, y: 72 };
    const stage = stageRef.current.getBoundingClientRect();
    const duck = duckRef.current.getBoundingClientRect();
    const nozzleX = duck.right - duck.width * 0.08;
    const nozzleY = duck.top + duck.height * 0.4;
    return {
      x: ((nozzleX - stage.left) / stage.width) * 100,
      y: ((nozzleY - stage.top) / stage.height) * 100,
    };
  }, []);

  const updateAim = useCallback((clientX, clientY) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const tx = ((clientX - rect.left) / rect.width) * 100;
    const ty = ((clientY - rect.top) / rect.height) * 100;
    const snap = snapTarget(bubbles, tx, ty);
    setAimPoint({ x: snap.x, y: snap.y });
    const mz = readMuzzle();
    setMuzzle(mz);
    setAimAngle(Math.atan2(snap.y - mz.y, snap.x - mz.x) * (180 / Math.PI));
  }, [bubbles, readMuzzle]);

  const pulseAction = (type) => {
    setPlayerAction(type);
    setTimeout(() => setPlayerAction((a) => (a === type ? null : a)), 420);
  };

  const addStream = useCallback((tx, ty, from) => {
    const id = uid();
    setStreams((s) => [...s, { id, tx, ty, mx: from.x, my: from.y }]);
    setTimeout(() => setStreams((s) => s.filter((st) => st.id !== id)), 320);
  }, []);

  const addPopFx = (x, y) => {
    const id = uid();
    setPopFx((p) => [...p, { id, x, y }]);
    setTimeout(() => setPopFx((p) => p.filter((fx) => fx.id !== id)), 550);
  };

  const registerChain = () => {
    const now = Date.now();
    const nextChain = now - lastPopRef.current < CHAIN_WINDOW ? chain + 1 : 1;
    lastPopRef.current = now;
    setChain(nextChain);
    return 1 + Math.min(nextChain, 6) * 0.18;
  };

  const resolvePop = useCallback((bubble, chainMult) => {
    addPopFx(bubble.x, bubble.y);

    if (bubble.type === "stink") {
      setTimeLeft((v) => Math.max(0, v - 2));
      setCombo((v) => Math.max(1, v - 0.8));
      setChain(0);
      spawnPopup("STINK!", bubble.x, bubble.y, "score-popup bad-popup");
      addScore(-50);
      return;
    }
    if (bubble.type === "bonus") {
      addScore(applyScoreBonus(Math.floor(200 * combo * chainMult), player.id));
      setTimeLeft((v) => v + 2);
      spawnPopup(chainMult > 1.2 ? "CHAIN BONUS!" : "BONUS!", bubble.x, bubble.y, "score-popup");
      setCombo((v) => Math.min(10, v + 1));
      return;
    }
    if (bubble.type === "soap") {
      addScore(applyScoreBonus(Math.floor(130 * combo * chainMult), player.id));
      setCombo((v) => Math.min(10, v + 1.2));
      spawnPopup("SOAP COMBO!", bubble.x, bubble.y, "score-popup ability-popup");
      return;
    }
    if (bubble.type === "loot") {
      addScore(applyScoreBonus(Math.floor(160 * combo * chainMult), player.id));
      setCombo((v) => Math.min(10, v + 0.6));
      spawnPopup(`${bubble.loot} LOOT!`, bubble.x, bubble.y, "score-popup");
      return;
    }
    addScore(applyScoreBonus(Math.floor(90 * combo * chainMult), player.id));
    setCombo((v) => Math.min(10, v + 0.4));
  }, [addScore, combo, player.id, spawnPopup]);

  const popBubble = useCallback((bubble) => {
    if (modal) return;

    if (bubble.hits > 1) {
      setBubbles((c) => c.map((b) => (b.id === bubble.id ? { ...b, hits: b.hits - 1, size: b.size * 0.82 } : b)));
      spawnPopup("MEGA POP!", bubble.x, bubble.y, "score-popup ability-popup");
      pulseAction("shoot");
      return;
    }

    setBubbles((c) => c.filter((b) => b.id !== bubble.id));
    const chainMult = registerChain();
    resolvePop(bubble, chainMult);
    pulseAction("shoot");
  }, [modal, resolvePop, spawnPopup]);

  const fireSquirt = useCallback((clientX, clientY) => {
    if (modal || shotCooldown > 0 || !stageRef.current) return;

    const rect = stageRef.current.getBoundingClientRect();
    const tx = ((clientX - rect.left) / rect.width) * 100;
    const ty = ((clientY - rect.top) / rect.height) * 100;

    const mz = readMuzzle();
    setMuzzle(mz);
    const snap = snapTarget(bubbles, tx, ty);
    const targetX = snap.x;
    const targetY = snap.y;

    setAimPoint({ x: targetX, y: targetY });
    setAimAngle(Math.atan2(targetY - mz.y, targetX - mz.x) * (180 / Math.PI));
    setShotCooldown(SHOT_COOLDOWN);
    addStream(targetX, targetY, mz);
    pulseAction("shoot");

    const hit = snap.bubble ?? findBubbleHit(bubbles, mz.x, mz.y, targetX, targetY);
    if (hit) popBubble(hit);
  }, [modal, shotCooldown, bubbles, popBubble, readMuzzle, addStream]);

  const handleStageClick = (e) => {
    if (modal || !stageRef.current) return;
    if (e.target.closest(".splash-btn")) return;
    fireSquirt(e.clientX, e.clientY);
  };

  const handleStageMove = (e) => {
    updateAim(e.clientX, e.clientY);
  };

  const duckBlastPop = () => {
    if (modal || bubbles.length === 0 || duckCooldown > 0) return;
    setDuckBlast(true);
    setDuckCooldown(DUCK_COOLDOWN);
    pulseAction("shoot");
    setTimeout(() => setDuckBlast(false), 400);

    const mz = readMuzzle();
    const sorted = [...bubbles].sort((a, b) => Math.hypot(a.x - 50, a.y - 35) - Math.hypot(b.x - 50, b.y - 35));
    const toPop = sorted.slice(0, 4);
    toPop.forEach((b) => {
      addPopFx(b.x, b.y);
      addStream(b.x, b.y, mz);
      resolvePop(b, registerChain());
    });
    setBubbles((c) => c.filter((b) => !toPop.find((p) => p.id === b.id)));
    addScore(applyScoreBonus(120, player.id));
    triggerCutIn(player);
    spawnPopup("SPLASH BLAST!", 70, 55, "score-popup ability-popup");
  };

  useEffect(() => {
    const sync = () => setMuzzle(readMuzzle());
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [readMuzzle]);

  useEffect(() => {
    if (modal) return;
    const t = setInterval(() => {
      setTimeLeft((v) => {
        if (v <= 1) {
          setModal(bubbles.length === 0 ? "win" : "lose");
          return 0;
        }
        return v - 1;
      });
      setCombo((v) => Math.max(1, v - 0.028));
      if (duckCooldown > 0) setDuckCooldown((v) => v - 1);
    }, 1000);
    return () => clearInterval(t);
  }, [modal, bubbles.length, duckCooldown]);

  useEffect(() => {
    if (modal) return;
    const drift = setInterval(() => {
      if (shotCooldown > 0) setShotCooldown((v) => v - 1);
    }, 50);
    return () => clearInterval(drift);
  }, [modal, shotCooldown]);

  useEffect(() => {
    if (modal) return;
    const drift = setInterval(() => {
      setBubbles((list) => {
        const next = [];
        for (const b of list) {
          let x = b.x + b.vx + Math.sin(Date.now() / 800 + b.wobble) * 0.025;
          let y = b.y + b.vy + Math.cos(Date.now() / 900 + b.wobble) * 0.02;
          let vx = b.vx;
          let vy = b.vy;

          if (x < 34 || x > 88) { vx *= -1; x = Math.max(34, Math.min(88, x)); }
          if (y < 6 || y > 72) { vy *= -1; y = Math.max(6, Math.min(72, y)); }

          if (y < 5 || x > 92 || x < 4) {
            setEscaped((e) => e + 1);
            setCombo((v) => Math.max(1, v - 0.5));
            setTimeLeft((v) => Math.max(0, v - 1));
            continue;
          }
          next.push({ ...b, x, y, vx, vy });
        }

        if (next.length < 8 && next.length > 0 && Math.random() < 0.08) {
          next.push(...makeBubbles(2, pressure));
        }

        return next;
      });
    }, 90);
    return () => clearInterval(drift);
  }, [modal]);

  useEffect(() => {
    if (modal) return;
    if (bubbles.length === 0) { addScore(applyScoreBonus(2000, player.id)); setModal("win"); }
  }, [bubbles.length, modal, addScore, player.id]);

  const comboLabel = chain >= 4 ? "SUDSY!" : chain >= 2 ? "FOAMY!" : chain >= 1 ? "POP!" : "—";

  return (
    <main className="screen bubble-scene bubble-scene-concept">
      <div className="scene-bg bubble-bg-css" aria-hidden="true" />
      <div className="scene-overlay dark" aria-hidden="true" />
      <button type="button" className="hud-home-btn bubble-home-btn" onClick={onRoster} aria-label="Return to home screen">
        🏠 HOME
      </button>
      <div className="hud-portrait-slot bubble-hud-portrait">
        <HudPortrait survivor={player} sublabel={player.abilityName} />
      </div>
      <CutInLayer />
      <PopupLayer />

      <div
        ref={stageRef}
        className="bath-room-stage bath-room-concept"
        onClick={handleStageClick}
        onMouseMove={handleStageMove}
        role="application"
        aria-label="Aim and click to squirt bubbles with your rubber duck"
      >
        <BathTubPlayer
          survivor={player}
          aimAngle={aimAngle}
          shooting={playerAction === "shoot"}
          duckRef={duckRef}
        />

        <div className="bath-stage-title-banner">
          <h2>BATH TIME BUBBLE POP</h2>
          <p>POP THE BUBBLES!</p>
        </div>

        <div className="bath-stage-hud-left">
          <div className="bath-hud-chip">
            <span className="bath-hud-icon">⏱️</span>
            <div><small>TIME LEFT</small><strong>{formatTime(timeLeft)}</strong></div>
          </div>
          <div className="bath-hud-chip">
            <span className="bath-hud-icon">🫧</span>
            <div><small>BUBBLES LEFT</small><strong>{bubbles.length}</strong></div>
          </div>
        </div>

        <div className="bath-stage-hud-score">
          <small>SCORE</small>
          <strong>{score.toLocaleString()}</strong>
        </div>

        <div className={`bath-combo-box ${chain >= 3 ? "hot" : ""}`}>
          <small>COMBO</small>
          <strong>x{Math.max(1, chain)}</strong>
          <span>{comboLabel}</span>
        </div>

        {ability && <p className="bath-ability-tag">{ability.name}</p>}

        <div className="bath-tile-wall" aria-hidden="true" />
        <div className="bath-pipes left" aria-hidden="true" />
        <div className="bath-pipes right" aria-hidden="true" />
        <div className="bath-shower-drip" aria-hidden="true">💧</div>

        <div className="bath-sign sign-clean">CLEAN(ISH) IS SURVIVAL!</div>
        <div className="bath-sign sign-zombies">ZOMBIES HATE CLEANLINESS</div>
        <div className="bath-sign sign-water">WATER IS PRECIOUS!</div>

        <div className="bath-window" aria-hidden="true">
          <div className="window-bars" />
          <span className="window-zombie">🧟</span>
          <span className="window-zombie z2">🧟‍♀️</span>
        </div>

        <div className="bath-shelf" aria-hidden="true">
          <span>🕯️</span><span>🧴</span><span>🧴</span>
        </div>
        <div className="bath-boombox" aria-hidden="true">📻</div>

        <div className={`bath-playfield ${duckBlast ? "splash-flash" : ""}`}>
        {bubbles.map((b) => {
          const targeted = Math.hypot(b.x - aimPoint.x, b.y - aimPoint.y) < AIM_SNAP;
          return (
          <div
            key={b.id}
            className={`drift-bubble bubble-${b.type} ${b.mega ? "bubble-mega" : ""} ${targeted ? "aim-target" : ""}`}
            style={{ left: `${b.x}%`, top: `${b.y}%`, width: b.size, height: b.size }}
          >
            <span className="bubble-shine" aria-hidden="true" />
            {b.loot && <span className="bubble-loot-icon">{b.loot}</span>}
            {b.hits > 1 && <span className="bubble-hits">x{b.hits}</span>}
          </div>
          );
        })}

        {streams.map((s) => (
          <svg key={s.id} className="squirt-stream" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <line x1={s.mx} y1={s.my} x2={s.tx} y2={s.ty} className="stream-line" />
            {[0.25, 0.5, 0.75].map((t) => (
              <circle
                key={t}
                cx={s.mx + (s.tx - s.mx) * t}
                cy={s.my + (s.ty - s.my) * t}
                r="0.9"
                className="stream-droplet"
              />
            ))}
            <circle cx={s.tx} cy={s.ty} r="2.2" className="stream-splash" />
          </svg>
        ))}

        <svg className="aim-preview" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line x1={muzzle.x} y1={muzzle.y} x2={aimPoint.x} y2={aimPoint.y} className="aim-line" />
          <circle cx={aimPoint.x} cy={aimPoint.y} r="1.8" className="aim-dot" />
        </svg>

        {popFx.map((p) => (
          <div key={p.id} className="pop-burst" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            <span>POP!</span>
            <span className="pop-splash">💦</span>
          </div>
        ))}

        </div>

        <div className="suds-o-meter" aria-hidden="true">
          <small className="suds-o-label">SUDS-O-METER</small>
          <div className="suds-gauge">
            <div className="suds-fill" style={{ height: `${sudsLevel}%` }} />
            <div className="suds-needle" style={{ transform: `rotate(${-90 + sudsLevel * 1.8}deg)` }} />
            <span className="suds-label">SUDS</span>
          </div>
        </div>

        <div className="bath-life-ducks" aria-hidden="true">
          <span>🦆</span><span>🦆</span><span>🦆</span>
        </div>

        <button
          type="button"
          className={`splash-btn ${duckBlast ? "firing" : ""}`}
          onClick={(e) => { e.stopPropagation(); duckBlastPop(); }}
          disabled={duckCooldown > 0}
        >
          <img src="/ui/duck.svg" alt="" />
          SPLASH!
        </button>

        <p className="bath-tip-bar">
          <span className="tip-bulb">💡</span>
          TIPS: POP BUBBLES FAST TO BUILD COMBO! DON&apos;T LET &apos;EM ESCAPE!
        </p>
      </div>

      <div className="meters bubble-meters compact-bubble-meters">
        <Meter label="Bubbles Remaining" value={(bubbles.length / totalBubbles) * 100} danger />
        <Meter label="Combo Power" value={combo * 10} />
        <CooldownMeter label="Mega Splash" value={duckCooldown * 10} max={DUCK_COOLDOWN * 10} />
      </div>

      {modal === "win" && (
        <ResultModal title="CLEAN SURVIVOR!" body={`${escaped} escaped · Sudsy legend status achieved.`} primary="VIEW VICTORY →" onPrimary={onWin} onSecondary={onRoster} />
      )}
      {modal === "lose" && (
        <ResultModal title="THE BUBBLES WON" body="The bath got away. The horde is judging silently." primary="TRY AGAIN" onPrimary={onRetry} secondary="GAME OVER →" onSecondary={onGameOver} />
      )}
    </main>
  );
}
