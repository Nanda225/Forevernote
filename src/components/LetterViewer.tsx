import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, Heart, RefreshCw, Copy, Check, Palette } from "lucide-react";
import { Milestone, LetterStyle, UserProfile } from "../types";

interface LetterViewerProps {
  isOpen: boolean;
  onClose: () => void;
  milestone: Milestone;
  profile: UserProfile | null;
  // Callback to save the generated letter to Firestore when verified / appreciated by user
  onSaveGeneratedLetter: (milestoneId: string, letter: string, style: LetterStyle) => Promise<void>;
}

type PresentationTheme = "Parchment" | "MidnightRose" | "SkyDoodle" | "CyberSlang" | "LavendarGlow";

const THEMES: { id: PresentationTheme; name: string; styleClass: string; textClass: string; badgeClass: string }[] = [
  {
    id: "Parchment",
    name: "Classic Parchment 📜",
    styleClass: "bg-[#FDFBF7] border-amber-200/60 shadow-amber-100",
    textClass: "font-serif text-[#432C1E] leading-relaxed italic text-base",
    badgeClass: "bg-amber-105 text-amber-705 border-amber-200",
  },
  {
    id: "MidnightRose",
    name: "Midnight Rose 🌹",
    styleClass: "bg-radial from-stone-900 to-stone-950 text-white border-rose-900/60 shadow-rose-950",
    textClass: "font-sans text-rose-100/90 leading-relaxed text-sm md:text-base",
    badgeClass: "bg-rose-950 text-rose-300 border-rose-900",
  },
  {
    id: "SkyDoodle",
    name: "Sky Doodle ☁️",
    styleClass: "bg-[#F0F8FF] border-sky-200/75 shadow-sky-100 border-dashed border-2",
    textClass: "font-display text-[#1E3A8A] leading-relaxed text-sm font-semibold",
    badgeClass: "bg-sky-100 text-sky-700 border-sky-300",
  },
  {
    id: "CyberSlang",
    name: "Retro Cyber 🔮",
    styleClass: "bg-[#0b0a14] border-purple-500/50 shadow-purple-950",
    textClass: "font-mono text-[#4ade80] leading-relaxed text-xs sm:text-sm",
    badgeClass: "bg-purple-950 text-purple-300 border-purple-500",
  },
  {
    id: "LavendarGlow",
    name: "Lavender Glow ✨",
    styleClass: "bg-linear-to-br from-purple-50 via-pink-50 to-indigo-50 border-purple-200/60 shadow-purple-100",
    textClass: "font-sans text-purple-950 leading-relaxed text-sm",
    badgeClass: "bg-purple-100 text-purple-700 border-purple-200",
  },
];

