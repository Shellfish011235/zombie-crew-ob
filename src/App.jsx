import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const players = [
  {
    id: 1,
    name: "Player 1",
    role: "The Storm Runner",
    img: "/players/player1.png",
    speed: 9,
    stamina: 7,
    luck: 6,
    color: "blue",
  },
  {
    id: 2,
    name: "Player 2",
    role: "The Signal Ghost",
    img: "/players/player2.png",
    speed: 7,
    stamina: 8,
    luck: 5,
    color: "orange",
  },
  {
    id: 3,
    name: "Player 3",
    role: "The Archivist",
    img: "/players/player3.png",
    speed: 5,
    stamina: 8,
    luck: 7,
    color: "green",
  },
  {
    id: 4,
    name: "Player 4",
    role: "The Scout",
    img: "/players/player4.png",
    speed: 8,
    stamina: 6,
    luck: 8,
    color: "pink",
  },
  {
    id: 5,
    name: "Player 5",
    role: "The Gentleman Tank",
    img: "/players/player5.png",
    speed: 5,
    stamina: 9,
    luck: 6,
    color: "gold",
  },
  {
    id: 6,
    name: "Player 6",
    role: "The Strategist",
    img: "/players/player6.png",
    speed: 6,
    stamina: 6,
    luck: 9,
    color: "purple",
  },
  {
    id: 7,
    name: "Player 7",
    role: "The Bruiser",
    img: "/players/player7.png",
    speed: 6,
    stamina: 9,
    luck: 4,
    color: "red",
  },
  {
    id: 8,
    name: "Player 8",
    role: "The Operator",
    img: "/players/player8.png",
    speed: 7,
    stamina: 8,
    luck: 6,
    color: "teal",
  },
  {
    id: 9,
    name: "Player 9",
    role: "The Medic",
    img: "/players/player9.png",
    speed: 5,
    stamina: 7,
    luck: 8,
    color: "orange",
  },
  {
    id: 10,
    name: "Player 10",
    role: "The Silent Blade",
    img: "/players/player10.png",
    speed: 8,
    stamina: 6,
    luck: 7,
    color: "green",
  },
];

function StatBars({ label, value }) {
  return (
    <div className="stat-row">
      <span>{label}</span>
      <div className="bars">
        {Array.from({ length: 10 }).map((_, i) => (
          <b key={i} className={i < value ? "filled" : ""} />
        ))}
      </div>
    </div>
  );
}

function PlayerCard({ player, selected, onClick }) {
  return (
    <button
      className={`player-card ${player.color} ${selected ? "selected" : ""}`}
      onClick={onClick}
    >
      <div className="card-number">{player.id}</div>
      <div className="portrait-wrap">
        <img
          src={player.img}
          alt={player.name}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <div className="portrait-fallback">P{player.id}</div>
      </div>
      <div className="player-name">{player.name}</div>
      <div className="player-role">{player.role}</div>
      <StatBars label="Speed" value={player.speed} />
      <StatBars label="Stamina" value={player.stamina} />
      <StatBars label="Luck" value={player.luck} />
    </button>
  );
}

function SelectionScene({ selectedPlayer, setSelectedPlayer, startGame }) {
  return (
    <main className="screen selection-screen">
      <Hud />
      <section className="hero-title">
        <h1>OUTRUN THE ZOMBIE HORDE!</h1>
        <h2>CHOOSE YOUR SURVIVOR</h2>
      </section>

      <section className="player-grid">
        {players.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            selected={selectedPlayer?.id === player.id}
            onClick={() => setSelectedPlayer(player)}
          />
        ))}
      </section>

      <section className="bottom-bar">
        <div className="tips">
          <strong>TIPS:</strong> Balance your stats. Collect power-ups. Stay alive.
        </div>
        <button
          className="big-button"
          disabled={!selectedPlayer}
          onClick={startGame}
        >
          LET&apos;S GO!
        </button>
      </section>
    </main>
  );
}

