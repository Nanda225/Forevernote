import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  maxOpacity: number;
  fadeSpeed: number;
  color: string;
  type: "heart" | "sparkle" | "bokeh";
  rotation: number;
  rotationSpeed: number;
}

export default function PremiumBackgroundAnimation() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const maxParticles = 65;

    // Premium Color Palette: Soft romantic rose pinks, light lavenders, and warm glowing peach-gold
    const colors = [
      "rgba(244, 63, 94, ",   // Rose 500
      "rgba(236, 72, 153, ",  // Pink 500
      "rgba(168, 85, 247, ",  // Purple 500
      "rgba(251, 191, 36, ",  // Amber 400 (Warm golden sparkles)
      "rgba(253, 164, 186, ", // Rose 300
    ];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Track mouse position gently to create an elegant interactive wind/glow effect
    const mouse = { x: -1000, y: -1000, radius: 150 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    const createParticle = (yOverride?: number): Particle => {
      const typeRand = Math.random();
      let type: "heart" | "sparkle" | "bokeh" = "bokeh";
      if (typeRand < 0.25) {
        type = "heart";
      } else if (typeRand < 0.55) {
        type = "sparkle";
      }

      const size = type === "heart" 
        ? Math.random() * 12 + 6 
        : type === "sparkle" 
          ? Math.random() * 8 + 4 
          : Math.random() * 24 + 10;

      const baseColor = colors[Math.floor(Math.random() * colors.length)];
      const maxOpacity = type === "bokeh" ? Math.random() * 0.12 + 0.04 : Math.random() * 0.28 + 0.12;

      return {
        x: Math.random() * canvas.width,
        y: yOverride !== undefined ? yOverride : Math.random() * canvas.height,
        size,
        speedY: -(Math.random() * 0.6 + 0.2), // slow upward motion
        speedX: (Math.random() - 0.5) * 0.3, // delicate drift left/right
        opacity: Math.random() * maxOpacity,
        maxOpacity,
        fadeSpeed: 0.002 + Math.random() * 0.005,
        color: baseColor,
        type,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.01,
      };
    };

    // Pre-populate particles across the whole screen space initially
    for (let i = 0; i < maxParticles; i++) {
      particles.push(createParticle());
    }

    // Drawing a neat heart shape onto 2D canvas
    const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, opacity: number, rotation: number, colorStr: string) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.beginPath();
      
      // Heart drawing math curves
      const topCurveHeight = size * 0.3;
      ctx.moveTo(0, topCurveHeight);
      ctx.bezierCurveTo(-size / 2, -size / 2, -size, topCurveHeight, 0, size);
      ctx.bezierCurveTo(size, topCurveHeight, size / 2, -size / 2, 0, topCurveHeight);
      
      ctx.closePath();
      ctx.fillStyle = `${colorStr}${opacity})`;
      ctx.fill();
      ctx.restore();
    };

    // Drawing 4-pointed shimmering golden/pink sparkles
    const drawSparkle = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, opacity: number, rotation: number, colorStr: string) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.beginPath();
      
      // Star with inner curves
      for (let i = 0; i < 4; i++) {
        ctx.lineTo(0, -size);
        ctx.quadraticCurveTo(0, 0, size, 0);
        ctx.quadraticCurveTo(0, 0, 0, size);
        ctx.quadraticCurveTo(0, 0, -size, 0);
        ctx.quadraticCurveTo(0, 0, 0, -size);
      }
      
      ctx.closePath();
      ctx.fillStyle = `${colorStr}${opacity})`;
      ctx.shadowColor = `${colorStr}${opacity * 0.8})`;
      ctx.shadowBlur = size * 0.8;
      ctx.fill();
      ctx.restore();
    };

    // Drawing beautiful soft out-of-focus circle lights (bokeh)
    const drawBokeh = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, opacity: number, colorStr: string) => {
      ctx.save();
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, `${colorStr}${opacity})`);
      gradient.addColorStop(0.5, `${colorStr}${opacity * 0.4})`);
      gradient.addColorStop(1, `${colorStr}0)`);
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();
    };

    const animate = () => {
      // Clear with absolute transparency so background HTML styling persists optimally
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, index) => {
        // Subtle drift movement
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;

        // Elegant mouse interactivity: Particles gravitate slightly away from mouse cursor
        if (mouse.x !== -1000) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius) {
            const force = (mouse.radius - dist) / mouse.radius;
            p.x += (dx / dist) * force * 1.5;
            p.y += (dy / dist) * force * 1.5;
          }
        }

        // Cycle particle opacity for premium shimmering pulse logic
        p.opacity += p.fadeSpeed;
        if (p.opacity >= p.maxOpacity || p.opacity <= 0.01) {
          p.fadeSpeed = -p.fadeSpeed;
        }

        // Draw particle based on type with elegant fallbacks
        const opacitySafe = Math.max(0.01, Math.min(1, p.opacity));
        if (p.type === "heart") {
          drawHeart(ctx, p.x, p.y, p.size, opacitySafe, p.rotation, p.color);
        } else if (p.type === "sparkle") {
          drawSparkle(ctx, p.x, p.y, p.size, opacitySafe, p.rotation, p.color);
        } else {
          drawBokeh(ctx, p.x, p.y, p.size, opacitySafe, p.color);
        }

        // Re-generate if drifted out of bounds or opacity hits extreme floor
        if (p.y < -p.size || p.x < -p.size || p.x > canvas.width + p.size) {
          particles[index] = createParticle(canvas.height + p.size);
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Respect CPU when tab is inactive/minimized
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else {
        animate();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="premium-hearts-canvas"
      className="fixed inset-0 w-full h-full pointer-events-none z-10"
      aria-hidden="true"
    />
  );
}