export default function LetterViewer({ isOpen, onClose, milestone, profile, onSaveGeneratedLetter }: LetterViewerProps) {
  const [activeStyle, setActiveStyle] = useState<LetterStyle>(milestone.aiLetterStyle || "Romantic");
  const [activeTheme, setActiveTheme] = useState<PresentationTheme>("LavendarGlow");
  const [letterContent, setLetterContent] = useState<string>(milestone.generatedLetter || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Generate Letter from Gemini API on load or style change
  const generateLetter = async (styleToUse: LetterStyle) => {
    try {
      setIsGenerating(true);
      setError("");

      const response = await fetch("/api/letter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: milestone.title,
          type: milestone.type,
          date: milestone.date,
          description: milestone.description,
          style: styleToUse,
          userName: profile?.name || "Your favorite human",
          partnerName: profile?.partnerName || "Love",
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Cupid's quill ran out of ink. Please try again!");
      }

      const data = await response.json();
      if (data.letter) {
        setLetterContent(data.letter);
      } else {
        throw new Error("Invalid letter response format.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to generate your personalized letter.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Run on mount / if letter is vacant
  useEffect(() => {
    if (isOpen) {
      if (!milestone.generatedLetter || activeStyle !== milestone.aiLetterStyle) {
        generateLetter(activeStyle);
      } else {
        setLetterContent(milestone.generatedLetter);
      }
    }
    setCopied(false);
  }, [isOpen, milestone, activeStyle]);

  // Handle saving the generated letter permanently to storage
  const handleSaveToMilestone = async () => {
    if (!letterContent) return;
    try {
      setIsSaving(true);
      await onSaveGeneratedLetter(milestone.id, letterContent, activeStyle);
    } catch (err: any) {
      console.error(err);
      setError("Failed to lock this letter onto the milestone.");
    } finally {
      setIsSaving(false);
    }
  };

  // Copy-to-clipboard functionality
  const handleCopy = () => {
    navigator.clipboard.writeText(letterContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedTheme = THEMES.find((t) => t.id === activeTheme) || THEMES[0];

  const getStyleEmoji = (styleName: LetterStyle) => {
    switch (styleName) {
      case "Romantic": return "💖";
      case "Playful": return "🦄";
      case "Cute": return "🥰";
      case "Nostalgic": return "⌛";
      case "Sarcastic": return "💀";
      case "GenZ Slang": return "💅";
      default: return "✨";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-stone-950/50 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Letter Showcase Envelope Modal */}
          <motion.div
            initial={{ scale: 0.93, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 30 }}
            className="relative bg-[#faf9f6] border border-stone-200 shadow-2xl max-w-2xl w-full rounded-3xl p-6 md:p-8 flex flex-col justify-between max-h-[92vh] overflow-y-auto z-10"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 bg-white/70 hover:bg-stone-100 border border-stone-200 rounded-xl transition cursor-pointer z-20"
            >
              <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
            </button>

            <div className="space-y-6">
              {/* Header Title with animated Sparkle */}
              <div className="flex items-center gap-3">
                <div className="bg-pink-100 text-pink-600 p-2.5 rounded-2xl shadow-2xs">
                  <Heart className="w-6 h-6 fill-pink-50 animate-pulse" />
                </div>
                <div>
                  <h2 className="font-display font-extrabold text-2xl text-gray-900 tracking-tight flex items-center gap-1.5">
                    Soul-Connect Letter Envelope
                  </h2>
                  <p className="text-gray-500 text-xs">Heartfelt reflections, customized from your story</p>
                </div>
              </div>

              {/* TONE SWITCHER BAR */}
              <div className="space-y-2 bg-stone-50 p-4 rounded-2xl border border-stone-250">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                  Switch Up the Letter Tone
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(["Romantic", "Playful", "Cute", "Nostalgic", "Sarcastic", "GenZ Slang"] as LetterStyle[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        if (!isGenerating) {
                          setActiveStyle(st);
                          generateLetter(st);
                        }
                      }}
                      disabled={isGenerating}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition ${
                        activeStyle === st
                          ? "bg-purple-600 text-white shadow-xs"
                          : "bg-white hover:bg-stone-100 text-gray-600 border border-stone-200"
                      }`}
                    >
                      <span>{getStyleEmoji(st)}</span>
                      <span>{st}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ENVELOPE THEME SWITCHER */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1 py-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <Palette className="w-4 h-4 text-purple-500" />
                  <span>Choose Letter Presentation Style:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setActiveTheme(theme.id)}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold transition ${
                        activeTheme === theme.id
                          ? "bg-gray-900 text-white"
                          : "bg-white hover:bg-stone-50 text-gray-600 border border-stone-250"
                      }`}
                    >
                      {theme.name.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* CARD PREVIEW AREA */}
              <div className="relative">
                {isGenerating ? (
                  <div className={`min-h-[280px] rounded-2.5xl p-8 border flex flex-col items-center justify-center space-y-4 shadow-sm bg-linear-to-b from-purple-50 to-pink-50 border-purple-100`}>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="text-pink-500"
                    >
                      <RefreshCw className="w-8 h-8" />
                    </motion.div>
                    <div className="text-center space-y-1">
                      <p className="text-gray-700 font-medium text-sm">Tuning the deep heartstrings to weave beautiful words...</p>
                      <p className="text-gray-400 text-xs italic">"Stitching memories into a '{activeStyle}' letter draft..."</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="min-h-[280px] bg-rose-50 border border-rose-100 p-8 rounded-2.5xl flex flex-col items-center justify-center text-center space-y-3">
                    <span className="text-4xl">⚠️</span>
                    <p className="text-rose-700 font-medium text-sm">{error}</p>
                    <button
                      onClick={() => generateLetter(activeStyle)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg shadow-sm transition"
                    >
                      Retry Generation
                    </button>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`min-h-[285px] rounded-3xl p-6 md:p-8 border shadow-lg transition-all duration-300 relative overflow-hidden ${selectedTheme.styleClass}`}
                  >
                    {/* Tiny visual sparkle corners */}
                    <div className="absolute top-4 right-4 opacity-50 flex items-center gap-1 text-xs">
                      <Sparkles className="w-4 h-4 text-pink-400" />
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase border ${selectedTheme.badgeClass}`}>
                        {activeStyle}
                      </span>
                    </div>

                    {/* Render generated text */}
                    <div className={`${selectedTheme.textClass} whitespace-pre-line pr-4 select-text`}>
                      {letterContent || "Your precious greeting letter will blossom right here."}
                    </div>

                    {/* Decorative floating icon */}
                    <div className="absolute bottom-4 right-4 text-pink-300/30">
                      <Heart className="w-12 h-12 fill-current" />
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* ACTION FOOTER BAR */}
            <div className="mt-8 pt-5 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-gray-500 font-medium italic text-center sm:text-left">
                💡 Tip: Copy to clipboard to paste directly in a WhatsApp, Instagram, or postcard greeting!
              </span>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={handleCopy}
                  disabled={!letterContent || isGenerating}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 text-gray-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition duration-200 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 font-medium">Copied Card!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Letter Text</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleSaveToMilestone}
                  disabled={!letterContent || isGenerating || isSaving}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition cursor-pointer"
                >
                  <Heart className="w-4 h-4 fill-white text-white" />
                  <span>{isSaving ? "Locking..." : "Lock in Milestone"}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
