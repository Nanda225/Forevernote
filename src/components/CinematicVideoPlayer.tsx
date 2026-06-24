import React, { useState, useEffect, useRef } from "react";
import { 
  Heart, MessageSquare, Eye, Sparkles, Play, Pause, 
  RotateCcw, Film, Video
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// The beautiful train sunset background image
const coupleTrainSunset = new URL("../assets/images/couple_train_sunset_1780158700135.png", import.meta.url).href;

// --- UTILITY FUNCTIONS ---
const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

const mapRange = (value: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
  if (value <= inMin) return outMin;
  if (value >= inMax) return outMax;
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
};

// --- CANVAS PARTICLE SYSTEM FOR EMBEDDED FRAME ---
const EmbeddedParticleSystem = ({ smoothProgress, containerRef }: { smoothProgress: number, containerRef: React.RefObject<HTMLDivElement | null> }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<any[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animationFrameId: number;

    const resize = () => {
      if (containerRef.current && canvas) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
      }
    };
    window.addEventListener("resize", resize);
    resize();

    if (particlesRef.current.length === 0) {
      for (let i = 0; i < 110; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 4 + 1.5,
          speedY: Math.random() * 0.5 + 0.25,
          speedX: (Math.random() - 0.5) * 0.4,
          angle: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.04,
          type: Math.random() > 0.45 ? "petal" : "dust",
          opacity: Math.random() * 0.4 + 0.25
        });
      }
    }

    const drawHeartShape = (t: number, scale: number, offsetX: number, offsetY: number) => {
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      return { x: x * scale + offsetX, y: y * scale + offsetY };
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const isFinale = smoothProgress > 0.85; 
      const isRoseExplosion = smoothProgress > 0.73 && smoothProgress <= 0.85;

      particlesRef.current.forEach((p, i) => {
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(p.y * 0.015) * 0.25;
        p.angle += p.spin;

        if (p.y > canvas.height + 10 && !isFinale) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
        }

        let targetX = p.x;
        let targetY = p.y;
        let currentOpacity = p.opacity;

        if (isRoseExplosion) {
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const dx = p.x - centerX;
          const dy = p.y - centerY;
          p.x += dx * 0.05;
          p.y += dy * 0.05;
        }

        if (isFinale) {
          const finaleProgress = mapRange(smoothProgress, 0.85, 1, 0, 1);
          const t = (i / particlesRef.current.length) * Math.PI * 2;
          const heartScale = Math.min(canvas.width, canvas.height) / 55;
          const heartPos = drawHeartShape(t, heartScale, canvas.width / 2, canvas.height / 2 - 15);
          
          targetX = lerp(p.x, heartPos.x, finaleProgress * 0.04);
          targetY = lerp(p.y, heartPos.y, finaleProgress * 0.04);
          p.x = targetX;
          p.y = targetY;
          currentOpacity = lerp(p.opacity, 0.75, finaleProgress);
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = Math.max(0, Math.min(1, currentOpacity));

        if (p.type === "petal") {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fillStyle = "#ffb6c1";
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = "#FFDF73";
          ctx.shadowBlur = 6;
          ctx.shadowColor = "#FFDF73";
          ctx.fill();
        }
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [smoothProgress, containerRef]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10 rounded-2xl" />;
};

// --- SCENE COMPONENTS ---
const Scene_Opening = ({ localProgress, title, subtitle }: { localProgress: number; title: string; subtitle: string }) => {
  const scale = mapRange(localProgress, 0, 1, 0.95, 1.12);
  const opacity = mapRange(localProgress, 0.75, 1, 1, 0);
  return (
    <div 
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-4" 
      style={{ opacity, transform: `scale(${scale})` }}
    >
      <div className="bg-black/25 backdrop-blur-xs py-3 px-6 rounded-3xl border border-white/5 space-y-1">
        <h3 className="text-xl md:text-2xl font-display font-black text-white tracking-widest drop-shadow-[0_0_20px_rgba(255,182,193,0.5)] leading-tight">
          {title}
        </h3>
        <p className="text-[8.5px] text-pink-200 font-semibold tracking-[0.2em] uppercase opacity-95">
          {subtitle}
        </p>
      </div>
    </div>
  );
};

const DynamicChocolateWrapper = ({ 
  localProgress, 
  title, 
  subtitle,
  description,
  icon: Icon 
}: { 
  localProgress: number; 
  title: string; 
  subtitle?: string;
  description?: string;
  icon: any; 
}) => {
  const yOffset = mapRange(localProgress, 0, 0.25, -50, 0);
  const opacity = mapRange(localProgress, 0, 0.15, 0, 1) * mapRange(localProgress, 0.85, 1, 1, 0);
  const openProgress = mapRange(localProgress, 0.25, 0.6, 0, 1);
  const leftFold = mapRange(openProgress, 0, 1, 0, -112);
  const rightFold = mapRange(openProgress, 0, 1, 0, 112);
  const textOpacity = mapRange(localProgress, 0.45, 0.65, 0, 1);
  const textScale = mapRange(localProgress, 0.45, 1, 0.95, 1.05);

  return (
    <div 
      className="absolute inset-0 flex items-center justify-center p-4 transition-transform duration-350" 
      style={{ opacity, transform: `translateY(${yOffset}px)` }}
    >
      <div className="relative w-64 h-32 md:w-76 md:h-40 [perspective:800px]">
        {/* Inside Card text content */}
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center space-y-1 bg-gradient-to-b from-[#fffbf7] to-[#fff3e5] rounded-2xl shadow-xl border border-amber-300/40 p-3 text-center" 
          style={{ opacity: textOpacity, transform: `scale(${textScale})` }}
        >
          <Icon className="w-5 h-5 text-amber-500 filter drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]" />
          <h4 className="text-[12.5px] font-display font-black text-stone-850 tracking-wider line-clamp-1 truncate max-w-[210px]">{title}</h4>
          {subtitle && (
            <span className="text-[8px] text-pink-600 font-extrabold uppercase tracking-widest block font-mono leading-none">{subtitle}</span>
          )}
          {description && (
            <p className="text-[8.5px] text-stone-500 leading-normal line-clamp-2 italic font-sans max-w-[210px] mx-auto px-1.5 pt-0.5">
              "{description}"
            </p>
          )}
        </div>
        
        {/* Left Gold Folding Wrap */}
        <div 
          className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-amber-500 via-amber-350 to-amber-600 origin-left shadow-md rounded-l-2xl border-r border-stone-850/15 transition-transform duration-120 ease-out flex items-center justify-end pr-3 overflow-hidden select-none" 
          style={{ transform: `rotateY(${leftFold}deg)` }} 
        >
          <span className="text-[14px] opacity-75">🌹</span>
        </div>
        
        {/* Right Gold Folding Wrap */}
        <div 
          className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-amber-500 via-amber-300 to-amber-650 origin-right shadow-md rounded-r-2xl border-l border-stone-850/15 transition-transform duration-120 ease-out flex items-center justify-start pl-3 overflow-hidden select-none" 
          style={{ transform: `rotateY(${rightFold}deg)` }} 
        >
          <span className="text-[14px] opacity-75">✨</span>
        </div>
      </div>
    </div>
  );
};

const Scene_Teddy = ({ localProgress, title, subtitle }: { localProgress: number; title: string; subtitle: string }) => {
  const yOffset = mapRange(localProgress, 0, 0.3, 40, 0);
  const opacity = mapRange(localProgress, 0, 0.15, 0, 1) * mapRange(localProgress, 0.85, 1, 1, 0);
  const armRotate = mapRange(localProgress, 0.3, 0.75, 40, -15);
  const roseScale = mapRange(localProgress, 0.4, 0.75, 0, 1);

  return (
    <div 
      className="absolute inset-0 flex flex-col items-center justify-center p-4" 
      style={{ opacity, transform: `translateY(${yOffset}px)` }}
    >
      <div className="relative flex flex-col items-center scale-75 md:scale-85">
        <svg width="110" height="110" viewBox="0 0 200 200" fill="none" className="relative z-10 drop-shadow-xl">
          <circle cx="60" cy="50" r="23" fill="#D2A679"/><circle cx="60" cy="50" r="13" fill="#E6CBA8"/>
          <circle cx="140" cy="50" r="23" fill="#D2A679"/><circle cx="140" cy="50" r="13" fill="#E6CBA8"/>
          <circle cx="100" cy="90" r="53" fill="#D2A679"/>
          <ellipse cx="100" cy="105" rx="23" ry="18" fill="#E6CBA8"/>
          <path d="M91 100 Q100 104 109 100" stroke="#5C4033" strokeWidth="2.5" fill="none"/>
          <circle cx="100" cy="95" r="7" fill="#5C4033"/>
          <circle cx="81" cy="80" r="5.5" fill="#332211"/><circle cx="119" cy="80" r="5.5" fill="#332211"/>
          <ellipse cx="100" cy="155" rx="43" ry="46" fill="#D2A679"/>
          <ellipse cx="100" cy="159" rx="28" ry="32" fill="#E6CBA8"/>
          <ellipse cx="51" cy="138" rx="14" ry="31" transform="rotate(25 51 138)" fill="#D2A679"/>
          <g transform={`rotate(${armRotate} 148 138)`}>
            <ellipse cx="148" cy="138" rx="14" ry="31" fill="#D2A679"/>
            <circle cx="148" cy="160" r="9" fill="#E6CBA8"/>
          </g>
        </svg>
        <div 
          className="absolute right-[-10px] top-[48px] z-20" 
          style={{ opacity: mapRange(localProgress, 0.4, 0.6, 0, 1), transform: `scale(${roseScale})` }}
        >
          <svg width="32" height="42" viewBox="0 0 60 80" className="drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]">
            <path d="M30 30 Q30 80 30 80" stroke="#166534" strokeWidth="5" fill="none"/>
            <path d="M30 40 C10 40 10 10 30 10 C50 10 50 40 30 40 Z" fill="#EF4444"/>
          </svg>
        </div>
      </div>

      {/* Caption overlay */}
      <div className="text-center z-20 -mt-1 space-y-0.5">
        <h5 className="text-[10px] font-display font-black text-stone-100 bg-black/45 px-3.5 py-0.5 rounded-full inline-block shadow-md">
          {title}
        </h5>
        {subtitle && (
          <p className="text-[8px] text-pink-300 font-extrabold uppercase tracking-wider block font-mono">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

const Scene_RoseExplode = ({ localProgress, title, subtitle }: { localProgress: number; title: string; subtitle: string }) => {
  const scale = mapRange(localProgress, 0, 0.85, 1, 48);
  const opacity = mapRange(localProgress, 0, 0.15, 0, 1) * mapRange(localProgress, 0.78, 1, 1, 0);
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{ opacity }}>
      <div style={{ transform: `scale(${scale})`, opacity: mapRange(localProgress, 0.45, 0.75, 1, 0) }}>
        <svg width="60" height="60" viewBox="0 0 60 80" className="drop-shadow-[0_0_24px_rgba(239,68,68,0.95)]">
          <path d="M30 40 C10 40 10 10 30 10 C50 10 50 40 30 40 Z" fill="#EF4444"/>
        </svg>
      </div>

      {/* Dynamic text overlaid overlay */}
      <div className="absolute bottom-5 left-0 right-0 text-center z-20 space-y-0.5" style={{ opacity: mapRange(localProgress, 0.1, 0.35, 0, 1) * mapRange(localProgress, 0.7, 0.85, 1, 0) }}>
        <h5 className="text-[10.5px] font-display font-black text-rose-100 uppercase tracking-widest bg-black/40 px-3 py-0.5 rounded-full inline-block">
          {title}
        </h5>
        {subtitle && (
          <p className="text-[7.5px] text-pink-300 font-extrabold uppercase tracking-wider block font-mono">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

const Scene_Finale = ({ localProgress, title, subtitle }: { localProgress: number; title: string; subtitle: string }) => {
  const opacity = mapRange(localProgress, 0.08, 0.35, 0, 1);
  const textY = mapRange(localProgress, 0.08, 0.45, 25, 0);
  return (
    <div 
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-4" 
      style={{ opacity }}
    >
      <div style={{ transform: `translateY(${textY}px)` }} className="z-20 space-y-1.5">
        <h3 className="text-xl md:text-2xl font-display font-black text-rose-100 tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
          {title}
        </h3>
        <div className="flex justify-center items-center gap-1.5 text-pink-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-300/80 animate-spin" style={{ animationDuration: '6s' }} />
          <span className="font-semibold tracking-[0.2em] uppercase text-[9px] font-mono">{subtitle}</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-300/80 animate-spin" style={{ animationDuration: '6s' }} />
        </div>
      </div>
    </div>
  );
};

interface CinematicVideoPlayerProps {
  milestones?: any[];
  profile?: any;
  user?: any;
}

export default function CinematicVideoPlayer({ milestones = [], profile = null, user = null }: CinematicVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const smoothProgressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef(Date.now());

  // --- DYNAMICALLY RESOLVED SCENES LIST BASED ON FIREBASE MILESTONES ---
  const SCENES = React.useMemo(() => {
    // Fallback/preset list if there are no milestones yet
    const placeholderScenes = [
      { id: 1, title: "Opening Magic", duration: 5, type: 'opening' },
      { id: 2, title: "First Meet", duration: 5, type: 'first-meet' },
      { id: 3, title: "First Talk", duration: 5, type: 'first-talk' },
      { id: 4, title: "First Date", duration: 5, type: 'first-date' },
      { id: 5, title: "Milestone Gold", duration: 5, type: 'milestone' },
      { id: 6, title: "Teddy Surprise", duration: 5, type: 'teddy' },
      { id: 7, title: "Rose Explosion", duration: 5, type: 'rose' },
      { id: 8, title: "Forever Together", duration: 5, type: 'finale' },
    ];

    const sorted = [...milestones].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Extract designated milestones matching specific types
    const meetMilestone = sorted.find(m => m.type === 'First Meet' || m.title.toLowerCase().includes('meet') || m.title.toLowerCase().includes('met'));
    const talkMilestone = sorted.find(m => m.type === 'First Talk' || m.title.toLowerCase().includes('talk') || m.title.toLowerCase().includes('chat'));
    const dateMilestone = sorted.find(m => m.type === 'First Date' || m.title.toLowerCase().includes('date') || m.title.toLowerCase().includes('dinner'));
    const anchorMilestone = sorted.find(m => m.type === 'Proposal' || m.type === 'Anniversary' || m.title.toLowerCase().includes('proposal') || m.title.toLowerCase().includes('ring') || m.title.toLowerCase().includes('anniversary'));

    // Filter out duplicated ones from being highlights
    const matchedIds = new Set([meetMilestone?.id, talkMilestone?.id, dateMilestone?.id, anchorMilestone?.id].filter(Boolean));
    const extraMilestones = sorted.filter(m => !matchedIds.has(m.id));

    // Construct exactly 8 elegant chronological scenes of their custom love reel
    return [
      // 1. Opening scene
      { 
        id: 1, 
        title: profile?.name ? `${profile.name} & ${profile.partnerName || "Partner"}` : "Our Love Odyssey", 
        subtitle: profile?.anniversaryDate 
          ? `Anniversary Since ${new Date(profile.anniversaryDate).toLocaleDateString("en-US", { month: 'long', year: 'numeric' })}` 
          : "Locked Story Reel", 
        duration: 5, 
        type: 'opening' 
      },
      // 2. First Meet
      {
        id: 2,
        title: meetMilestone ? meetMilestone.title : "First Meet",
        subtitle: meetMilestone 
          ? new Date(meetMilestone.date).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' }) 
          : "Our orbits first locked",
        description: meetMilestone?.description || "An eye contact that sparked a whole universe",
        duration: 5,
        type: 'first-meet',
        icon: Eye
      },
      // 3. First Talk
      {
        id: 3,
        title: talkMilestone ? talkMilestone.title : "First Talk",
        subtitle: talkMilestone 
          ? new Date(talkMilestone.date).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' }) 
          : "Endless talks till 4:00 AM",
        description: talkMilestone?.description || "Floating on shared texts and sweet recordings",
        duration: 5,
        type: 'first-talk',
        icon: MessageSquare
      },
      // 4. Highlight 1 (First Date or first extra)
      {
        id: 4,
        title: dateMilestone ? dateMilestone.title : (extraMilestones[0] ? extraMilestones[0].title : "First Date"),
        subtitle: dateMilestone 
          ? new Date(dateMilestone.date).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })
          : (extraMilestones[0] 
              ? new Date(extraMilestones[0].date).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' }) 
              : "Love's first pure butterflies"),
        description: dateMilestone?.description || extraMilestones[0]?.description || "Every minute spent felt safe, warm and perfect",
        duration: 5,
        type: 'milestone',
        icon: Heart
      },
      // 5. Highlight 2 (Proposal, Anniversary, or extra 2)
      {
        id: 5,
        title: anchorMilestone ? anchorMilestone.title : (extraMilestones[1] ? extraMilestones[1].title : "Special Chapter"),
        subtitle: anchorMilestone 
          ? new Date(anchorMilestone.date).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })
          : (extraMilestones[1] 
              ? new Date(extraMilestones[1].date).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' }) 
              : "Forging our infinite path"),
        description: anchorMilestone?.description || extraMilestones[1]?.description || "Every single page of our scrapbook is our masterpiece",
        duration: 5,
        type: 'milestone',
        icon: Sparkles
      },
      // 6. Teddy Waving bear (extra 3 or generic)
      {
        id: 6,
        title: extraMilestones[2] ? extraMilestones[2].title : "Playful Teasers",
        subtitle: extraMilestones[2] 
          ? new Date(extraMilestones[2].date).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' }) 
          : "Our private inside jokes",
        duration: 5,
        type: 'teddy'
      },
      // 7. Rose Gift Zoom (extra 4 or generic)
      {
        id: 7,
        title: extraMilestones[3] ? extraMilestones[3].title : "Blooming Dreams",
        subtitle: extraMilestones[3] 
          ? new Date(extraMilestones[3].date).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' }) 
          : "Nurturing our sacred bond",
        duration: 5,
        type: 'rose'
      },
      // 8. Eternal Finale
      {
        id: 8,
        title: "Every Memory Sealed",
        subtitle: milestones.length > 0 ? `Synced with ${milestones.length} beautiful items` : "Every single chapter belongs to us",
        duration: 5,
        type: 'finale'
      }
    ];
  }, [milestones, profile]);

  const TOTAL_DURATION = SCENES.reduce((acc, s) => acc + s.duration, 0); // Always 40 seconds total

  // Unified loop
  useEffect(() => {
    const loop = () => {
      const now = Date.now();
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (isPlaying) {
        setCurrentTime((prev) => {
          const next = prev + delta;
          if (next >= TOTAL_DURATION) return 0;
          return next;
        });
      }
      targetProgressRef.current = currentTime / TOTAL_DURATION;

      // Smooth interpolation using LERP
      smoothProgressRef.current = lerp(smoothProgressRef.current, targetProgressRef.current, 0.12);
      setScrollProgress(smoothProgressRef.current);

      requestRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = Date.now();
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, currentTime, TOTAL_DURATION]);

  const getLocalProgress = (index: number) => {
    const segmentWidth = 1 / SCENES.length;
    const start = index * segmentWidth;
    const end = start + segmentWidth;
    if (scrollProgress < start) return 0;
    if (scrollProgress > end) return 1;
    return (scrollProgress - start) / (end - start);
  };

  const currentSceneIndex = Math.min(Math.floor(scrollProgress * SCENES.length), SCENES.length - 1);
  const activeSceneInstance = SCENES[currentSceneIndex];

  const handleTimelineScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percentage = parseFloat(e.target.value);
    setCurrentTime(percentage * TOTAL_DURATION);
  };

  return (
    <div 
      ref={containerRef}
      className="w-full aspect-video rounded-3xl overflow-hidden relative shadow-2xl border border-slate-800/80 bg-slate-950 flex flex-col justify-between"
    >
      {/* Background Train Sunset Image Backdrop with opacity */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-lighten pointer-events-none z-0" 
        style={{ backgroundImage: `url(${coupleTrainSunset})` }}
      />
      {/* Ambient Vignette Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40 pointer-events-none z-5" />

      {/* Particle Overlay */}
      <EmbeddedParticleSystem smoothProgress={scrollProgress} containerRef={containerRef} />

      {/* Render Scenes Layer */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <div className="relative w-full h-full max-h-[100%] max-w-[100%] aspect-video">
          {activeSceneInstance.type === 'opening' && (
            <Scene_Opening 
              localProgress={getLocalProgress(currentSceneIndex)} 
              title={activeSceneInstance.title} 
              subtitle={activeSceneInstance.subtitle || "Our Love story"} 
            />
          )}

          {(activeSceneInstance.type === 'first-meet' || 
            activeSceneInstance.type === 'first-talk' || 
            activeSceneInstance.type === 'milestone' || 
            activeSceneInstance.type === 'first-date') && (
            <DynamicChocolateWrapper 
              localProgress={getLocalProgress(currentSceneIndex)} 
              title={activeSceneInstance.title} 
              subtitle={activeSceneInstance.subtitle}
              description={(activeSceneInstance as any).description}
              icon={(activeSceneInstance as any).icon || Heart} 
            />
          )}

          {activeSceneInstance.type === 'teddy' && (
            <Scene_Teddy 
              localProgress={getLocalProgress(currentSceneIndex)} 
              title={activeSceneInstance.title}
              subtitle={activeSceneInstance.subtitle || "Waving bear surprises"}
            />
          )}

          {activeSceneInstance.type === 'rose' && (
            <Scene_RoseExplode 
              localProgress={getLocalProgress(currentSceneIndex)} 
              title={activeSceneInstance.title}
              subtitle={activeSceneInstance.subtitle || "Blossoming together"}
            />
          )}

          {activeSceneInstance.type === 'finale' && (
            <Scene_Finale 
              localProgress={getLocalProgress(currentSceneIndex)} 
              title={activeSceneInstance.title}
              subtitle={activeSceneInstance.subtitle || "Shared connection Locked"}
            />
          )}
        </div>
      </div>

      {/* Live HUD Header */}
      <div className="p-3 select-none flex justify-between items-center z-30 font-sans relative">
        <span className="flex items-center gap-1.5 text-[8px] tracking-widest text-pink-300 font-bold uppercase hover:opacity-100 transition-opacity">
          <Film className="w-3 h-3 text-pink-400 animate-spin" />
          <span>Our Cinematic Story</span>
        </span>
        <span className="text-[7.5px] font-mono text-slate-400 font-semibold bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full uppercase leading-none">
          {activeSceneInstance.title}
        </span>
      </div>

      {/* Live HUD control bar */}
      <div className="p-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col gap-2 z-30 relative mt-auto select-none">
        
        {/* Progress scrub bar */}
        <div className="relative group flex items-center">
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.001"
            value={scrollProgress}
            onChange={handleTimelineScrub}
            className="w-full h-0.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-500 focus:outline-hidden transition-all group-hover:h-1"
          />
          {/* Node markings */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none px-0.5">
            {SCENES.map((_, i) => (
              <div 
                key={i} 
                className={`w-1 h-1 rounded-full ${i <= currentSceneIndex ? 'bg-pink-400 shadow-[0_0_5px_#f43f5e]' : 'bg-white/30'}`} 
              />
            ))}
          </div>
        </div>

        {/* Lower Row Controls */}
        <div className="flex justify-between items-center text-[8px] font-sans">
          
          {/* Time text indicator */}
          <span className="text-slate-350 font-mono tracking-wider font-semibold">
            {currentTime.toFixed(1)}s / {TOTAL_DURATION}s
          </span>

          {/* Controls triggers */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentTime(0)}
              className="p-1 text-slate-450 hover:text-white transition cursor-pointer"
              title="Rewind automatic loop"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 bg-white text-slate-950 hover:scale-105 active:scale-95 transition rounded-full flex items-center justify-center cursor-pointer shadow-md"
            >
              {isPlaying ? <Pause className="w-2.5 h-2.5 fill-black" /> : <Play className="w-2.5 h-2.5 fill-black ml-0.5" />}
            </button>
          </div>

          <span className="font-mono text-slate-500 tracking-wider">Live Reel</span>

        </div>

      </div>

    </div>
  );
}
