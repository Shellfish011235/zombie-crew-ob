/**
 * Bathtub setpiece — tub shell + small survivor token + duck cannon.
 * Full portrait only appears in HUD / ability cut-ins.
 */
import "./BathTubPlayer.css";
import { SurvivorToken } from "./SurvivorToken";

export function BathTubPlayer({
  survivor,
  aimAngle = -20,
  shooting = false,
  duckRef,
}) {
  if (!survivor) return null;

  return (
    <div className={`tub-setpiece bather-${survivor.color}`}>
      <div className="tub-metal-shell">
        <div className="tub-back-rim" aria-hidden="true" />
        <div className="tub-water-fill" aria-hidden="true">
          <div className="water-shimmer" />
        </div>

        <div className="bather-composite">
          <div className="bather-token-slot">
            <SurvivorToken
              survivor={survivor}
              size="md"
              pose="bath"
              active
              className="tub-survivor-token"
            />
          </div>

          <div className="bather-suds-layer" aria-hidden="true">
            <span className="sud-blob" />
            <span className="sud-blob" />
            <span className="sud-blob" />
            <span className="sud-blob" />
          </div>

          <div className="bather-arm-duck">
            <div className="bather-arm-shape" aria-hidden="true" />
            <div className="duck-aim-pivot" style={{ transform: `rotate(${aimAngle}deg)` }}>
              <div ref={duckRef} className={`duck-squirt-gun ${shooting ? "recoil-kick" : ""}`}>
                <img src="/ui/duck.svg" alt="" className="squirt-duck-img" draggable={false} />
                <span className="squirt-nozzle" />
                {shooting && <span className="squirt-burst" aria-hidden="true" />}
              </div>
            </div>
          </div>
        </div>

        <div className="tub-rim-front" aria-hidden="true" />
        <span className="tub-toy-duck" aria-hidden="true">🦆</span>
        <div className="tub-claw-feet" aria-hidden="true">
          <span /><span /><span /><span />
        </div>
      </div>

      <div className="tub-towel-rack" aria-hidden="true">
        <span className="towel-hook" />
        <span className="towel-cloth">🧺</span>
      </div>
    </div>
  );
}
