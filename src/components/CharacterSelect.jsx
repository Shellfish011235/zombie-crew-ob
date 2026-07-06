import { useState } from 'react'
import { players, statLegend } from '../data/players'
import { PlayerCard } from './PlayerCard'

export function CharacterSelect({ onStart }) {
  const [selectedId, setSelectedId] = useState(1)
  const selected = players.find((p) => p.id === selectedId)

  return (
    <div className="game-screen character-select">
      <div className="hud hud-left">
        <div className="hud-box">
          <span className="hud-label">TIME LEFT</span>
          <span className="hud-value green">01:30</span>
        </div>
      </div>

      <div className="hud hud-right">
        <div className="hud-box">
          <span className="hud-label">SCORE</span>
          <span className="hud-value yellow">12,450 🎯</span>
        </div>
      </div>

      <header className="game-title">
        <h1>
          <span className="title-out">OUTRUN</span>
          <span className="title-horde">THE ZOMBIE HORDE!</span>
        </h1>
        <p className="title-tagline">PICK A RUNNER. SURVIVE. DON&apos;T GET NOMMED.</p>
      </header>

      <div className="player-grid">
        {players.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            selected={selectedId === player.id}
            onSelect={setSelectedId}
          />
        ))}
      </div>

      {selected && (
        <div className="selected-preview">
          <img src={selected.image} alt={selected.name} className="preview-img" />
          <div>
            <h2>{selected.name}</h2>
            <p>{selected.description}</p>
          </div>
        </div>
      )}

      <footer className="game-footer">
        <div className="tips-sign">
          💡 TIPS: BALANCE YOUR STATS, COLLECT POWER-UPS, AND STAY ALIVE!
        </div>

        <div className="stat-legend">
          {statLegend.map((item) => (
            <span key={item.label} className="legend-item">
              {item.icon} {item.label}
            </span>
          ))}
        </div>

        <button type="button" className="go-btn" onClick={() => onStart(selected)}>
          LET&apos;S GO! ➜
        </button>
      </footer>
    </div>
  )
}

export default CharacterSelect
