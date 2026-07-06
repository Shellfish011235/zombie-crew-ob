import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAbility, applyScoreBonus } from "../data/abilities";
import { getOutrunPhase, rollLuck } from "../data/gameSystems";
import { usePopups } from "../components/GamePopups";
import { CooldownMeter, Hud, Meter, PhaseBanner, ResultModal, StatusChip, formatTime, uid } from "../components/GameUI";
import { HudPortrait, SurvivorToken } from "../components/SurvivorToken";
import { useAbilityCutIn } from "../components/AbilityCutIn";

const GOOD = [
  { type: "coffee", icon: "☕", label: "Coffee", isEmoji: true },
  { type: "rations", icon: "🥫", label: "Rations", isEmoji: true },
  { type: "speed", icon: "⚡", label: "Speed Boost", isEmoji: true },
  { type: "medkit", icon: "💊", label: "Medkit", isEmoji: true, rare: true },
  { type: "flare", icon: "🔦", label: "Flare", isEmoji: true, rare: true },
];

const BAD = [
  { type: "debris", icon: "🪨", label: "Debris", isEmoji: true },
  { type: "hands", icon: "🖐️", label: "Zombie Hands", isEmoji: true },
  { type: "zombie", icon: "🧟", label: "Zombie", isEmoji: true },
  { type: "noise", icon: "📢", label: "Noise Trap", isEmoji: true },
  { type: "pit", icon: "🕳️", label: "Sinkhole", isEmoji: true, rare: true },
];

const LANE_PROPS = [
  ["🚧", "🔥"],
  ["🚗", "🛢️"],
  ["🚧", "🔥"],
];

const DODGE_COOLDOWN = 28;
const DODGE_IFRAMES = 7;

function buildRaceCrew(player, roster) {
  const others = roster
    .filter((p) => p.id !== player.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);
  return [player, ...others];
}

function spawnItem(hazardRate, waveMode, forceBad = false) {
  const hazardBias = waveMode ? 0.88 : 0.42 + hazardRate;
  const good = !forceBad && Math.random() > hazardBias;
  let pool = good ? GOOD : BAD;

  if (good && Math.random() > 0.2) {
    pool = GOOD.filter((g) => !g.rare);
  } else if (!good) {
    if (waveMode) {
      pool = BAD.filter((b) => b.type === "zombie" || b.type === "hands" || Math.random() > 0.5);
    } else if (Math.random() > 0.12) {
      pool = BAD.filter((b) => !b.rare);
    }
  }

  const pick = pool[Math.floor(Math.random() * pool.length)] ?? BAD[2];
  return {
    id: uid(),
    x: 96 + Math.random() * 18,
    lane: Math.floor(Math.random() * 3),
    kind: good ? "good" : "bad",
    ...pick,
  };
}

function seedTrack() {
  return Array.from({ length: 10 }).map((_, i) => ({
    ...spawnItem(0.2, false, i % 3 === 0),
    x: 28 + i * 9 + Math.random() * 5,
  }));
}

