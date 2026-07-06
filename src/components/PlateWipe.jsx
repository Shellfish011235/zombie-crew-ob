import { useCallback, useEffect, useRef, useState } from "react";

const SIZE = 260;

function paintGrime(ctx, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w / 2 - 6, 0, Math.PI * 2);
  ctx.clip();

  const grime = ctx.createRadialGradient(w * 0.45, h * 0.4, 8, w / 2, h / 2, w * 0.55);
  grime.addColorStop(0, "rgba(110, 78, 48, 0.92)");
  grime.addColorStop(0.55, "rgba(72, 48, 28, 0.88)");
  grime.addColorStop(1, "rgba(48, 32, 18, 0.95)");
  ctx.fillStyle = grime;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 55; i += 1) {
    const x = 20 + Math.random() * (w - 40);
    const y = 20 + Math.random() * (h - 40);
    ctx.fillStyle = `rgba(${50 + Math.random() * 35}, ${32 + Math.random() * 24}, 14, ${0.25 + Math.random() * 0.45})`;
    ctx.beginPath();
    ctx.arc(x, y, 4 + Math.random() * 18, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 120; i += 1) {
    ctx.fillStyle = `rgba(90, 60, 30, ${0.15 + Math.random() * 0.35})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 2 + Math.random() * 4);
  }

  ctx.restore();
}

function paintPlateBase(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2);
  ctx.clip();

  const metal = ctx.createRadialGradient(w * 0.38, h * 0.32, 4, w / 2, h / 2, w * 0.52);
  metal.addColorStop(0, "#d8dee3");
  metal.addColorStop(0.45, "#9aa3ab");
  metal.addColorStop(0.78, "#6d757c");
  metal.addColorStop(1, "#454b50");
  ctx.fillStyle = metal;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w / 2 - 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "#3a3530";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
  ctx.stroke();
}

function sampleProgress(ctx, w, h) {
  const data = ctx.getImageData(0, 0, w, h).data;
  const cx = w / 2;
  const cy = h / 2;
  const r = w / 2 - 10;
  let dirty = 0;
  let total = 0;
  const step = 4;

  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > r * r) continue;
      total += 1;
      const i = (y * w + x) * 4 + 3;
      if (data[i] > 18) dirty += 1;
    }
  }
  return total ? ((total - dirty) / total) * 100 : 0;
}

export function PlateWipe({ onProgress, onWipe, disabled, boost = 1, className = "" }) {
  const canvasRef = useRef(null);
  const grimeRef = useRef(null);
  const drawing = useRef(false);
  const lastPt = useRef(null);
  const lastTime = useRef(0);
  const lastAngle = useRef(null);
  const progressRef = useRef(0);
  const sampleTimer = useRef(null);
  const [isLicking, setIsLicking] = useState(false);

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    };
  }, []);

  const erase = useCallback((x, y, power) => {
    const grime = grimeRef.current;
    if (!grime) return;
    const ctx = grime.getContext("2d");
    const brush = 14 + power * 14 * boost;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, brush, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }, [boost]);

  const strokeTo = useCallback((x, y, power, circularHint) => {
    const grime = grimeRef.current;
    const base = canvasRef.current;
    if (!grime || !base) return;

    const ctx = base.getContext("2d");
    const gtx = grime.getContext("2d");

    if (lastPt.current) {
      const lx = lastPt.current.x;
      const ly = lastPt.current.y;
      const dist = Math.hypot(x - lx, y - ly);
      const steps = Math.max(1, Math.floor(dist / 6));
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        erase(lx + (x - lx) * t, ly + (y - ly) * t, power);
      }
    } else {
      erase(x, y, power);
    }

    ctx.clearRect(0, 0, SIZE, SIZE);
    paintPlateBase(ctx, SIZE, SIZE);
    ctx.drawImage(grime, 0, 0);

    onWipe?.({ power, circularHint });
    lastPt.current = { x, y };
  }, [erase, onWipe]);

  const updateProgress = useCallback(() => {
    const grime = grimeRef.current;
    if (!grime) return;
    const gtx = grime.getContext("2d");
    const pct = sampleProgress(gtx, SIZE, SIZE);
    if (Math.abs(pct - progressRef.current) > 0.4) {
      progressRef.current = pct;
      onProgress?.(pct);
    }
  }, [onProgress]);

  const handleStart = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    drawing.current = true;
    setIsLicking(true);
    lastPt.current = null;
    lastAngle.current = null;
    lastTime.current = performance.now();
    const p = getPos(e);
    if (p) strokeTo(p.x, p.y, 0.35, 0);
  }, [disabled, getPos, strokeTo]);

  const handleMove = useCallback((e) => {
    if (!drawing.current || disabled) return;
    e.preventDefault();
    const p = getPos(e);
    if (!p) return;

    const now = performance.now();
    const dt = Math.max(16, now - lastTime.current);
    lastTime.current = now;

    let power = 0.35;
    let circularHint = 0;

    if (lastPt.current) {
      const dist = Math.hypot(p.x - lastPt.current.x, p.y - lastPt.current.y);
      const speed = dist / dt;
      power = Math.min(1.35, 0.25 + speed * 1.8);

      const angle = Math.atan2(p.y - lastPt.current.y, p.x - lastPt.current.x);
      if (lastAngle.current !== null) {
        let delta = angle - lastAngle.current;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        if (Math.abs(delta) > 0.25 && Math.abs(delta) < 2.4) circularHint = Math.abs(delta);
      }
      lastAngle.current = angle;
    }

    strokeTo(p.x, p.y, power, circularHint);

    if (!sampleTimer.current) {
      sampleTimer.current = setTimeout(() => {
        updateProgress();
        sampleTimer.current = null;
      }, 80);
    }
  }, [disabled, getPos, strokeTo, updateProgress]);

  const handleEnd = useCallback(() => {
    drawing.current = false;
    setIsLicking(false);
    lastPt.current = null;
    lastAngle.current = null;
    updateProgress();
  }, [updateProgress]);

  useEffect(() => {
    const base = canvasRef.current;
    if (!base) return;

    const grime = document.createElement("canvas");
    grime.width = SIZE;
    grime.height = SIZE;
    grimeRef.current = grime;

    paintPlateBase(base.getContext("2d"), SIZE, SIZE);
    paintGrime(grime.getContext("2d"), SIZE, SIZE);
    base.getContext("2d").drawImage(grime, 0, 0);
    progressRef.current = 0;
    onProgress?.(0);
  }, [onProgress]);

  return (
    <div className={`plate-wipe-wrap ${className} ${isLicking ? "is-licking" : ""}`}>
      <canvas
        ref={canvasRef}
        className="plate-wipe-canvas"
        width={SIZE}
        height={SIZE}
        onPointerDown={handleStart}
        onPointerMove={handleMove}
        onPointerUp={handleEnd}
        onPointerLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
      <span className="plate-rim" aria-hidden="true" />
      <span className="plate-wipe-hint">Drag in circles to lick clean</span>
    </div>
  );
}

/** Visual-only rival plate that “cleans” as rival progress rises */
export function RivalPlateView({ progress = 0 }) {
  const clean = Math.max(0, Math.min(100, progress));
  return (
    <div className="rival-plate-view">
      <div className="rival-plate-metal" />
      <div className="rival-plate-grime" style={{ clipPath: `inset(0 0 ${100 - clean}% 0)` }} />
      <span className="plate-rim" aria-hidden="true" />
    </div>
  );
}
