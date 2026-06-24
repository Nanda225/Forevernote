import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Heart, Clock, Smile, Send, Trash2, BookOpen, 
  RefreshCw, Bookmark, AlertCircle, Quote, Feather, Plus, Check, ChevronRight, HelpCircle
} from "lucide-react";
import { Milestone, UserProfile, LetterStyle } from "../types";

export interface StorytellerData {
  atmosphere: string;
  voice: string;
  draft: string;
  reactions: { userName: string; text: string; createdAt: string }[];
}

export const parseStorytellerMilestone = (m: Milestone): StorytellerData => {
  if (!m.description.startsWith("[STORYTELLER]")) {
    return {
      atmosphere: "Midnight Muse",
      voice: "Bard of Love",
      draft: m.description,
      reactions: []
    };
  }
  try {
    const jsonStr = m.description.replace("[STORYTELLER]", "").trim();
    return JSON.parse(jsonStr) as StorytellerData;
  } catch (e) {
    return {
      atmosphere: "Midnight Muse",
      voice: "Bard of Love",
      draft: m.description,
      reactions: []
    };
  }
};

const ATMOSPHERES = [
  { 
    id: "Midnight Muse", 
    name: "Midnight Muse 🌌", 
    bgClass: "from-slate-950 via-indigo-950 to-slate-950",
    textClass: "text-indigo-100", 
    inputBg: "bg-indigo-950/45",
    borderClass: "border-indigo-500/30 font-serif",
    accent: "text-indigo-400"
  },
  { 
    id: "Enchanted Hearth", 
    name: "Enchanted Hearth 🔥", 
    bgClass: "from-[#1E110B] via-[#331C13] to-[#1E110B]",
    textClass: "text-orange-100", 
    inputBg: "bg-orange-950/40",
    borderClass: "border-orange-500/20 font-serif",
    accent: "text-orange-400"
  },
  { 
    id: "Vintage Coffee", 
    name: "Vintage Coffee ☕", 
    bgClass: "from-[#1F1912] via-[#2F241A] to-[#1F1912]",
    textClass: "text-[#EFE2CE]", 
    inputBg: "bg-[#16100A]/60",
    borderClass: "border-amber-650/25 font-mono",
    accent: "text-amber-400"
  },
  { 
    id: "Dreamy Oasis", 
    name: "Lavender Oasis 🌸", 
    bgClass: "from-indigo-950 via-[#27193F] to-indigo-950",
    textClass: "text-[#FDF5FF]", 
    inputBg: "bg-[#1C1028]/60",
    borderClass: "border-fuchsia-500/25 font-sans",
    accent: "text-fuchsia-400"
  }
];

const VOICES = [
  { id: "Bard of Love", name: "Bard of Love 💖", desc: "Warm, romantic, poetic lyricism" },
  { id: "Vintage Novelist", name: "Vintage Novelist 📜", desc: "Classic third-person narrative prose" },
  { id: "Modern Screenplay", name: "Modern Screenplay 🎬", desc: "Cinematic directions and action tags" },
  { id: "Dreamy Poetic Whisper", name: "Star-Crossed Whisper 🌌", desc: "Surreal imagery under starry skies" }
];

interface StorytellerQuillProps {
  user: any;
  profile: UserProfile | null;
  milestones: Milestone[];
  onSaveStory: (title: string, data: StorytellerData, refinedContent: string) => Promise<void>;
  onUpdateStoryReactions: (storyId: string, reactions: { userName: string; text: string; createdAt: string }[]) => Promise<void>;
  onDeleteStory: (storyId: string) => Promise<void>;
}