export function OutrunScene({ player, roster, score, addScore, onWin, onRetry, onGameOver, onRoster }) {
  const ability = getAbility(player.id);
  const crew = useMemo(() => buildRaceCrew(player, roster), [player, roster]);
  const playerCrewIdx = 0;

  const [activeRunner, setActiveRunner] = useState(playerCrewIdx);
  const [crewLanes, setCrewLanes] = useState([1, 0, 2].slice(0, crew.length));
  const lane = crewLanes[activeRunner] ?? 1;

  const [timeLeft, setTimeLeft] = useState(45);
  const [stamina, setStamina] = useState(ability?.outrunBonus === "stamina" ? 115 : 100);
  const [distance, setDistance] = useState(0);
  const [horde, setHorde] = useState(18);
  const [objects, setObjects] = useState(seedTrack);
  const [scroll, setScroll] = useState(0);
  const [modal, setModal] = useState(null);
  const [shaking, setShaking] = useState(false);
  const [boostTicks, setBoostTicks] = useState(0);
  const [shieldLeft, setShieldLeft] = useState(ability?.outrunBonus === "shield" ? 1 : 0);
  const [actorAction, setActorAction] = useState(null);
  const [pickupStreak, setPickupStreak] = useState(0);
  const [dodgeCooldown, setDodgeCooldown] = useState(0);
  const [invulnTicks, setInvulnTicks] = useState(0);
  const [waveTicks, setWaveTicks] = useState(0);
  const [perfectDodges, setPerfectDodges] = useState(0);
  const hitRef = useRef(new Set());
  const { spawnPopup, PopupLayer } = usePopups();
  const { triggerCutIn, CutInLayer } = useAbilityCutIn();

  const phase = useMemo(() => getOutrunPhase(distance, horde), [distance, horde]);
  const hazardRate = (ability?.globalBonus === "hazardReduction" ? 0.12 : 0.2) * phase.hazardMult;
  const earlyWarn = ability?.outrunBonus === "earlyWarning";
  const trapResist = ability?.outrunBonus === "trapResistance" ? 0.45 : 1;
  const warnHorde = horde >= 65;
  const streakMult = 1 + Math.min(pickupStreak, 8) * 0.12;

  const speedMod = useMemo(() => {
    const base = (1 + (player.speed ?? 5) * 0.04 + (boostTicks > 0 ? 0.35 : 0)) * (phase.speedMult ?? 1);
    return Number.isFinite(base) ? base : 1;
  }, [player.speed, boostTicks, phase.speedMult]);

  const scorePts = useCallback((pts, x, y, text) => {
    const scaled = Math.floor(pts * streakMult);
    addScore(applyScoreBonus(scaled, player.id));
    if (text) spawnPopup(text, x, y, scaled >= 0 ? "score-popup" : "score-popup bad-popup");
  }, [addScore, player.id, spawnPopup, streakMult]);

  const pulseAction = (type) => {
    setActorAction(type);
    setTimeout(() => setActorAction((a) => (a === type ? null : a)), 450);
  };

  const switchRunner = useCallback((idx) => {
    if (idx >= crew.length) return;
    setActiveRunner(idx);
    spawnPopup(`Control: ${crew[idx].name}`, 50, 28, "score-popup ability-popup");
  }, [crew, spawnPopup]);

  const tryDodge = useCallback(() => {
    if (modal || dodgeCooldown > 0 || stamina < 8) return;
    setInvulnTicks(DODGE_IFRAMES);
    setDodgeCooldown(DODGE_COOLDOWN);
    setStamina((v) => Math.max(0, v - 8));
    pulseAction("boost");
    triggerCutIn(player);
    spawnPopup("DODGE!", 50, 48, "score-popup ability-popup");
  }, [modal, dodgeCooldown, stamina, spawnPopup, triggerCutIn, player]);

  const shake = () => {
    setShaking(true);
    pulseAction("hurt");
    setPickupStreak(0);
    setTimeout(() => setShaking(false), 280);
  };

  const finishWin = useCallback(() => {
    onWin({
      pickupStreak,
      supplyBonus: Math.min(3, Math.floor(pickupStreak / 3)),
      pressure: Math.max(0, Math.floor(horde / 25)),
      perfectDodges,
    });
  }, [onWin, pickupStreak, horde, perfectDodges]);

  useEffect(() => {
    const onKey = (e) => {
      if (modal) return;
      if (e.key === "1") switchRunner(0);
      if (e.key === "2" && crew.length > 1) switchRunner(1);
      if (e.key === "3" && crew.length > 2) switchRunner(2);
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
        setCrewLanes((lanes) => lanes.map((l, i) => (i === activeRunner ? Math.max(0, l - 1) : l)));
      }
      if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") {
        setCrewLanes((lanes) => lanes.map((l, i) => (i === activeRunner ? Math.min(2, l + 1) : l)));
      }
      if (e.key === " " || e.key.toLowerCase() === "shift") {
        e.preventDefault();
        tryDodge();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, tryDodge, activeRunner, crew.length, switchRunner]);

  useEffect(() => {
    if (modal) return;
    const timer = setInterval(() => setTimeLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(timer);
  }, [modal]);

  useEffect(() => {
    if (modal) return;
    const t = setInterval(() => {
      setCrewLanes((lanes) => lanes.map((l, i) => {
        if (i === activeRunner || Math.random() > 0.28) return l;
        const dir = Math.random() > 0.5 ? 1 : -1;
        return Math.max(0, Math.min(2, l + dir));
      }));
    }, 850);
    return () => clearInterval(t);
  }, [modal, activeRunner]);

  useEffect(() => {
    if (modal) return;
    const tick = setInterval(() => {
      setScroll((v) => (v + 1.8 * speedMod) % 100);
      setDistance((v) => {
        const next = Math.min(100, v + 0.5 * speedMod);
        return Number.isFinite(next) ? next : v;
      });
      setStamina((v) => Math.max(0, v - 0.34));
      setHorde((v) => Math.min(100, v + 0.44 * phase.hordeMult));
      if (boostTicks > 0) setBoostTicks((v) => v - 1);
      if (dodgeCooldown > 0) setDodgeCooldown((v) => v - 1);
      if (invulnTicks > 0) setInvulnTicks((v) => v - 1);

      const waveActive = waveTicks > 0;
      if (waveActive) setWaveTicks((v) => v - 1);

      setObjects((current) => {
        const waveSpeed = waveActive ? 1.8 : 0;
        const moved = current
          .map((o) => ({ ...o, x: o.x - (3.6 + waveSpeed) * speedMod }))
          .filter((o) => o.x > -8);

        const spawnChance = waveActive ? 0.72 : hazardRate + 0.18;
        if (Math.random() < spawnChance) moved.push(spawnItem(hazardRate, waveActive));

        if (waveActive && Math.random() < 0.68) {
          moved.push(spawnItem(hazardRate, true, true));
        }

        if (!waveActive && Math.random() < 0.045 * phase.hazardMult) {
          setWaveTicks(32);
          spawnPopup("ZOMBIE WAVE!", 50, 22, "score-popup bad-popup");
          for (let i = 0; i < 8; i += 1) {
            moved.push({ ...spawnItem(hazardRate, true, true), x: 70 + i * 8 + Math.random() * 4 });
          }
        }

        return moved;
      });
    }, 80);
    return () => clearInterval(tick);
  }, [modal, speedMod, hazardRate, boostTicks, dodgeCooldown, invulnTicks, waveTicks, phase, spawnPopup]);

  useEffect(() => {
    if (modal) return;
    const hitMin = earlyWarn ? 8 : 12;
    const hitMax = earlyWarn ? 28 : 24;

    objects.forEach((obj) => {
      if (hitRef.current.has(obj.id)) return;
      if (obj.lane !== lane || obj.x < hitMin || obj.x > hitMax) return;
      hitRef.current.add(obj.id);

      if (obj.kind === "good") {
        const crit = rollLuck(player.luck);
        setPickupStreak((s) => s + 1);

        if (obj.type === "coffee") {
          setStamina((v) => Math.min(120, v + 16));
          scorePts(crit ? 240 : 120, 55, 35, crit ? "CRIT! ☕ x2" : "+120 ☕");
        }
        if (obj.type === "rations") {
          setStamina((v) => Math.min(120, v + 24));
          scorePts(crit ? 360 : 180, 55, 35, crit ? "CRIT! 🥫 x2" : "+180 🥫");
        }
        if (obj.type === "speed") {
          const boostAmt = ability?.outrunBonus === "boostDuration" ? 12 : 6;
          setDistance((v) => Math.min(100, Number.isFinite(v) ? v + boostAmt : boostAmt));
          setBoostTicks(ability?.outrunBonus === "boostDuration" ? 28 : 14);
          setHorde((v) => Math.max(0, v - 10));
          pulseAction("boost");
          triggerCutIn(player);
          scorePts(crit ? 500 : 250, 55, 35, crit ? "LUCKY BOOST!" : "SPEED BOOST!");
        }
        if (obj.type === "medkit") {
          setStamina((v) => Math.min(120, v + 30));
          setHorde((v) => Math.max(0, v - 6));
          scorePts(150, 55, 35, "MEDKIT!");
        }
        if (obj.type === "flare") {
          setHorde((v) => Math.max(0, v - 22));
          scorePts(200, 55, 35, "FLARE — HORDE BACK!");
        }
      } else if (invulnTicks > 0) {
        setPerfectDodges((v) => v + 1);
        scorePts(80, 50, 40, "PERFECT DODGE!");
        spawnPopup("WHIFF!", 50, 40, "score-popup ability-popup");
      } else if (shieldLeft > 0) {
        setShieldLeft((v) => v - 1);
        triggerCutIn(player);
        spawnPopup("BRUISER BLOCK!", 50, 30, "score-popup ability-popup");
      } else {
        shake();
        if (obj.type === "debris") {
          setStamina((v) => Math.max(0, v - 18));
          scorePts(-40, 55, 35, "-40 🪨");
        }
        if (obj.type === "hands" || obj.type === "zombie") {
          setHorde((v) => Math.min(100, v + 14));
          setStamina((v) => Math.max(0, v - 12));
          scorePts(-80, 55, 35, "-80 🧟");
        }
        if (obj.type === "noise") {
          const noiseDmg = 22 * trapResist;
          setHorde((v) => Math.min(100, v + noiseDmg));
          scorePts(-60, 55, 35, "NOISE TRAP!");
        }
        if (obj.type === "pit") {
          setStamina((v) => Math.max(0, v - 28));
          setHorde((v) => Math.min(100, v + 10));
          scorePts(-120, 55, 35, "SINKHOLE!");
        }
      }
      setObjects((c) => c.filter((i) => i.id !== obj.id));
    });
  }, [objects, lane, modal, ability, earlyWarn, trapResist, shieldLeft, invulnTicks, scorePts, spawnPopup, player.luck, triggerCutIn, player]);

  useEffect(() => {
    if (modal) return;
    if (distance >= 100) { addScore(applyScoreBonus(1500, player.id)); setModal("win"); }
    else if (stamina <= 0 || horde >= 100) setModal("lose");
    else if (timeLeft <= 0 && distance < 100) setModal("lose");
  }, [distance, stamina, horde, timeLeft, modal, addScore, player.id]);

  const hordePush = Math.min(38, horde * 0.34);

  return (
    <main className={`screen outrun-scene ${shaking ? "damage-shake" : ""} ${warnHorde ? "warning-flash" : ""} ${invulnTicks > 0 ? "dodge-active" : ""} ${waveTicks > 0 ? "wave-active" : ""}`}>
      <div className="scene-bg outrun-bg" style={{ backgroundPosition: `${-scroll}% 50%` }} aria-hidden="true" />
      <div className="scene-overlay" aria-hidden="true" />
      <Hud time={formatTime(timeLeft)} score={score} onHome={onRoster} />
      <div className="hud-portrait-slot">
        <HudPortrait survivor={player} sublabel={player.abilityName} />
      </div>
      <CutInLayer />
      <PopupLayer />
      <PhaseBanner label={waveTicks > 0 ? "ZOMBIE WAVE!" : phase.label} phase={waveTicks > 0 ? "surge" : phase.id} />

      <section className="scene-title compact-title">
        <h1>Challenge 1</h1>
        <h2>Outrun the Zombie Horde</h2>
        {ability && <p className="ability-tag">{ability.name}: {ability.description}</p>}
      </section>

      <div className="crew-switch-row">
        {crew.map((member, i) => (
          <button
            key={member.id}
            type="button"
            className={`crew-switch-btn ${i === activeRunner ? "active" : ""}`}
            onClick={() => switchRunner(i)}
          >
            <img src={member.img} alt={member.name} />
            <span>{member.name}</span>
            {i === activeRunner && <b>YOU</b>}
          </button>
        ))}
      </div>

      <div className="run-status-row">
        <StatusChip label="Pickup Streak" value={`x${pickupStreak}`} sub={pickupStreak >= 3 ? `+${Math.round((streakMult - 1) * 100)}% score` : "Chain pickups"} tone={pickupStreak >= 5 ? "gold" : "green"} />
        <StatusChip label="Phase" value={phase.id.toUpperCase()} tone={phase.id === "surge" ? "red" : "blue"} />
        {waveTicks > 0 && <StatusChip label="Event" value="ZOMBIE WAVE" tone="red" />}
      </div>

      <div className="runner-stage arcade-panel" style={{ "--lane": lane, "--scroll": scroll, "--horde": horde }}>
        <div className="horde-surge-fill" style={{ width: `${hordePush}%` }} aria-hidden="true" />

        <div className="zombie-horde-left" style={{ transform: `translateX(${hordePush * 0.6}%)` }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="horde-zombie" style={{ animationDelay: `${i * 0.08}s` }}>
              {i % 3 === 0 ? "🧟‍♂️" : i % 3 === 1 ? "🧟‍♀️" : "🧟"}
            </span>
          ))}
        </div>

        <div className="horde-wave-front" style={{ left: `${hordePush - 4}%` }} aria-hidden="true">
          {["🧟", "🧟‍♂️", "🧟‍♀️", "🧟", "🧟"].map((z, i) => (
            <span key={i} className="wave-zombie">{z}</span>
          ))}
        </div>

        {[0, 1, 2].map((row) => (
          <div className={`runner-lane ${lane === row ? "active-lane" : ""}`} key={row}>
            <span className="lane-prop left fire-glow">{LANE_PROPS[row][0]}</span>
            <span className="lane-prop right">{LANE_PROPS[row][1]}</span>
            <div className="lane-marker scrolling-lane" />

            {objects.filter((o) => o.lane === row).map((obj) => (
              <div
                key={obj.id}
                className={`track-object ${obj.kind} ${obj.type} ${obj.rare ? "rare-item" : ""} ${earlyWarn && obj.kind === "bad" && obj.x > 55 ? "early-warn" : ""}`}
                style={{ left: `${obj.x}%` }}
                title={obj.label}
              >
                <span className="track-object-icon">{obj.icon}</span>
              </div>
            ))}
          </div>
        ))}

        {crew.map((member, i) => (
          <div
            key={member.id}
            className={`stage-runner-wrap ${i === activeRunner ? "active-crew" : "npc-crew"}`}
            style={{ "--lane": crewLanes[i] }}
          >
            <SurvivorToken
              survivor={member}
              size="md"
              pose={i === activeRunner ? "run" : "idle"}
              glowing={i === activeRunner && (boostTicks > 0 || invulnTicks > 0)}
              active={i === activeRunner}
              className="stage-runner"
            />
            {i === activeRunner && shieldLeft > 0 && <span className="shield-badge stage-shield">🛡️</span>}
          </div>
        ))}
      </div>

      <div className="meters outrun-meters">
        <Meter label="Distance to Safe Zone" value={Number.isFinite(distance) ? distance : 0} />
        <Meter label="Stamina" value={Math.min(100, stamina)} />
        <Meter label="Horde Danger" value={horde} danger />
        <CooldownMeter label="Dodge Roll (Space)" value={dodgeCooldown} max={DODGE_COOLDOWN} />
      </div>
      <p className="instructions">1/2/3 switch runner · ↑↓ move lane · Space dodge · 🧟 hazards scroll from the right</p>

      {modal === "win" && (
        <ResultModal title="YOU OUTRAN THE HORDE!" body={`Streak ${pickupStreak} · ${perfectDodges} perfect dodges. Mess hall awaits.`} primary="SCOREBOARD →" onPrimary={finishWin} onSecondary={onRoster} />
      )}
      {modal === "lose" && (
        <ResultModal title="YOU GOT NOMMED" body="The horde caught your scent." primary="TRY AGAIN" onPrimary={onRetry} secondary="GAME OVER →" onSecondary={onGameOver} />
      )}
    </main>
  );
}