function Hud({ score = 12450, time = "01:30" }) {
  return (
    <>
      <div className="hud hud-left">
        <small>TIME LEFT</small>
        <strong>{time}</strong>
      </div>
      <div className="hud hud-right">
        <small>SCORE</small>
        <strong>{score.toLocaleString()}</strong>
      </div>
    </>
  );
}

function OutrunScene({ player, nextScene, resetGame }) {
  const [lane, setLane] = useState(1);
  const [time, setTime] = useState(30);
  const [stamina, setStamina] = useState(100);
  const [distance, setDistance] = useState(0);
  const [zombieHeat, setZombieHeat] = useState(25);
  const [objects, setObjects] = useState([]);
  const [result, setResult] = useState(null);

  const playerSpeed = player.speed;
  const playerStamina = player.stamina;

  useEffect(() => {
    const keyHandler = (e) => {
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
        setLane((v) => Math.max(0, v - 1));
      }
      if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") {
        setLane((v) => Math.min(2, v + 1));
      }
    };

    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  }, []);

  useEffect(() => {
    if (result) return;

    const timer = setInterval(() => {
      setTime((v) => {
        if (v <= 1) {
          setResult(distance >= 100 ? "survived" : "caught");
          return 0;
        }
        return v - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [result, distance]);

  useEffect(() => {
    if (result) return;

    const tick = setInterval(() => {
      setDistance((v) => Math.min(100, v + 1.3 + playerSpeed * 0.12));
      setStamina((v) => Math.max(0, v - (1.1 - playerStamina * 0.04)));
      setZombieHeat((v) => Math.min(100, v + 0.8));

      setObjects((current) => {
        const moved = current
          .map((obj) => ({ ...obj, x: obj.x - 4 }))
          .filter((obj) => obj.x > -10);

        if (Math.random() < 0.16) {
          moved.push({
            id: crypto.randomUUID(),
            x: 100,
            lane: Math.floor(Math.random() * 3),
            type: Math.random() > 0.48 ? "boost" : "hazard",
          });
        }

        return moved;
      });
    }, 120);

    return () => clearInterval(tick);
  }, [result, playerSpeed, playerStamina]);

  useEffect(() => {
    objects.forEach((obj) => {
      if (obj.x > 10 && obj.x < 18 && obj.lane === lane) {
        if (obj.type === "boost") {
          setDistance((v) => Math.min(100, v + 8));
          setStamina((v) => Math.min(100, v + 10));
          setZombieHeat((v) => Math.max(0, v - 10));
        } else {
          setStamina((v) => Math.max(0, v - 16));
          setZombieHeat((v) => Math.min(100, v + 15));
        }

        setObjects((current) => current.filter((item) => item.id !== obj.id));
      }
    });
  }, [objects, lane]);

  useEffect(() => {
    if (distance >= 100) setResult("survived");
    if (stamina <= 0 || zombieHeat >= 100) setResult("caught");
  }, [distance, stamina, zombieHeat]);

  return (
    <main className="screen game-screen">
      <Hud time={`00:${String(time).padStart(2, "0")}`} score={Math.floor(distance * 100)} />

      <section className="scene-title">
        <h1>Challenge 1</h1>
        <h2>Outrun the Zombie Horde</h2>
      </section>

      <div className="runner-stage">
        <div className="zombie-wall">🧟 🧟‍♂️ 🧟 🧟‍♀️ 🧟</div>

        {[0, 1, 2].map((row) => (
          <div className="runner-lane" key={row}>
            {lane === row && (
              <div className="runner">
                <img src={player.img} alt={player.name} />
                <span>{player.name}</span>
              </div>
            )}

            {objects
              .filter((obj) => obj.lane === row)
              .map((obj) => (
                <div
                  key={obj.id}
                  className={`track-object ${obj.type}`}
                  style={{ left: `${obj.x}%` }}
                >
                  {obj.type === "boost" ? "⚡" : "☠️"}
                </div>
              ))}
          </div>
        ))}
      </div>

      <div className="meters">
        <Meter label="Distance" value={distance} />
        <Meter label="Stamina" value={stamina} />
        <Meter label="Zombie Heat" value={zombieHeat} danger />
      </div>

      <p className="instructions">Use ↑ ↓ or W/S to switch lanes. Collect ⚡. Dodge ☠️.</p>

      {result && (
        <ResultPanel
          title={result === "survived" ? "YOU OUTRAN THE HORDE" : "YOU GOT NOMMED"}
          body={
            result === "survived"
              ? "You made it to the safe zone. Next challenge unlocked."
              : "The horde caught up. Try again or keep building."
          }
          primary={result === "survived" ? "NEXT CHALLENGE" : "TRY AGAIN"}
          onPrimary={result === "survived" ? nextScene : resetGame}
          secondary="ROSTER"
          onSecondary={resetGame}
        />
      )}
    </main>
  );
}

function PlateLickingScene({ player, nextScene, resetGame }) {
  const [time, setTime] = useState(20);
  const [clean, setClean] = useState(0);
  const [rival, setRival] = useState(0);
  const [combo, setCombo] = useState(1);
  const [result, setResult] = useState(null);

  const tap = () => {
    if (result) return;
    const boost = 2.5 + player.stamina * 0.25;
    setClean((v) => Math.min(100, v + boost * combo));
    setCombo((v) => Math.min(5, v + 0.15));
  };

  useEffect(() => {
    if (result) return;

    const timer = setInterval(() => {
      setTime((v) => {
        if (v <= 1) {
          setResult(clean >= rival ? "won" : "lost");
          return 0;
        }
        return v - 1;
      });
      setRival((v) => Math.min(100, v + 3.5 + Math.random() * 3));
      setCombo((v) => Math.max(1, v - 0.08));
    }, 650);

    return () => clearInterval(timer);
  }, [result, clean, rival]);

  useEffect(() => {
    if (clean >= 100) setResult("won");
    if (rival >= 100) setResult("lost");
  }, [clean, rival]);

  return (
    <main className="screen plate-screen" onClick={tap}>
      <Hud time={`00:${String(time).padStart(2, "0")}`} score={Math.floor(clean * 80)} />

      <section className="scene-title">
        <h1>Challenge 2</h1>
        <h2>Plate Licking Showdown</h2>
      </section>

      <div className="plate-arena">
        <div className="contestant">
          <img src={player.img} alt={player.name} />
          <strong>{player.name}</strong>
          <div className="plate">🍽️</div>
          <Meter label="Your Plate" value={clean} />
        </div>

        <div className="versus">
          <span>VS</span>
          <b>Every crumb is sacred.</b>
          <button className="smash-button" onClick={tap}>LICK IT CLEAN!</button>
          <small>Click fast or press the button.</small>
          <strong>Combo x{combo.toFixed(1)}</strong>
        </div>

        <div className="contestant rival">
          <div className="rival-face">🧟‍♂️</div>
          <strong>Hungry Rival</strong>
          <div className="plate">🍽️</div>
          <Meter label="Rival Plate" value={rival} danger />
        </div>
      </div>

      {result && (
        <ResultPanel
          title={result === "won" ? "PLATE CLEANED" : "RATIONS LOST"}
          body={
            result === "won"
              ? "No crumbs left behind. Apocalypse etiquette restored."
              : "The rival cleaned faster. That is embarrassing, but fixable."
          }
          primary={result === "won" ? "FINAL CHALLENGE" : "TRY AGAIN"}
          onPrimary={result === "won" ? nextScene : resetGame}
          secondary="ROSTER"
          onSecondary={resetGame}
        />
      )}
    </main>
  );
}

function BubblePopScene({ player, resetGame }) {
  const [time, setTime] = useState(25);
  const [bubbles, setBubbles] = useState(() => makeBubbles(18));
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (result) return;

    const timer = setInterval(() => {
      setTime((v) => {
        if (v <= 1) {
          setResult(bubbles.length === 0 ? "won" : "lost");
          return 0;
        }
        return v - 1;
      });

      setCombo((v) => Math.max(1, v - 0.05));
    }, 1000);

    return () => clearInterval(timer);
  }, [result, bubbles.length]);

  useEffect(() => {
    if (bubbles.length === 0) setResult("won");
  }, [bubbles.length]);

  const popBubble = (id) => {
    if (result) return;
    setBubbles((current) => current.filter((b) => b.id !== id));
    setScore((v) => v + Math.floor(100 * combo));
    setCombo((v) => Math.min(10, v + 0.5));
  };

  return (
    <main className="screen bubble-screen">
      <Hud time={`00:${String(time).padStart(2, "0")}`} score={score} />

      <section className="scene-title">
        <h1>Challenge 3</h1>
        <h2>Bath Time Bubble Pop</h2>
      </section>

      <div className="bath-stage">
        <div className="bath-player">
          <img src={player.img} alt={player.name} />
          <span>{player.name}</span>
          <b>🛁</b>
        </div>

        {bubbles.map((bubble) => (
          <button
            key={bubble.id}
            className="bubble"
            style={{
              left: `${bubble.x}%`,
              top: `${bubble.y}%`,
              width: `${bubble.size}px`,
              height: `${bubble.size}px`,
            }}
            onClick={() => popBubble(bubble.id)}
          >
            🫧
          </button>
        ))}

        <div className="duck-cannon">🦆</div>
      </div>

      <div className="meters">
        <Meter label="Bubbles Left" value={(bubbles.length / 18) * 100} danger />
        <Meter label="Combo" value={combo * 10} />
      </div>

      <p className="instructions">Click the bubbles with the rubber duck before they escape.</p>

      {result && (
        <ResultPanel
          title={result === "won" ? "CLEAN SURVIVOR BONUS" : "THE BUBBLES WON"}
          body={
            result === "won"
              ? "You survived the apocalypse and still found time for hygiene."
              : "The bath got away from you. The horde is judging silently."
          }
          primary="PLAY AGAIN"
          onPrimary={resetGame}
          secondary="ROSTER"
          onSecondary={resetGame}
        />
      )}
    </main>
  );
}

function makeBubbles(count) {
  return Array.from({ length: count }).map(() => ({
    id: crypto.randomUUID(),
    x: 8 + Math.random() * 82,
    y: 18 + Math.random() * 62,
    size: 42 + Math.random() * 32,
  }));
}

function Meter({ label, value, danger }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="meter">
      <div className="meter-label">
        <span>{label}</span>
        <b>{Math.round(safeValue)}%</b>
      </div>
      <div className={`meter-track ${danger ? "danger" : ""}`}>
        <div style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

function ResultPanel({ title, body, primary, onPrimary, secondary, onSecondary }) {
  return (
    <div className="overlay">
      <div className="result-panel">
        <h2>{title}</h2>
        <p>{body}</p>
        <div className="result-actions">
          <button className="big-button" onClick={onPrimary}>{primary}</button>
          <button className="ghost-button" onClick={onSecondary}>{secondary}</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [selectedPlayer, setSelectedPlayer] = useState(players[0]);
  const [scene, setScene] = useState("select");

  const resetGame = () => {
    setScene("select");
  };

  return (
    <>
      {scene === "select" && (
        <SelectionScene
          selectedPlayer={selectedPlayer}
          setSelectedPlayer={setSelectedPlayer}
          startGame={() => setScene("outrun")}
        />
      )}

      {scene === "outrun" && (
        <OutrunScene
          player={selectedPlayer}
          nextScene={() => setScene("plate")}
          resetGame={resetGame}
        />
      )}

      {scene === "plate" && (
        <PlateLickingScene
          player={selectedPlayer}
          nextScene={() => setScene("bubble")}
          resetGame={resetGame}
        />
      )}

      {scene === "bubble" && (
        <BubblePopScene
          player={selectedPlayer}
          resetGame={resetGame}
        />
      )}
    </>
  );
}
