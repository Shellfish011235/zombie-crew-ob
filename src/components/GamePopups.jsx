import { useCallback, useState } from "react";

export function usePopups() {
  const [popups, setPopups] = useState([]);

  const spawnPopup = useCallback((text, x = 50, y = 40, className = "score-popup") => {
    const id = crypto.randomUUID();
    setPopups((p) => [...p, { id, text, x, y, className }]);
    setTimeout(() => setPopups((p) => p.filter((item) => item.id !== id)), 850);
  }, []);

  const PopupLayer = ({ containerClass = "" }) => (
    <div className={`popup-layer ${containerClass}`} aria-hidden="true">
      {popups.map((p) => (
        <span key={p.id} className={p.className} style={{ left: `${p.x}%`, top: `${p.y}%` }}>
          {p.text}
        </span>
      ))}
    </div>
  );

  return { spawnPopup, PopupLayer };
}
