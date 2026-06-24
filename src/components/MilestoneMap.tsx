import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Heart, Calendar, Compass, MapPin, Sparkles, Plus, Info, 
  ChevronRight, MessageSquare, Flag, Star, ArrowRight, Eye, 
  Mail, Bell, Trash2, Edit3, X, Check, Paperclip, 
  Navigation, Trash, Gift, Smile, Camera, Music, Cloud, Flame,
  Coffee, Palette, HeartHandshake, Award, Filter
} from "lucide-react";
import { Milestone, Reminder, ReminderType } from "../types";

interface MilestoneMapProps {
  milestones: Milestone[];
  reminders: Reminder[];
  selectedTypeFilter: string;
  onSelectedTypeFilterChange: (value: string) => void;
  onAddMilestoneClick: () => void;
  onEditMilestone: (milestone: Milestone) => void;
  onViewLetter: (milestone: Milestone) => void;
  onDeleteMilestone: (id: string) => void;
  onSaveReminder: (
    milestoneId: string,
    deliveryType: ReminderType,
    scheduledDate: string,
    isDelete?: boolean
  ) => Promise<void>;
}

// Cute Sound effects or Visual confetti sparkles
interface HeartConfetti {
  id: number;
  x: number;
  y: number;
  color: string;
  emoji: string;
}

