import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

type Obstacle = { x: number; w: number; h: number; kind: "cloud" | "bird" };

type GameSnapshot = {
  planeY: number;
  planeVy: number;
  grounded: boolean;
  obstacles: Obstacle[];
  score: number;
  speed: number;
  gameOver: boolean;
  started: boolean;
  spawnCooldown: number;
  groundY: number;
};

const GRAVITY = 0.52;
const JUMP_VELOCITY = -9.8;
const PLANE_X = 56;
const PLANE_W = 46;
const PLANE_H = 28;

function createGame(groundY: number): GameSnapshot {
  return {
    planeY: groundY - PLANE_H,
    planeVy: 0,
    grounded: true,
    obstacles: [],
    score: 0,
    speed: 4.2,
    gameOver: false,
    started: false,
    spawnCooldown: 70,
    groundY,
  };
}

function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number, offset: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#dbeafe");
  g.addColorStop(0.55, "#e0e7ff");
  g.addColorStop(1, "#f8fafc");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  for (let i = 0; i < 4; i++) {
    const bx = ((i * 140 - offset * 0.25) % (w + 120)) - 60;
    const by = 18 + i * 14;
    ctx.beginPath();
    ctx.ellipse(bx, by, 34, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(bx + 26, by + 4, 26, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGround(
  ctx: CanvasRenderingContext2D,
  w: number,
  groundY: number,
  offset: number
) {
  ctx.fillStyle = "#c7d2fe";
  ctx.fillRect(0, groundY, w, 4);
  ctx.fillStyle = "#a5b4fc";
  ctx.fillRect(0, groundY + 4, w, 999);

  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 18]);
  ctx.lineDashOffset = -offset;
  ctx.beginPath();
  ctx.moveTo(0, groundY + 18);
  ctx.lineTo(w, groundY + 18);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPlane(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const cy = y + PLANE_H / 2;
  ctx.save();
  ctx.translate(x, cy);

  ctx.fillStyle = "#4f46e5";
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#6366f1";
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(-28, -10);
  ctx.lineTo(-24, 0);
  ctx.lineTo(-28, 10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#818cf8";
  ctx.beginPath();
  ctx.moveTo(6, -2);
  ctx.lineTo(20, -14);
  ctx.lineTo(14, -2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#312e81";
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(28, -5);
  ctx.lineTo(28, 5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#e0e7ff";
  ctx.beginPath();
  ctx.arc(10, -3, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#4338ca";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

function drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle, groundY: number) {
  const bottom = groundY;
  const top = bottom - o.h;

  if (o.kind === "cloud") {
    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.5;
    const cx = o.x + o.w / 2;
    const cy = top + o.h * 0.55;
    ctx.beginPath();
    ctx.ellipse(cx - 12, cy, 14, 10, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 10, cy + 2, 18, 12, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 26, cy, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    const cx = o.x + o.w / 2;
    const cy = top + o.h * 0.4;
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 6);
    ctx.lineTo(cx, cy - 8);
    ctx.lineTo(cx + 10, cy + 6);
    ctx.stroke();
  }
}

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
) {
  const pad = 6;
  return (
    ax + pad < bx + bw - pad &&
    ax + aw - pad > bx + pad &&
    ay + pad < by + bh - pad &&
    ay + ah - pad > by + pad
  );
}

type Props = {
  active?: boolean;
  className?: string;
};

export default function AirplaneGame({ active = true, className = "" }: Props) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameSnapshot | null>(null);
  const rafRef = useRef<number>(0);
  const scrollRef = useRef(0);
  const sizeRef = useRef({ w: 360, h: 160 });

  const jump = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    if (g.gameOver) {
      gameRef.current = createGame(g.groundY);
      return;
    }
    if (!g.started) g.started = true;
    if (g.grounded || g.planeVy > -1) {
      g.planeVy = JUMP_VELOCITY;
      g.grounded = false;
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const syncSize = () => {
      const w = Math.max(280, container.clientWidth);
      const h = Math.max(150, Math.min(240, Math.round(w * 0.42)));
      sizeRef.current = { w, h };
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const groundY = h - 44;
      if (!gameRef.current) {
        gameRef.current = createGame(groundY);
      } else {
        gameRef.current.groundY = groundY;
        if (gameRef.current.grounded) {
          gameRef.current.planeY = groundY - PLANE_H;
        }
      }
    };

    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(container);

    const onKey = (e: KeyboardEvent) => {
      if (!active) return;
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", onKey);

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      if (!active) return;

      const { w, h } = sizeRef.current;
      const g = gameRef.current;
      if (!g) return;

      if (g.started && !g.gameOver) {
        g.spawnCooldown -= 1;
        if (g.spawnCooldown <= 0) {
          const tall = Math.random() > 0.55;
          const obstacle: Obstacle = tall
            ? { x: w + 8, w: 22, h: 34 + Math.random() * 18, kind: "bird" }
            : { x: w + 8, w: 44 + Math.random() * 20, h: 26 + Math.random() * 12, kind: "cloud" };
          g.obstacles.push(obstacle);
          g.spawnCooldown = 55 + Math.floor(Math.random() * 45) - Math.min(25, Math.floor(g.score / 80));
        }

        g.speed = Math.min(8.5, 4.2 + g.score / 350);
        scrollRef.current += g.speed;

        for (const o of g.obstacles) o.x -= g.speed;
        g.obstacles = g.obstacles.filter((o) => o.x + o.w > -20);

        g.planeVy += GRAVITY;
        g.planeY += g.planeVy;
        const floor = g.groundY - PLANE_H;
        if (g.planeY >= floor) {
          g.planeY = floor;
          g.planeVy = 0;
          g.grounded = true;
        }

        const px = PLANE_X;
        const py = g.planeY;
        for (const o of g.obstacles) {
          const oy = g.groundY - o.h;
          if (rectsOverlap(px, py, PLANE_W, PLANE_H, o.x, oy, o.w, o.h)) {
            g.gameOver = true;
            break;
          }
        }

        g.score += 1;
      }

      ctx.clearRect(0, 0, w, h);
      drawSky(ctx, w, h, scrollRef.current);
      drawGround(ctx, w, g.groundY, scrollRef.current);

      for (const o of g.obstacles) drawObstacle(ctx, o, g.groundY);
      drawPlane(ctx, PLANE_X, g.planeY);

      ctx.fillStyle = "#334155";
      ctx.font = "600 14px Inter, system-ui, sans-serif";
      ctx.fillText(`${t("waitingGame.score")}: ${Math.floor(g.score / 6)}`, 12, 22);

      if (!g.started) {
        ctx.fillStyle = "rgba(30,41,59,0.75)";
        ctx.font = "600 13px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(t("waitingGame.tapToStart"), w / 2, h / 2 - 6);
        ctx.textAlign = "start";
      } else if (g.gameOver) {
        ctx.fillStyle = "rgba(30,41,59,0.8)";
        ctx.font = "700 15px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(t("waitingGame.gameOver"), w / 2, h / 2 - 8);
        ctx.font = "500 12px Inter, system-ui, sans-serif";
        ctx.fillText(t("waitingGame.tapToRetry"), w / 2, h / 2 + 14);
        ctx.textAlign = "start";
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(rafRef.current);
    };
  }, [active, jump, t]);

  const onPointer = (e: React.PointerEvent) => {
    e.preventDefault();
    jump();
  };

  return (
    <div
      ref={containerRef}
      className={`w-full select-none touch-none ${className}`}
      style={{ touchAction: "none" }}
      onPointerDown={onPointer}
      role="application"
      aria-label={t("waitingGame.ariaLabel")}
    >
      <canvas
        ref={canvasRef}
        className="mx-auto block w-full cursor-pointer rounded-2xl ring-1 ring-brand-200/80"
      />
    </div>
  );
}
