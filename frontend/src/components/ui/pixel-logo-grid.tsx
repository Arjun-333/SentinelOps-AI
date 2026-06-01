import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface PixelLogoGridProps {
  className?: string;
  isThreat?: boolean;
}

export const PixelLogoGrid = ({ className, isThreat = false }: PixelLogoGridProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = 160);
    let height = (canvas.height = 160);

    // Grid details
    const cols = 20;
    const rows = 20;
    const cellWidth = width / cols;
    const cellHeight = height / rows;

    // Define "S" pattern in binary grid
    // 1 represents pixel to draw
    const sPattern = [
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
      [0,0,0,1,1,1,0,0,0,0,0,0,0,1,1,1,1,0,0,0],
      [0,0,0,1,1,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0],
      [0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0],
      [0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0],
      [0,0,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0],
      [0,0,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,0,0,0],
      [0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
      [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    ];

    interface Particle {
      x: number;
      y: number;
      ox: number; // Original x
      oy: number; // Original y
      vx: number;
      vy: number;
      color: string;
      size: number;
      active: boolean;
      noiseOffset: number;
    }

    const particles: Particle[] = [];

    // Populate particles based on grid pattern
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (sPattern[r] && sPattern[r][c] === 1) {
          const px = c * cellWidth + cellWidth / 2;
          const py = r * cellHeight + cellHeight / 2;
          particles.push({
            x: px,
            y: py,
            ox: px,
            oy: py,
            vx: 0,
            vy: 0,
            color: "",
            size: cellWidth * 0.72,
            active: true,
            noiseOffset: Math.random() * 100,
          });
        }
      }
    }

    // Mouse interactive tracker
    let mouse = { x: -999, y: -999, radius: 45 };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -999;
      mouse.y = -999;
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    // Color definitions
    const safeColor = { r: 16, g: 185, b: 129 }; // cyber-green
    const threatColor = { r: 239, g: 68, b: 68 }; // cyber-red
    let currentColor = { ...safeColor };

    let frame = 0;

    const animate = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      // Interpolate colors smoothly
      const targetColor = isThreat ? threatColor : safeColor;
      currentColor.r += (targetColor.r - currentColor.r) * 0.1;
      currentColor.g += (targetColor.g - currentColor.g) * 0.1;
      currentColor.b += (targetColor.b - currentColor.b) * 0.1;

      // Draw background grid lines for cyberpunk aesthetic
      ctx.strokeStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, 0.05)`;
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= cols; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellWidth, 0);
        ctx.lineTo(i * cellWidth, height);
        ctx.stroke();
      }
      for (let j = 0; j <= rows; j++) {
        ctx.beginPath();
        ctx.moveTo(0, j * cellHeight);
        ctx.lineTo(width, j * cellHeight);
        ctx.stroke();
      }

      particles.forEach((p) => {
        // Micro-organic noise movements
        const noise = Math.sin(frame * 0.04 + p.noiseOffset) * 0.6;
        
        // Physics push-pull from mouse
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          const angle = Math.atan2(dy, dx);
          // Push away from mouse
          p.vx -= Math.cos(angle) * force * 1.8;
          p.vy -= Math.sin(angle) * force * 1.8;
        }

        // Return to original S pattern position
        p.vx += (p.ox - p.x) * 0.12;
        p.vy += (p.oy - p.y) * 0.12;

        // Apply friction
        p.vx *= 0.85;
        p.vy *= 0.85;

        p.x += p.vx;
        p.y += p.vy + noise * 0.1;

        // Render pixel block with dynamic transparency based on distance from home
        const distFromHome = Math.sqrt((p.x - p.ox) ** 2 + (p.y - p.oy) ** 2);
        const opacity = Math.max(0.4, 1 - distFromHome / 40);
        
        ctx.fillStyle = `rgba(${Math.floor(currentColor.r)}, ${Math.floor(currentColor.g)}, ${Math.floor(currentColor.b)}, ${opacity})`;
        ctx.shadowBlur = distFromHome > 2 ? 6 : 2;
        ctx.shadowColor = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, 0.5)`;
        
        ctx.beginPath();
        ctx.roundRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, 1.5);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Overlay tech accents
      ctx.strokeStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, 0.25)`;
      ctx.lineWidth = 1;
      ctx.strokeRect(5, 5, width - 10, height - 10);
      
      // Cyber corner ticks
      const len = 8;
      ctx.strokeStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, 0.8)`;
      ctx.lineWidth = 1.5;
      
      // Top Left
      ctx.beginPath(); ctx.moveTo(4, 4 + len); ctx.lineTo(4, 4); ctx.lineTo(4 + len, 4); ctx.stroke();
      // Top Right
      ctx.beginPath(); ctx.moveTo(width - 4 - len, 4); ctx.lineTo(width - 4, 4); ctx.lineTo(width - 4, 4 + len); ctx.stroke();
      // Bottom Left
      ctx.beginPath(); ctx.moveTo(4, height - 4 - len); ctx.lineTo(4, height - 4); ctx.lineTo(4 + len, height - 4); ctx.stroke();
      // Bottom Right
      ctx.beginPath(); ctx.moveTo(width - 4 - len, height - 4); ctx.lineTo(width - 4, height - 4); ctx.lineTo(width - 4, height - 4 - len); ctx.stroke();

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isThreat]);

  return (
    <div className={cn("relative flex items-center justify-center rounded-xl bg-black/45 border border-white/[0.04] p-2 overflow-hidden shadow-inner", className)}>
      <div className="absolute inset-0 bg-radial-accent pointer-events-none opacity-20" />
      <canvas ref={canvasRef} className="w-full h-full max-w-[140px] max-h-[140px] cursor-crosshair z-10" />
    </div>
  );
};