export default function StorytellerQuill({
  user,
  profile,
  milestones,
  onSaveStory,
  onUpdateStoryReactions,
  onDeleteStory
}: StorytellerQuillProps) {
  const [activeAtmosphere, setActiveAtmosphere] = useState(ATMOSPHERES[0]);
  const [storyTitle, setStoryTitle] = useState("");
  const [storyDraft, setStoryDraft] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("Bard of Love");
  const [isPolishing, setIsPolishing] = useState(false);
  const [refinedResult, setRefinedResult] = useState("");
  const [activeStory, setActiveStory] = useState<Milestone | null>(null);
  const [viewingMode, setViewingMode] = useState<"read" | "write">("write");
  const [textMode, setTextMode] = useState<"draft" | "polished">("polished");
  const [reactionText, setReactionText] = useState("");
  const [savingReaction, setSavingReaction] = useState(false);
  const [submittingStory, setSubmittingStory] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showNotification = (type: "success" | "error" | "info", msg: string) => {
    setNotification({ type, message: msg });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Filter out story milestones flagged in description
  const storytellerStories = milestones.filter(m => m.description.startsWith("[STORYTELLER]"));

  const currentAtmosphereStyle = activeAtmosphere;

  // Handle Polishing Story Draft with Gemini API
  const handlePolishStory = async () => {
    if (!storyTitle.trim()) {
      showNotification("info", "Please give your Story a memorable title first!");
      return;
    }
    if (!storyDraft.trim()) {
      showNotification("info", "Write some authentic memories or thoughts in your notebook draft before polishing.");
      return;
    }

    try {
      setIsPolishing(true);
      const response = await fetch("/api/storyteller/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: storyTitle.trim(),
          content: storyDraft.trim(),
          voice: selectedVoice,
          userName: profile?.name || user.displayName || "A Heartfelt Narrator",
          partnerName: profile?.partnerName || "the beloved partner"
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Story teller bard is feeling uninspired. Please try again!");
      }

      const data = await response.json();
      if (data.story) {
        setRefinedResult(data.story);
      }
    } catch (err: any) {
      console.error(err);
      showNotification("error", "Error generating story: " + err.message);
    } finally {
      setIsPolishing(false);
    }
  };

  // Publish Story to secure firestore collection
  const handlePublishStory = async () => {
    if (!storyTitle.trim() || !storyDraft.trim() || !refinedResult) {
      showNotification("info", "Make sure you write, refine, and preview your masterpiece before publishing.");
      return;
    }

    try {
      setSubmittingStory(true);
      const storyData: StorytellerData = {
        atmosphere: activeAtmosphere.id,
        voice: selectedVoice,
        draft: storyDraft.trim(),
        reactions: []
      };

      await onSaveStory(storyTitle.trim(), storyData, refinedResult);

      setPublishSuccess(true);
      setStoryTitle("");
      setStoryDraft("");
      setRefinedResult("");
      setTimeout(() => {
        setPublishSuccess(false);
      }, 4000);
    } catch (err: any) {
      console.error(err);
      showNotification("error", "Failed to store story storyteller node: " + err.message);
    } finally {
      setSubmittingStory(false);
    }
  };

  // Submit reaction comment
  const handlePostReaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStory || !reactionText.trim()) return;

    try {
      setSavingReaction(true);
      const parsed = parseStorytellerMilestone(activeStory);
      const currentReactions = parsed.reactions || [];

      const newReaction = {
        userName: profile?.name || user.displayName || "Beloved Reader",
        text: reactionText.trim(),
        createdAt: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      };

      const updatedReactions = [newReaction, ...currentReactions];
      await onUpdateStoryReactions(activeStory.id, updatedReactions);
      
      // Update local state instance
      const updatedStory = {
        ...activeStory,
        description: `[STORYTELLER]${JSON.stringify({ ...parsed, reactions: updatedReactions })}`
      };
      setActiveStory(updatedStory);
      setReactionText("");
    } catch (err: any) {
      console.error(err);
    } finally {
      setSavingReaction(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch font-sans">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-11/12 p-4 rounded-2xl border shadow-2xl flex items-center justify-between text-xs font-bold ${
              notification.type === "success" 
                ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46] shadow-emerald-500/5" 
                : notification.type === "error" 
                ? "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B] shadow-red-500/5" 
                : "bg-[#FFFBEB] border-[#FDE68A] text-[#92400E] shadow-amber-500/5"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {notification.type === "success" ? "✨" : notification.type === "error" ? "🛑" : "⚠️"}
              </span>
              <span>{notification.message}</span>
            </div>
            <button 
              onClick={() => setNotification(null)} 
              className="ml-3 font-extrabold hover:opacity-75 transition-opacity px-1 "
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* LEFT COLUMN: THE STORYTELLER WRITING SLATE / WORKSPACE */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Toggle between Create & Read library */}
        <div className="flex bg-white/70 backdrop-blur-xs p-1 border border-rose-100 rounded-2xl shadow-2xs">
          <button
            onClick={() => setViewingMode("write")}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              viewingMode === "write" ? "bg-pink-600 text-white shadow-md shadow-pink-600/10" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Feather className="w-3.5 h-3.5" />
            Storyteller Quill Slate
          </button>
          <button
            onClick={() => {
              setViewingMode("read");
              if (storytellerStories.length > 0 && !activeStory) {
                setActiveStory(storytellerStories[0]);
              }
            }}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              viewingMode === "read" ? "bg-pink-600 text-white shadow-md shadow-pink-600/10" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Our Chronicles Library ({storytellerStories.length})
          </button>
        </div>

        {viewingMode === "write" ? (
          <div className="space-y-6">
            
            {/* Ambient Atmosphere selector panel */}
            <div className="bg-white p-5 rounded-3xl border border-rose-150/40 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Atmospheric Background Muse</span>
                <span className="text-[9px] text-slate-400 font-bold">Transforms your writing space</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ATMOSPHERES.map((atm) => (
                  <button
                    key={atm.id}
                    onClick={() => setActiveAtmosphere(atm)}
                    className={`py-2 px-3 text-[10.5px] font-bold rounded-xl transition-all border flex items-center justify-center ${
                      activeAtmosphere.id === atm.id
                        ? "bg-slate-900 text-white border-slate-900 scale-102"
                        : "bg-stone-50 text-slate-600 hover:bg-stone-100 border-slate-200"
                    }`}
                  >
                    {atm.name}
                  </button>
                ))}
              </div>
            </div>

            {/* The Writer Slate Box */}
            <div className={`rounded-3xl border p-6 md:p-8 transition-all duration-700 shadow-xl bg-linear-to-b ${currentAtmosphereStyle.bgClass} ${currentAtmosphereStyle.textClass} border-slate-900/10`}>
              
              {/* Slate Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/10 rounded-lg">
                    <Feather className="w-4 h-4 animate-bounce" />
                  </div>
                  <div>
                    <span className="text-[8px] uppercase tracking-widest font-mono select-none block opacity-60">Creative Manuscript Draft</span>
                    <span className="text-xs font-serif italic block">Write your true feelings below...</span>
                  </div>
                </div>
                
                <span className="text-[9px] font-mono select-none py-0.5 px-2 rounded-full bg-white/10 text-white">
                  {storyDraft.length} / 2500 words
                </span>
              </div>

              {/* Slate Title Entry & Draft Body */}
              <div className="space-y-4">
                <input
                  type="text"
                  maxLength={150}
                  required
                  placeholder="Draft Story Title (e.g., When We Lost our Map in Seoul, Retro Picnic ⛺)"
                  className="w-full bg-transparent hover:bg-white/5 border-b border-white/10 py-1 focus:outline-hidden text-base sm:text-lg font-serif italic font-black placeholder-white/30 focus:border-white/40 transition-colors"
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                />

                <textarea
                  maxLength={2500}
                  required
                  rows={8}
                  placeholder="Unfold the draft of your feelings here. Write down concrete highlights, memory bits, whispers, or how happy they make you feel. Write like nobody's watching, then let the storyteller master polish your manuscript..."
                  className={`w-full bg-transparent focus:outline-hidden border-none resize-none placeholder-white/20 leading-relaxed text-sm sm:text-base ${currentAtmosphereStyle.borderClass}`}
                  value={storyDraft}
                  onChange={(e) => setStoryDraft(e.target.value)}
                />
              </div>

              {/* Literary Style selector */}
              <div className="mt-5 pt-5 border-t border-white/5 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/70 block">Select Storyteller Narrative Voice</label>
                  <span className="text-[9px] text-white/50">{VOICES.find(v => v.id === selectedVoice)?.desc}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {VOICES.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVoice(v.id)}
                      className={`py-1.5 px-2 rounded-xl text-[10.5px] font-bold text-left transition-all border ${
                        selectedVoice === v.id
                          ? "bg-white text-slate-900 border-white"
                          : "bg-white/5 text-white/75 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions row */}
              <div className="flex items-center gap-2 pt-6 mt-2 border-t border-white/5">
                <button
                  type="button"
                  disabled={isPolishing || !storyDraft.trim() || !storyTitle.trim()}
                  onClick={handlePolishStory}
                  className="flex-1 py-3 bg-pink-500 hover:bg-pink-600 disabled:bg-white/5 disabled:text-white/30 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shadow-xl"
                >
                  {isPolishing ? (
                    <>
                      <LoaderSpin />
                      <span>Polishing Narratives...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span>Refine &amp; Stylize Story</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* PREVIEW MASTERPIECE SECTION */}
            <AnimatePresence>
              {refinedResult && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-white border-2 border-amber-100 rounded-3xl p-6 md:p-8 shadow-xl space-y-5 relative"
                >
                  {/* Decorative ribbon */}
                  <div className="absolute -top-3.5 left-6 bg-amber-500 text-white text-[9px] uppercase tracking-wider font-black px-3.5 py-1 rounded-full shadow-md flex items-center gap-1">
                    <Feather className="w-3 h-3" />
                    <span>Storyteller Refined Novel</span>
                  </div>

                  <div className="prose prose-pink max-w-none prose-sm font-serif pt-2">
                    <Quote className="w-8 h-8 text-amber-200 block mb-1 float-left mr-2" />
                    <div className="text-slate-800 leading-relaxed italic text-sm sm:text-base whitespace-pre-wrap">
                      {refinedResult}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-5 border-t border-slate-100 flex-wrap">
                    <button
                      type="button"
                      disabled={submittingStory}
                      onClick={handlePublishStory}
                      className="flex-1 min-w-[150px] py-3 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      {submittingStory ? (
                        <>
                          <LoaderSpin />
                          <span>Publishing Story...</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-4 h-4" />
                          <span>Publish to Storyteller Chronicles</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefinedResult("")}
                      className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Discard Draft
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Simple feedback alert */}
            {publishSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-semibold shadow-xs animate-pulse">
                <Check className="w-4 h-4 text-emerald-600 stroke-3" />
                <span>Story published beautifully to files and synchronized to partner chronicles! 💖</span>
              </div>
            )}
          </div>
        ) : (
          /* READ MODE: CHRONICLES DRAWER */
          <div className="space-y-6">
            {activeStory ? (
              <div className="bg-white border border-rose-100 rounded-3xl p-6 md:p-8 shadow-md space-y-6">
                
                {/* Meta details */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase text-pink-500 tracking-wider bg-pink-50 px-2 py-0.5 rounded-md">
                      Atmosphere: {parseStorytellerMilestone(activeStory).atmosphere}
                    </span>
                    <h3 className="font-display font-black text-slate-900 text-xl tracking-tight">
                      📖 {activeStory.title}
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Penned on {activeStory.date}</span>
                      <span className="mx-1">•</span>
                      <span>Selected Voice: {parseStorytellerMilestone(activeStory).voice || "Romantic Bard"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {/* Mode Toggle: Original Notebook vs Polished Novel */}
                    <div className="bg-slate-100 p-0.5 rounded-lg flex text-[10px] font-black">
                      <button
                        onClick={() => setTextMode("draft")}
                        className={`px-3 py-1.5 rounded-md transition-all ${
                          textMode === "draft" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Handwritten Draft
                      </button>
                      <button
                        onClick={() => setTextMode("polished")}
                        className={`px-3 py-1.5 rounded-md transition-all ${
                          textMode === "polished" ? "bg-white text-pink-600 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Polished Story
                      </button>
                    </div>

                    {/* Delete handler */}
                    {activeStory.userId === user.uid && (
                      <button
                        onClick={async () => {
                          if (confirm("Permanently archive this masterpiece story?")) {
                            await onDeleteStory(activeStory.id);
                            setActiveStory(null);
                          }
                        }}
                        className="p-2 border border-slate-200 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded-xl transition cursor-pointer"
                        title="Archive story"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Main scroll book viewer area */}
                <div className="p-6 sm:p-8 bg-[#fffcf8] border border-amber-100/60 rounded-2xl relative shadow-inner">
                  <div className="absolute top-4 right-4 text-amber-200 text-6xl opacity-30 pointer-events-none font-serif select-none italic">
                    ”
                  </div>
                  <div className={`italic leading-relaxed ${textMode === 'polished' ? 'font-serif text-slate-850 text-sm sm:text-base' : 'font-mono text-slate-600 text-xs sm:text-sm'} whitespace-pre-wrap`}>
                    {textMode === "polished" 
                      ? activeStory.generatedLetter 
                      : parseStorytellerMilestone(activeStory).draft
                    }
                  </div>
                </div>

                {/* Love reactions commentary column */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-800 font-extrabold shadow-none">
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                    <span>Sweet Partner Refrains &amp; Comments ({parseStorytellerMilestone(activeStory).reactions.length})</span>
                  </div>

                  {/* Reaction list */}
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {parseStorytellerMilestone(activeStory).reactions.length === 0 ? (
                      <p className="text-slate-400 text-xs py-2 italic">No reactions posted yet. Leave a sweet reflection below to support the narrator! 💖</p>
                    ) : (
                      parseStorytellerMilestone(activeStory).reactions.map((r, ri) => (
                        <div key={ri} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-1">
                          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                            <span className="text-pink-600">{r.userName}</span>
                            <span>{r.createdAt}</span>
                          </div>
                          <p className="text-slate-700 font-semibold leading-relaxed">{r.text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Leave reaction comment form */}
                  <form onSubmit={handlePostReaction} className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Write a sweet reflection on this story... ❤️"
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-hidden text-slate-800 placeholder-slate-400 font-medium"
                      value={reactionText}
                      onChange={(e) => setReactionText(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={savingReaction || !reactionText.trim()}
                      className="py-2.5 px-4 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition cursor-pointer flex-shrink-0"
                    >
                      {savingReaction ? "Posting..." : "Send"}
                      <Send className="w-3 h-3" />
                    </button>
                  </form>
                </div>

              </div>
            ) : (
              <div className="bg-white border border-rose-100 p-8 md:p-12 rounded-3xl text-center space-y-4 max-w-xl mx-auto shadow-xs">
                <span className="text-4xl block">📖</span>
                <div>
                  <h3 className="font-display font-bold text-lg text-slate-800">Your chronicles is empty</h3>
                  <p className="text-slate-500 text-xs max-w-xs mx-auto mb-2">
                    Unlock your innermost feelings and draft your storyteller entries first inside the Writer Quill Slate!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingMode("write")}
                  className="px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  Write First Story
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* RIGHT COLUMN: CHRONICLES FEED / INDEX DRAWER */}
      <div className="lg:col-span-5 space-y-5">
        
        {/* Storyteller Intro Box */}
        <div className="bg-linear-to-r from-pink-500/10 to-amber-500/10 p-5 rounded-3xl border border-rose-100/50 shadow-2xs space-y-2">
          <h4 className="font-display font-black text-slate-900 text-sm flex items-center gap-1.5">
            <span>Forever Storyteller Lounge</span>
            <Feather className="w-4 h-4 text-pink-500" />
          </h4>
          <p className="text-xs text-slate-650 leading-relaxed font-sans font-medium">
            Draft authentic prose about relationship moments. Tell your side of the tale, then let our intelligent romantic scribe mold it into a glorious literature masterpiece instantly. Your partner can read, reaction-comment, and chronicle memories together with you!
          </p>
        </div>

        {/* List of Published Story manuscripts */}
        <div className="bg-white p-5 rounded-3xl border border-rose-100 shadow-xs space-y-4 flex flex-col max-h-[70vh]">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center flex-shrink-0">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Our Chronicle Volumes ({storytellerStories.length})</span>
            <span className="text-[10px] text-pink-600 font-bold bg-pink-50 py-0.5 px-2 rounded-md">Shared Vault</span>
          </div>

          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            {storytellerStories.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs space-y-1">
                <span className="text-2xl block">📂</span>
                <p className="font-semibold select-none text-[11px]">No Story Volumes locked yet</p>
              </div>
            ) : (
              storytellerStories.map((story) => {
                const parsed = parseStorytellerMilestone(story);
                const isSelected = activeStory?.id === story.id;
                
                return (
                  <motion.div
                    key={story.id}
                    onClick={() => {
                      setActiveStory(story);
                      setViewingMode("read");
                    }}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between group ${
                      isSelected 
                        ? "bg-pink-50/40 border-pink-200 shadow-sm" 
                        : "bg-slate-50/15 border-slate-200 hover:border-slate-350 hover:bg-slate-50"
                    }`}
                  >
                    <div className="space-y-1.5 max-w-[85%]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-slate-850 group-hover:text-pink-600 transition block leading-tight truncate">
                          📖 {story.title}
                        </span>
                        {parsed.reactions.length > 0 && (
                          <span className="inline-flex items-center bg-rose-50 text-rose-600 text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                            ❤️ {parsed.reactions.length}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-[9.5px] font-semibold text-slate-400">
                        <span>{story.date}</span>
                        <span>•</span>
                        <span className="capitalize">{parsed.voice}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-350 group-hover:text-pink-500 transition flex-shrink-0" />
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

function LoaderSpin() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
    >
      <RefreshCw className="w-4 h-4" />
    </motion.div>
  );
}
