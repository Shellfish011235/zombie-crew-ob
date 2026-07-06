import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAbility, applyScoreBonus } from "../data/abilities";
import { getRivalModifier } from "../data/gameSystems";
import { usePopups } from "../components/GamePopups";
import { Hud, PlateProgressHud, ResultModal, SpeedGauge, formatTime } from "../components/GameUI";
import { PlateWipe, RivalPlateView } from "../components/PlateWipe";
import { HudPortrait, SurvivorToken } from "../components/SurvivorToken";
import { useAbilityCutIn } from "../components/AbilityCutIn";

const TRASH_TALK = [
  "My tongue is a certified weapon!",
  "That plate is MINE, partner.",
  "I've licked worse in the bunker.",
  "Crumb by crumb, you're going down.",
  "Apocalypse etiquette: lick faster.",
];

export function PlateScene({ player, rival, score, addScore, runState, onWin, onRetry, onGameOver, onRoster }) {
  const ability = getAbility(player.id);
  const rivalMod = useMemo(() => getRivalModifier(rival), [rival]);
  const comboDecay = ability?.plateBonus === "comboHold" ? 0.025 : 0.055;
  const startCombo = 1 + Math.min(runState?.pickupStreak ?? 0, 6) * 0.08;

  const [timeLeft, setTimeLeft] = useState(42);
  const [clean, setClean] = useState(0);
  const [rivalClean, setRivalClean] = useState(0);
  const [combo, setCombo] = useState(startCombo);
  const [lickSpeed, setLickSpeed] = useState(0);
  const [boostTicks, setBoostTicks] = useState(0);
  const [modal, setModal] = useState(null);
  const [trashTalk, setTrashTalk] = useState("");
  const [playerAction, setPlayerAction] = useState(null);
  const [rivalAction, setRivalAction] = useState(null);
  const [rivalSurge, setRivalSurge] = useState(false);
  const rivalCleanRef = useRef(0);
  const speedDecay = useRef(null);
  const { spawnPopup, PopupLayer } = usePopups();
  const { triggerCutIn, CutInLayer } = useAbilityCutIn();

  const lickPower = 1 + player.stamina * 0.04 + (runState?.supplyBonus ?? 0) * 0.15;

  const pulseAction = (who, type) => {
    const setter = who === "player" ? setPlayerAction : setRivalAction;
    setter(type);
    setTimeout(() => setter((a) => (a === type ? null : a)), 420);
  };

  const bumpSpeed = useCallback((power, circularHint) => {
    const circularBonus = circularHint > 0 ? 18 : 0;
    const next = Math.min(100, lickSpeed * 0.55 + power * 55 + circularBonus);
    setLickSpeed(next);
    if (speedDecay.current) clearTimeout(speedDecay.current);
    speedDecay.current = setTimeout(() => setLickSpeed((v) => Math.max(0, v - 22)), 180);
  }, [lickSpeed]);

  const handleWipe = useCallback(({ power, circularHint }) => {
    if (modal) return;
    pulseAction("player", "lick");
    bumpSpeed(power, circularHint);

    if (circularHint > 0.25) {
      setCombo((v) => Math.min(12, v + 0.08 + circularHint * 0.05));
    }

    const speedBonus = lickSpeed / 100;
    const pts = applyScoreBonus(Math.floor((8 + speedBonus * 14) * combo * lickPower), player.id);
    if (pts > 0) addScore(pts);

    if (circularHint > 0.4 && combo >= 2) {
      spawnPopup("Circle lick!", 50, 42, "score-popup ability-popup");
    } else if (lickSpeed > 75) {
      spawnPopup("Tongue turbo!", 50, 46, "score-popup");
    }
  }, [modal, bumpSpeed, lickSpeed, combo, lickPower, addScore, player.id, spawnPopup]);

  const handleProgress = useCallback((pct) => {
    setClean(Math.min(100, pct));
  }, []);

  const burstLick = () => {
    if (modal) return;
    setBoostTicks(18);
    setLickSpeed(100);
    setCombo((v) => Math.min(12, v + 0.35));
    pulseAction("player", "lick");
    setClean((v) => Math.min(100, v + 4 * lickPower));
    addScore(applyScoreBonus(Math.floor(60 * combo), player.id));
    triggerCutIn(player);
    spawnPopup("LICK SURGE!", 50, 40, "score-popup ability-popup");
  };

  useEffect(() => {
    if (modal) return;
    const t = setInterval(() => setTimeLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [modal]);

  useEffect(() => {
    if (modal) return;
    const t = setInterval(() => {
      const surge = Math.random() < rivalMod.surgeChance;
      setRivalSurge(surge);
      const rivalRate = 1.4 + rival.speed * 0.11 + rivalMod.speedBonus * (surge ? 2.4 : 1) + Math.random() * 1.2;
      setRivalClean((v) => Math.min(100, v + rivalRate));
      setCombo((v) => Math.max(1, v - comboDecay));
      if (boostTicks > 0) setBoostTicks((v) => v - 1);
      if (Math.random() < 0.14) {
        setTrashTalk(TRASH_TALK[Math.floor(Math.random() * TRASH_TALK.length)]);
      }
    }, 500);
    return () => clearInterval(t);
  }, [modal, rival, comboDecay, rivalMod, boostTicks]);

  useEffect(() => {
    if (rivalClean > rivalCleanRef.current + 0.5) pulseAction("rival", "lick");
    rivalCleanRef.current = rivalClean;
  }, [rivalClean]);

  useEffect(() => {
    if (modal) return;
    if (clean >= 99.5) { addScore(applyScoreBonus(1200, player.id)); setModal("win"); }
    else if (rivalClean >= 100) setModal("lose");
    else if (timeLeft <= 0) setModal(clean >= rivalClean ? "win" : "lose");
  }, [clean, rivalClean, timeLeft, modal, addScore, player.id]);

  const rivalTag = rivalSurge ? "CRUMB DESTROYER!" : rivalMod.label;

  return (
    <main className="screen plate-scene plate-showdown">
      <div className="scene-bg plate-bg" aria-hidden="true" />
      <div className="scene-overlay plate-vignette" aria-hidden="true" />
      <Hud time={formatTime(timeLeft)} score={score} onHome={onRoster} />
      <div className="hud-portrait-slot">
        <HudPortrait survivor={player} sublabel={player.abilityName} />
      </div>
      <CutInLayer />
      <PopupLayer />

      <section className="scene-title plate-showdown-title">
        <h1>Plate Licking Showdown!</h1>
        <h2>Waste nothing. Clean everything.</h2>
        {ability && <p className="ability-tag">{ability.name}: {ability.description}</p>}
      </section>

      <div className="showdown-stage arcade-panel">
        <div className="showdown-table" aria-hidden="true" />

        <div className="showdown-side player-side">
          <SurvivorToken
            survivor={player}
            size="lg"
            pose="lick"
            active
            className="showdown-actor"
          />
          <PlateWipe
            onProgress={handleProgress}
            onWipe={handleWipe}
            disabled={!!modal}
            boost={boostTicks > 0 ? 1.45 : 1}
            className="player-plate"
          />
        </div>

        <div className="showdown-side rival-side">
          <SurvivorToken
            survivor={rival}
            size="lg"
            pose="lick"
            className="showdown-actor contestant-rival"
          />
          <RivalPlateView progress={rivalClean} />
          {trashTalk && <div className="trash-bubble showdown-trash">{trashTalk}</div>}
        </div>
      </div>

      <div className="showdown-footer">
        <PlateProgressHud name={player.name} img={player.img} value={clean} combo={combo} />
        <div className="showdown-center-controls">
          <SpeedGauge value={lickSpeed} />
          <p className="plate-tip">💡 Lick in circles (mouse) or swipe fast (touch) to wipe every last crumb!</p>
          <button type="button" className="smash-button showdown-cta" onClick={burstLick}>LICK IT CLEAN! ➜</button>
        </div>
        <PlateProgressHud name={rival.name} img={rival.img} value={rivalClean} tag={rivalTag} danger combo={rivalSurge ? 12 : 1} />
      </div>

      {modal === "win" && (
        <ResultModal title="PLATE CLEANED!" body="Zero crumbs. Sparkling metal. Bubble bath unlocked." primary="SCOREBOARD →" onPrimary={onWin} onSecondary={onRoster} />
      )}
      {modal === "lose" && (
        <ResultModal title="RATIONS LOST" body={`${rival.name} licked faster.`} primary="TRY AGAIN" onPrimary={onRetry} secondary="GAME OVER →" onSecondary={onGameOver} />
      )}
    </main>
  );
}