export default function MilestoneMap({ 
  milestones, 
  reminders,
  selectedTypeFilter,
  onSelectedTypeFilterChange,
  onAddMilestoneClick, 
  onEditMilestone,
  onViewLetter,
  onDeleteMilestone,
  onSaveReminder
}: MilestoneMapProps) {
  const [activeSchedulerId, setActiveSchedulerId] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [deliveryType, setDeliveryType] = useState<ReminderType>("Email");
  
  // Cutie Theme presets customizer
  const [cuteTheme, setCuteTheme] = useState<"pink" | "lavender" | "peach" | "mint">("pink");
  const [heartsTriggerList, setHeartsTriggerList] = useState<HeartConfetti[]>([]);

  // Switch layout mode: 'trail' is chronological scrolling map, 'grid' is compact card board grid
  const [layoutMode, setLayoutMode] = useState<'trail' | 'grid'>(() => {
    try {
      return (localStorage.getItem('forevernote_layout_mode') as 'trail' | 'grid') || 'trail';
    } catch {
      return 'trail';
    }
  });

  const toggleLayoutMode = (mode: 'trail' | 'grid') => {
    setLayoutMode(mode);
    try {
      localStorage.setItem('forevernote_layout_mode', mode);
    } catch {}
  };

  // Sort milestones chronologically (oldest first for the memories timeline trail)
  const sortedMilestones = useMemo(() => {
    return [...milestones].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [milestones]);

  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(
    sortedMilestones.length > 0 ? sortedMilestones[sortedMilestones.length - 1] : null
  );

  // Update selection if list updates
  useEffect(() => {
    if (sortedMilestones.length > 0) {
      if (!selectedMilestone || !sortedMilestones.some(m => m.id === selectedMilestone.id)) {
        setSelectedMilestone(sortedMilestones[sortedMilestones.length - 1]);
      }
    } else {
      setSelectedMilestone(null);
    }
  }, [sortedMilestones, selectedMilestone]);

  const handleHeartExplosion = (e: React.MouseEvent) => {
    const emojis = ["💓", "💖", "🌸", "⭐", "🎉", "🍬", "🐥", "🐰", "🧸", "🎈"];
    const colors = ["text-pink-400", "text-rose-400", "text-amber-400", "text-purple-400", "text-emerald-400"];
    const container = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - container.left;
    const clickY = e.clientY - container.top;

    const newExplosions: HeartConfetti[] = Array.from({ length: 12 }).map((_, i) => ({
      id: Date.now() + i,
      x: clickX + (Math.random() * 80 - 40),
      y: clickY + (Math.random() * 80 - 40),
      color: colors[Math.floor(Math.random() * colors.length)],
      emoji: emojis[Math.floor(Math.random() * emojis.length)]
    }));

    setHeartsTriggerList((prev) => [...prev, ...newExplosions].slice(-30));
  };

  // Auto clean up floating confetti hearts
  useEffect(() => {
    if (heartsTriggerList.length > 0) {
      const timer = setTimeout(() => {
        setHeartsTriggerList((prev) => prev.slice(5));
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [heartsTriggerList]);

  const getSensibleDefaultDate = (milestoneDate: string) => {
    try {
      const parts = milestoneDate.split("-");
      if (parts.length === 3) {
        const year = new Date().getFullYear();
        const base = `${year}-${parts[1]}-${parts[2]}`;
        if (new Date(base).getTime() < Date.now()) {
          return `${year + 1}-${parts[1]}-${parts[2]}`;
        }
        return base;
      }
    } catch {}
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMilestoneReminder = (mId: string) => {
    return reminders.find(r => r.milestoneId === mId) || null;
  };

  const getThemeClasses = () => {
    switch (cuteTheme) {
      case "pink":
        return {
          banner: "from-pink-100 via-rose-50 to-pink-200 border-pink-200 text-pink-700",
          accentColor: "text-pink-500",
          dotColorHex: "#ec4899",
          badgeBg: "bg-pink-100 text-pink-700 border-pink-200",
          cardAccent: "border-pink-200 hover:border-pink-300 ring-pink-100 bg-pink-50/20",
          glowBtn: "bg-pink-500 hover:bg-pink-600 text-white shadow-pink-200",
          bgOverlay: "bg-pink-50/10",
          avatarBorder: "border-pink-300"
        };
      case "lavender":
        return {
          banner: "from-purple-100 via-indigo-50 to-purple-200 border-purple-200 text-purple-700",
          accentColor: "text-purple-500",
          dotColorHex: "#a855f7",
          badgeBg: "bg-purple-100 text-purple-700 border-purple-200",
          cardAccent: "border-purple-200 hover:border-purple-300 ring-purple-100 bg-purple-50/20",
          glowBtn: "bg-purple-500 hover:bg-purple-600 text-white shadow-purple-200",
          bgOverlay: "bg-purple-50/10",
          avatarBorder: "border-purple-300"
        };
      case "peach":
        return {
          banner: "from-amber-100 via-orange-50 to-amber-200 border-amber-200 text-amber-800",
          accentColor: "text-amber-600",
          dotColorHex: "#ea580c",
          badgeBg: "bg-amber-100 text-amber-800 border-amber-250",
          cardAccent: "border-amber-200 hover:border-amber-300 ring-amber-100 bg-amber-50/20",
          glowBtn: "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200",
          bgOverlay: "bg-amber-50/10",
          avatarBorder: "border-amber-300"
        };
      case "mint":
        return {
          banner: "from-emerald-100 via-teal-50 to-emerald-200 border-emerald-200 text-emerald-800",
          accentColor: "text-emerald-600",
          dotColorHex: "#059669",
          badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-250",
          cardAccent: "border-emerald-200 hover:border-emerald-300 ring-emerald-100 bg-emerald-50/20",
          glowBtn: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200",
          bgOverlay: "bg-emerald-50/10",
          avatarBorder: "border-emerald-300"
        };
    }
  };

  const theme = getThemeClasses();

  // Cute Whimsical Milestones Meta
  const getTypeMeta = (type: string) => {
    switch (type) {
      case "First Meet":
        return { 
          emoji: "✨", 
          label: "First Spark Meeting", 
          bg: "bg-pink-100 text-pink-700 border-pink-200", 
          stamp: "BEGINNING OF US 💞",
          soundLabel: "A heartbeat skip"
        };
      case "First Date":
        return { 
          emoji: "🍿", 
          label: "First Cozy Date", 
          bg: "bg-rose-100 text-rose-700 border-rose-200", 
          stamp: "BUTTERFLIES IN TUMMY 🦋",
          soundLabel: "Soft sweet giggles"
        };
      case "First Talk":
        return { 
          emoji: "🧸", 
          label: "Midnight Heart-to-Heart Talk", 
          bg: "bg-purple-100 text-purple-700 border-purple-200", 
          stamp: "MIND MELTED 🧠💖",
          soundLabel: "Comforting secrets shared"
        };
      case "First Trip":
        return { 
          emoji: "✈️", 
          label: "Dream Escape Trip", 
          bg: "bg-indigo-100 text-indigo-700 border-indigo-200", 
          stamp: "ADVENTURE BUDDIES 🎒",
          soundLabel: "Singalong car stereo"
        };
      case "Proposal":
        return { 
          emoji: "💍", 
          label: "Happy Forever Proposal", 
          bg: "bg-rose-150 text-rose-800 border-rose-300", 
          stamp: "EASIEST YES 😭💍",
          soundLabel: "Happy emotional tears"
        };
      case "Anniversary":
        return { 
          emoji: "🎂", 
          label: "Sweet Loveline Anniversary", 
          bg: "bg-amber-100 text-amber-700 border-amber-200", 
          stamp: "ANOTHER SWEET YEAR 🥂",
          soundLabel: "Champagne bubbly cheers"
        };
      default:
        return { 
          emoji: "🍭", 
          label: "Whimsical Spark Moment", 
          bg: "bg-teal-100 text-teal-800 border-teal-200", 
          stamp: "JUST COZY VIBES 🍀",
          soundLabel: "Completely warm smile"
        };
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  // Calculation for sweet relationship stats
  const totalDaysLoved = useMemo(() => {
    if (sortedMilestones.length < 1) return 0;
    const start = new Date(sortedMilestones[0].date).getTime();
    const diff = Date.now() - start;
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }, [sortedMilestones]);

  const activeMilestoneIndex = selectedMilestone 
    ? sortedMilestones.findIndex(m => m.id === selectedMilestone.id) 
    : -1;

  // Funny sweet relationship "sticker sayings"
  const getLovelyStickerSaying = (index: number) => {
    const standardSayings = [
      "YOU ARE MY ENTIRE UNIVERSE ✨",
      "COZY NEST HUG APPROVED 🧸",
      "STUCK TO YOU LIKE HONEY 🍯",
      "MY HEART GOES POUND-POUND 💓",
      "FOREVER IN CO-PILOT MODE 💏",
      "YOU MAKE LIFE A HAPPY RAINBOW 🌈"
    ];
    return standardSayings[index % standardSayings.length];
  };

  return (
    <div id="cutie-timeline-scrapbook-view" className="space-y-8 select-none">
      
      {/* SLEEK PRESTIGE HEADER BAR - DRAMATICALLY CONDENSED & HIGHLY ENGAGING */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 bg-white/95 border border-rose-100/60 p-4.5 sm:p-5.5 rounded-2xl shadow-3xs relative overflow-hidden backdrop-blur-md transition-all duration-300">
        
        {/* Subtle romantic corner decoration */}
        <div className="absolute -top-10 -left-10 w-28 h-28 rounded-full bg-pink-100/30 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-28 h-28 rounded-full bg-purple-100/30 blur-xl pointer-events-none" />
        
        {/* Left Side: Brand badge, milestone metrics & clean description */}
        <div className="relative z-10 flex-1 min-w-0 text-left space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
            <span className="bg-pink-50 border border-pink-100/80 text-pink-600 font-black text-[9px] md:text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider select-none shrink-0">
              🌸 Timeline Diary
            </span>
            <span className="bg-slate-50 border border-slate-200/60 text-slate-500 font-bold font-mono text-[9.5px] md:text-[10px] px-2.5 py-0.5 rounded-full shrink-0">
              🍭 {sortedMilestones.length} Memories Saved
            </span>
            {totalDaysLoved > 0 && (
              <span className="bg-amber-50/80 border border-amber-200/50 text-amber-600 font-black text-[9.5px] md:text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0 select-none">
                💖 {totalDaysLoved} Days Strong
              </span>
            )}
          </div>
          
          <div className="space-y-0.5">
            <h2 className="font-display font-black text-lg md:text-xl text-slate-850 tracking-tight flex items-center gap-1.5">
              Timeline Diary &amp; Shared Scrapbook
            </h2>
            <p className="text-slate-500 text-xs leading-relaxed max-w-2xl font-medium">
              Pristine diary log &amp; map of your unforgettable milestones! Chat, check off memories, customize tones, and manage reminders directly on the trail.
            </p>
          </div>
        </div>

        {/* Right Side: Sleek Controls Toolbar */}
        <div className="relative z-10 flex flex-wrap items-center gap-2.5 md:gap-3 shrink-0">
          
          {/* Canvas Tone Selector */}
          <div className="flex items-center gap-2 bg-slate-100/85 border border-slate-200/50 rounded-xl px-2.5 py-1.5 hover:bg-slate-150 transition select-none">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Palette className="w-3.5 h-3.5 text-pink-500 shrink-0" /> Theme
            </span>
            <div className="flex items-center gap-1">
              {(["pink", "lavender", "peach", "mint"] as const).map((col) => (
                <button
                  key={col}
                  onClick={() => setCuteTheme(col)}
                  className={`w-3.5 h-3.5 rounded-full border transition duration-150 cursor-pointer ${
                    col === "pink" ? "bg-pink-400" :
                    col === "lavender" ? "bg-purple-400" :
                    col === "peach" ? "bg-amber-400" : "bg-emerald-400"
                  } ${cuteTheme === col ? "ring-2 ring-stone-900 border-white scale-110 shadow-xs" : "border-white/50 hover:scale-105 opacity-85"}`}
                  title={`Change Tone - ${col}`}
                />
              ))}
            </div>
          </div>

          {/* Interactive filter dropdown selection */}
          <div className="flex items-center bg-white border border-slate-200/90 hover:border-slate-350 rounded-xl px-2.5 py-1.5 shadow-3xs transition focus-within:ring-1 focus-within:ring-pink-500 focus-within:border-pink-500">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
            <select
              value={selectedTypeFilter}
              onChange={(e) => onSelectedTypeFilterChange(e.target.value)}
              className="bg-transparent focus:outline-hidden text-slate-750 font-black text-xs cursor-pointer focus:ring-0 select-none outline-hidden p-0 border-none"
              aria-label="Filter category"
            >
              <option value="All">All Categories</option>
              <option value="First Meet">👋 First Meet</option>
              <option value="First Date">☕ First Date</option>
              <option value="First Talk">📞 First Talk</option>
              <option value="First Trip">✈️ First Trip</option>
              <option value="Proposal">💍 Proposal</option>
              <option value="Anniversary">❤️ Anniversary</option>
              <option value="Custom">✨ Custom</option>
            </select>
          </div>

          {/* Layout Mode Toggler (Trail Map vs Bento Grid Board) */}
          <div className="flex items-center bg-slate-100/80 border border-slate-200/50 rounded-xl p-1 shrink-0 select-none">
            <button
              type="button"
              onClick={() => toggleLayoutMode('trail')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide transition flex items-center gap-1 cursor-pointer border-none ${
                layoutMode === 'trail'
                  ? 'bg-[#FFFFFE] text-pink-600 shadow-3xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Interactive adventure trail layout"
            >
              <span>🗺️ Trail</span>
            </button>
            <button
              type="button"
              onClick={() => toggleLayoutMode('grid')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide transition flex items-center gap-1 cursor-pointer border-none ${
                layoutMode === 'grid'
                  ? 'bg-[#FFFFFE] text-pink-600 shadow-3xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Clean multi-column dashboard grid layout"
            >
              <span>🎛️ Grid Board</span>
            </button>
          </div>

          {/* Compact Premium Action Button */}
          <button
            onClick={onAddMilestoneClick}
            className={`px-3.5 py-2 ${theme.glowBtn} text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-3xs hover:shadow-xs transition duration-200 cursor-pointer shrink-0 select-none`}
            title="Log deep relationship milestones"
          >
            <Plus className="w-4 h-4 shrink-0 font-extrabold" />
            <span>Record Milestone</span>
          </button>

        </div>

        {/* SWEET FLOATING CONFETTI SHOWER */}
        <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none overflow-hidden">
          {heartsTriggerList.map((heart) => (
            <motion.div
              key={heart.id}
              initial={{ scale: 0.1, y: 15, opacity: 1 }}
              animate={{ 
                scale: [1, 1.3, 0.8],
                y: -120, 
                rotate: [-20, 20, 0],
                opacity: [1, 0.9, 0] 
              }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              style={{ left: heart.x, top: heart.y }}
              className={`absolute text-lg font-bold pointer-events-none z-50 ${heart.color}`}
            >
              {heart.emoji}
            </motion.div>
          ))}
        </div>

      </div>

      {sortedMilestones.length === 0 ? (
        <div className="bg-[#FAF9F5] border-2 border-stone-200 p-12 rounded-3xl text-center space-y-4 max-w-xl mx-auto shadow-sm">
          <span className="text-5xl block animate-bounce">🧸🐾</span>
          <div className="space-y-1">
            <h3 className="font-display font-black text-lg text-stone-800">Map Your Cozy Timeline Journey!</h3>
            <p className="text-stone-500 text-xs max-w-sm mx-auto">
              No milestones, meetups, or sweet trips saved yet. Register milestone memory notes, dates, or beautiful snapshots, and an incredibly cute interactive pastel memory trial will unlock instantly!
            </p>
          </div>
          <button
            onClick={onAddMilestoneClick}
            className={`px-5 py-2.5 ${theme.glowBtn} text-xs font-black rounded-xl shadow-xs transition cursor-pointer`}
          >
            Mark Your First Cozy Stamp 🌸
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* INTERACTIVE ANIMATED SCRAPBOOK TIMELINE TRAIL (Left Column) */}
          {layoutMode === "trail" ? (
            <div 
              onClick={handleHeartExplosion}
              title="Click stations on the quest trail to view memories & unlock sparkles! ✨"
              className="lg:col-span-8 bg-[#FAF8F2] border-2 border-stone-200 p-4 sm:p-8 rounded-3xl relative overflow-hidden min-h-[600px] shadow-xs cursor-pointer select-none"
            >
              {/* Paper line grid scrapbook decoration */}
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#f4eedd_1px,transparent_1px)] bg-[size:100%_28px] pointer-events-none opacity-30" />
              
              {/* Cute ribbon top-header card */}
              <div className="relative z-10 flex items-center justify-between mb-8 pb-4 border-b border-dashed border-stone-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🗺️</span>
                    <h3 className="font-display font-black text-stone-850 text-base uppercase tracking-wider">Cozyland Loveline Quest Map</h3>
                  </div>
                  <p className="text-[10px] text-stone-500 font-bold tracking-tight">Tap any cozy station to fetch historic photos & diary entries</p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 bg-yellow-105 border border-yellow-300 text-[9px] font-black uppercase text-amber-800 px-3 py-1.5 rounded-full select-none rotate-2">
                  <span>🧸 Quest progress: {activeMilestoneIndex + 1} / {sortedMilestones.length}</span>
                </div>
              </div>

              {/* Floating clouds, stars, trees, campfire and other whimsical board-game decorations */}
              <div className="absolute top-24 left-[10%] opacity-20 pointer-events-none">
                <Cloud className="w-12 h-12 text-sky-200 fill-sky-200" />
              </div>
              <div className="absolute bottom-28 right-[15%] opacity-25 pointer-events-none">
                <Cloud className="w-16 h-16 text-pink-200 fill-pink-200" />
              </div>
              
              {/* Hand-drawn look absolute map decorations */}
              <div className="absolute top-36 right-[22%] opacity-60 text-lg pointer-events-none filter drop-shadow-xs" title="Sweet camp spot">
                ⛺
              </div>
              <div className="absolute bottom-36 left-[18%] opacity-60 text-lg pointer-events-none filter drop-shadow-xs" title="Lovely balloons">
                🎈
              </div>
              <div className="absolute top-[45%] left-[8%] opacity-55 text-lg pointer-events-none filter drop-shadow-xs" title="Warm tree spot">
                🌲
              </div>
              <div className="absolute bottom-48 right-[8%] opacity-55 text-xl pointer-events-none filter drop-shadow-xs" title="Picnic time">
                🧺🍷
              </div>
              <div className="absolute bottom-[40%] right-[30%] opacity-40 text-lg pointer-events-none animate-pulse">
                ⭐
              </div>

              {/* SERPENTINE WINDING ROADMAP ROW CHUNKS */}
              <div className="relative z-10 space-y-20 py-8 flex flex-col items-stretch max-w-2xl mx-auto">
                {(() => {
                  // Chunk sorted milestones into rows of up to 3 elements for serpentine zig-zag
                  const size = 3;
                  const chunks: Milestone[][] = [];
                  for (let i = 0; i < sortedMilestones.length; i += size) {
                    chunks.push(sortedMilestones.slice(i, i + size));
                  }

                  return chunks.map((rowMilestones, rowIndex) => {
                    const isEvenRow = rowIndex % 2 === 0; // Even row = L-to-R, Odd row = R-to-L

                    return (
                      <div 
                        key={rowIndex}
                        className={`flex items-center justify-around gap-2 relative ${
                          isEvenRow ? "flex-row" : "flex-row-reverse"
                        }`}
                      >
                        
                        {/* THE MILESTONE STATIONS IN ROW */}
                        {rowMilestones.map((milestone, idxInRow) => {
                          const globalIndex = rowIndex * size + idxInRow;
                          const isSelected = selectedMilestone?.id === milestone.id;
                          const meta = getTypeMeta(milestone.type);
                          const isReached = activeMilestoneIndex >= globalIndex;

                          return (
                            <React.Fragment key={milestone.id}>
                              
                              {/* STAMP NODE COMPONENT */}
                              <div className="relative flex flex-col items-center">
                                
                                {/* Hover interactive couple token sitting exactly overhead when active */}
                                {isSelected && (
                                  <motion.div 
                                    initial={{ y: -8, opacity: 0 }}
                                    animate={{ y: [ -12, -4, -12 ], opacity: 1 }}
                                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                                    className="absolute -top-12 z-30 bg-rose-500 text-white font-black text-[9px] tracking-widest px-2 py-0.5 rounded-full border-2 border-white shadow-md uppercase flex items-center gap-1 shrink-0 whitespace-nowrap"
                                  >
                                    <span>👩‍❤️‍👨 WE ARE HERE</span>
                                  </motion.div>
                                )}

                                {/* Outer spinning ring glow for selected station */}
                                {isSelected && (
                                  <div className="absolute inset-[-6px] rounded-full border-2 border-dashed border-pink-400 animate-spin" style={{ animationDuration: '10s' }} />
                                )}

                                {/* The 3D physical pin-station token */}
                                <motion.button
                                  whileHover={{ scale: 1.12, rotate: [0, -3, 3, 0] }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedMilestone(milestone);
                                  }}
                                  className={`w-15 h-15 sm:w-18 sm:h-18 rounded-full border-4 flex items-center justify-center relative shadow-sm cursor-pointer transition-all duration-300 ${
                                    isSelected 
                                      ? "bg-rose-500 border-white text-white shadow-lg ring-4 ring-pink-400/30 scale-105" 
                                      : isReached
                                        ? "bg-white border-pink-400 text-pink-600 hover:border-pink-500 shadow-3xs"
                                        : "bg-stone-50 border-stone-300 text-stone-500 hover:border-pink-300"
                                  }`}
                                >
                                  {/* Milestone Emoji badge */}
                                  <span className="text-2xl sm:text-3xl select-none">{meta.emoji}</span>
                                  
                                  {/* Small indicator light */}
                                  <div className={`absolute top-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full ${
                                    isReached ? "bg-emerald-400" : "bg-stone-300"
                                  }`} />
                                </motion.button>

                                {/* Station details sticker metadata block */}
                                <div className="mt-2.5 text-center max-w-[100px] sm:max-w-[130px] space-y-0.5">
                                  <p className="text-[8px] sm:text-[9px] font-black text-stone-400 tracking-widest uppercase font-mono">
                                    🍭 STATION {globalIndex + 1}
                                  </p>
                                  <h5 className={`text-[10px] sm:text-xs font-black truncate leading-none transition-colors ${
                                    isSelected ? "text-pink-600" : "text-stone-800"
                                  }`}>
                                    {milestone.title}
                                  </h5>
                                  <p className="text-[8px] sm:text-[9px] text-[#8C765C] font-semibold font-mono">
                                    {formatDate(milestone.date)}
                                  </p>
                                </div>

                              </div>

                              {/* Horizontal connecting vector line inside the current row */}
                              {idxInRow < rowMilestones.length - 1 && (
                                <div className="flex-1 min-w-[16px] sm:min-w-[40px] h-[3px] relative self-center -translate-y-4">
                                  {/* Inner colorful progression line */}
                                  <div className={`absolute inset-0 h-full rounded-full transition-all duration-500 ${
                                    activeMilestoneIndex >= (globalIndex + 1)
                                      ? "bg-linear-to-r from-pink-400 to-rose-400"
                                      : "bg-dashed border-t-4 border-stone-250 opacity-40"
                                  }`} />
                                </div>
                              )}

                            </React.Fragment>
                          );
                        })}

                        {/* High-end absolute S-curve vector connector to link down to the next row */}
                        {rowIndex < chunks.length - 1 && (
                          <div className={`absolute bottom-[-54px] w-12 sm:w-16 h-14 z-0 pointer-events-none ${
                            isEvenRow ? "right-[10%] sm:right-[15%]" : "left-[10%] sm:left-[15%]"
                          }`}>
                            <svg className={`w-full h-full ${isEvenRow ? "text-pink-400/80" : "text-purple-400/80"}`} viewBox="0 0 64 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                              {isEvenRow ? (
                                // Right-side U-turn loop going down and curving back to left row start
                                <path 
                                  d="M 5 0 C 45 4, 65 30, 20 54" 
                                  stroke="currentColor" 
                                  strokeWidth="3.5" 
                                  strokeDasharray="6 4" 
                                  strokeLinecap="round"
                                />
                              ) : (
                                // Left-side U-turn loop going down and curving back to right row start
                                <path 
                                  d="M 59 0 C 19 4, -1 30, 44 54" 
                                  stroke="currentColor" 
                                  strokeWidth="3.5" 
                                  strokeDasharray="6 4" 
                                  strokeLinecap="round"
                                />
                              )}
                            </svg>
                          </div>
                        )}

                      </div>
                    );
                  });
                })()}
              </div>

              {/* End of Trail Cutie finish bubble flags */}
              <div className="relative mt-16 pt-4 border-t border-dashed border-stone-200 text-center flex flex-col items-center justify-center gap-1">
                <div className="flex items-center gap-1 text-[10px] font-black uppercase text-pink-600 bg-pink-50 border-2 border-pink-200 px-4 py-1.5 rounded-full shadow-3xs animate-pulse">
                  <span>🏁 END OF ODYSSEY STATIONS! ADD MORE MEMORIES 🐾</span>
                </div>
                <p className="text-[9px] text-[#8C765C] font-semibold max-w-sm mt-0.5">Your romantic timeline is archived neatly. Register trip notes to progress the pieces!</p>
              </div>

            </div>
          ) : (
            /* COMPACT BENTO CARD GRID BOARD MODE */
            <div className="lg:col-span-8 space-y-6 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedMilestones.map((milestone, index) => {
                  const isSelected = selectedMilestone?.id === milestone.id;
                  const meta = getTypeMeta(milestone.type);
                  return (
                    <motion.div
                      key={milestone.id}
                      whileHover={{ scale: 1.015, y: -2 }}
                      onClick={() => setSelectedMilestone(milestone)}
                      className={`bg-white rounded-2xl p-4 border text-left cursor-pointer transition-all duration-300 relative select-none ${
                        isSelected 
                          ? "border-pink-300 ring-4 ring-pink-50 shadow-md" 
                          : "border-stone-200 shadow-3xs hover:shadow-xs hover:border-stone-250"
                      }`}
                    >
                      {/* Badge category stamp */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full border border-stone-150 tracking-wide uppercase bg-slate-50 text-slate-500 font-mono">
                          🍭 Station {index + 1}
                        </span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border tracking-wide uppercase ${meta.bg}`}>
                          {meta.label}
                        </span>
                      </div>

                      <h4 className="font-display font-black text-sm text-slate-850 truncate">
                        {milestone.title}
                      </h4>
                      <div className="flex items-center gap-1 text-stone-400 font-bold font-mono text-[9px] mt-1">
                        <Calendar className="w-3 h-3 text-pink-400" />
                        <span>{formatDate(milestone.date)}</span>
                      </div>

                      <p className="text-slate-600 font-medium text-xs line-clamp-2 mt-2 leading-relaxed">
                        "{milestone.description || "No extra diary description notes logged."}"
                      </p>

                      {milestone.imageUrl && (
                        <div className="mt-3 rounded-xl overflow-hidden h-24 bg-stone-50 border border-stone-150 relative">
                          <img 
                            src={milestone.imageUrl} 
                            alt={milestone.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ACTIVE SELECTED SCRAPBOOK DETAILS PANEL (Right Column) */}
          <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-6">
            <AnimatePresence mode="wait">
              {selectedMilestone ? (
                <motion.div
                  key={selectedMilestone.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="bg-[#FAF9F5] border-2 border-stone-200 rounded-3xl p-6 shadow-sm space-y-5 relative overflow-hidden"
                >
                  {/* Decorative pastel washi tape */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-pink-400 via-purple-300 to-amber-300" />
                  
                  {/* Cute stamp decal sticker */}
                  <div className="absolute top-3 right-4 w-22 h-6 bg-pink-100/80 border border-dashed border-pink-300 text-[8px] font-black text-pink-800 uppercase flex items-center justify-center tracking-widest rotate-6">
                    🍀 SELECTED COZY STAMP
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getTypeMeta(selectedMilestone.type).emoji}</span>
                      <div>
                        <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border tracking-wide uppercase ${getTypeMeta(selectedMilestone.type).bg}`}>
                          {selectedMilestone.type}
                        </span>
                        <p className="text-[10px] text-stone-500 font-bold mt-0.5">Scrapbook Node</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onEditMilestone(selectedMilestone)}
                        className="p-2 border border-stone-200 hover:border-purple-300 hover:bg-purple-50 text-stone-605 hover:text-purple-600 rounded-xl transition cursor-pointer"
                        title="Edit details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteMilestone(selectedMilestone.id)}
                        className="p-2 border border-stone-200 hover:border-rose-300 hover:bg-rose-50 text-stone-605 hover:text-rose-600 rounded-xl transition cursor-pointer"
                        title="Delete from scrapbook"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Text Header */}
                  <div className="space-y-1.5 pt-1">
                    <h2 className="font-display font-black text-stone-850 text-base md:text-lg tracking-tight leading-snug">
                      {selectedMilestone.title}
                    </h2>
                    
                    <div className="flex items-center gap-1 text-xs text-stone-500 font-bold">
                      <Calendar className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                      <span>{formatDate(selectedMilestone.date)}</span>
                    </div>
                  </div>

                  {/* Picture frame */}
                  {selectedMilestone.imageUrl ? (
                    <div className="aspect-video w-full rounded-2xl overflow-hidden border border-stone-200 bg-white p-1 shadow-3xs">
                      <img
                        src={selectedMilestone.imageUrl}
                        alt={selectedMilestone.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </div>
                  ) : (
                    <div className="py-4 bg-amber-50/20 border border-dashed border-amber-200 text-center rounded-2xl flex flex-col items-center justify-center p-2 text-stone-400 gap-1.5">
                      <span className="text-2xl animate-pulse">📷</span>
                      <span className="text-[10px] font-bold">Press "Edit" to swap in a beautiful sweet photograph!</span>
                    </div>
                  )}

                  {/* Cursive Handwriting block note style */}
                  <div className="bg-[#FFFFFE] border border-stone-200 rounded-2xl p-4 space-y-2 shadow-3xs relative">
                    <Paperclip className="absolute -top-3 left-4 w-4 h-4 text-stone-400 rotate-12" />
                    <div className="flex items-center justify-between pb-1.5 border-b border-dashed border-stone-150 mb-1">
                      <span className="text-[9px] uppercase font-black text-stone-400 tracking-wider">Livelog Journal Memoir</span>
                      <span className="text-[9px] font-black text-pink-600 bg-pink-50 px-2 rounded-full border border-pink-200">
                        {getTypeMeta(selectedMilestone.type).stamp}
                      </span>
                    </div>
                    <p className="text-stone-750 text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-sans font-medium">
                      {selectedMilestone.description}
                    </p>
                  </div>

                  {/* Reminders / Milestone Alerts area */}
                  <div className="border border-stone-200 rounded-2xl bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-xs">🔔</span>
                        <h6 className="text-[10px] uppercase font-black text-stone-600 tracking-wider">Alert Scheduler</h6>
                      </div>
                      
                      {getMilestoneReminder(selectedMilestone.id) && (
                        <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full animate-pulse">
                          Active Alert
                        </span>
                      )}
                    </div>

                    {getMilestoneReminder(selectedMilestone.id) ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-stone-50 border border-stone-150 rounded-xl space-y-2">
                          <p className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                            <span>Scheduled {getMilestoneReminder(selectedMilestone.id)?.deliveryType} Notification</span>
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-stone-700">{formatDate(getMilestoneReminder(selectedMilestone.id)!.scheduledDate)}</span>
                            <button
                              onClick={() => {
                                if (window.confirm("Do you want to cancel the scheduled reminder alert for this milestone?")) {
                                  onSaveReminder(
                                    selectedMilestone.id, 
                                    getMilestoneReminder(selectedMilestone.id)!.deliveryType, 
                                    getMilestoneReminder(selectedMilestone.id)!.scheduledDate, 
                                    true
                                  );
                                }
                              }}
                              className="px-2 py-1 text-[10px] font-black bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-750 border border-rose-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {activeSchedulerId === selectedMilestone.id ? (
                           <div className="space-y-3 pt-1">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-black text-stone-400 uppercase tracking-wider block mb-1">Channel</label>
                                <select
                                  value={deliveryType}
                                  onChange={(e) => setDeliveryType(e.target.value as ReminderType)}
                                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-2 py-1.5 text-xs font-bold text-stone-850 outline-none cursor-pointer"
                                >
                                  <option value="Email">📧 Email Alert</option>
                                  <option value="In-App">📱 In-App Alert</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[9px] font-black text-stone-400 uppercase tracking-wider block mb-1">Alert Date</label>
                                <input
                                  type="date"
                                  required
                                  value={scheduledDate}
                                  onChange={(e) => setScheduledDate(e.target.value)}
                                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-2 py-1 text-xs font-bold text-stone-850 outline-none cursor-pointer"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                onClick={() => setActiveSchedulerId(null)}
                                className="px-3 py-1.5 text-[10px] font-bold text-stone-500 hover:text-stone-700 bg-stone-100 hover:bg-stone-150 rounded-lg transition cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={async () => {
                                  if (!scheduledDate) return;
                                  await onSaveReminder(selectedMilestone.id, deliveryType, scheduledDate);
                                  setActiveSchedulerId(null);
                                }}
                                className="px-3.5 py-1.5 text-[10px] font-black bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition shadow-3xs cursor-pointer"
                              >
                                Create Alert
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setScheduledDate(getSensibleDefaultDate(selectedMilestone.date));
                              setDeliveryType("Email");
                              setActiveSchedulerId(selectedMilestone.id);
                            }}
                            className="w-full py-2.5 border border-stone-300 hover:border-pink-300 bg-stone-50 hover:bg-pink-50/20 text-stone-600 hover:text-pink-600 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Bell className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
                            <span>Schedule Sweet Alert / Notification</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Premium AI Love Letter Section inside timeline */}
                  {selectedMilestone.generatedLetter ? (
                    <div className="p-4 border border-pink-100 bg-[#FFFFFE] rounded-2xl space-y-3 shadow-3xs relative">
                      <div className="absolute top-2.5 right-3 text-[10px] font-bold font-mono text-pink-400 tracking-tight uppercase">AI Quill</div>
                      <div className="flex items-center gap-1.5 text-pink-600">
                        <Sparkles className="w-4 h-4 animate-pulse fill-pink-300" />
                        <span className="text-xs font-black">AI Letter Style: {selectedMilestone.aiLetterStyle}</span>
                      </div>
                      <p className="text-xs text-stone-750 leading-relaxed italic line-clamp-4">
                        "{selectedMilestone.generatedLetter}"
                      </p>
                      <button
                        onClick={() => onViewLetter(selectedMilestone)}
                        className="w-full py-2 bg-pink-100 hover:bg-pink-150/80 text-pink-700 hover:text-pink-800 text-[11px] font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Read Full Generated AI Letter</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onViewLetter(selectedMilestone)}
                      className="w-full py-3.5 bg-linear-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white text-xs font-black rounded-2xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-4.5 h-4.5 text-white animate-pulse" />
                      <span>Generate AI Love Greetings Letter ✨</span>
                    </button>
                  )}

                </motion.div>
              ) : (
                <div className="bg-[#FAF9F5] border border-stone-200 rounded-3xl p-6 shadow-sm text-center py-12 space-y-3 text-stone-450">
                  <span className="text-4xl block">👉</span>
                  <p className="text-xs leading-relaxed max-w-xs mx-auto">Select any polaroid station in the trail to preview beautiful photographs, diaries, or set reminder channels!</p>
                </div>
              )}
            </AnimatePresence>
            
            {/* Soft Tip Card */}
            <div className="bg-[#FAF9F5]/75 p-4 rounded-3xl border border-stone-200 text-[11px] leading-relaxed text-stone-605 space-y-1">
              <span className="font-black text-stone-850 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-pink-500" />
                Memory Lane Tip
              </span>
              <p>Keep adding memories! Your trail gets longer in chronological sequence. Press "Edit" in the details panel top-right to replace pictures or customize notes at any time.</p>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
