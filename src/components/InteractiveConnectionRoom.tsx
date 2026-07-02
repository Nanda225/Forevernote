import React, { useState, useEffect } from "react";
import { 
  Heart, Sparkles, Send, Lock, Unlock, CheckCircle, RefreshCw, 
  Layers, Smile, MessageCircle, HelpCircle, Trophy, Feather, ShieldAlert, Users
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, handleFirestoreError, OperationType, collection, doc, setDoc, serverTimestamp, query, where, onSnapshot } from "../firebase";

interface InteractiveConnectionRoomProps {
  user: any;
  profile: any;
  milestones: any[];
}

const FRIENDSHIP_PROMPTS = [
  { id: "bestie_origin", text: "What is the silliest or most memorable story of how we first became friends?", category: "BFF Origin 🌟" },
  { id: "partner_in_crime", text: "If we were arrested together, what crime would people immediately assume we committed?", category: "Chaos Duo ⚡" },
  { id: "inside_joke", text: "What is an inside joke or nickname we share that nobody else would ever understand?", category: "Silly 🤪" },
  { id: "ride_or_die", text: "What is one moment where you realized I was a true 'ride or die' friend who had your back?", category: "Heartfelt ❤️" },
  { id: "perfect_bestie_day", text: "Describe our absolute dream bestie day out if we had unlimited cash and a free day!", category: "Adventure ✈️" },
  { id: "silliest_habit", text: "What is my funniest habit or personality trait that always makes you laugh?", category: "Fun 🍭" },
  { id: "bestie_vow", text: "Write a fun Best Friend Promise or ride-or-die vow we want to lock in right now...", category: "Promise 🤝" },
  { id: "admired_trait", text: "What is one strength or trait of mine that you secretly admire or appreciate?", category: "Respect ✨" }
];

const PRESET_PROMPTS = [
  { id: "first_impression", text: "What was your exact first impression of me when we first met?", category: "Romantic 🌸" },
  { id: "know_one", text: "What was the exact moment or little thing that made you realize I was the one?", category: "Heartfelt ❤️" },
  { id: "inside_joke", text: "Describe our silliest shared inside joke that nobody else understands...", category: "Silly 🤪" },
  { id: "favorite_habit", text: "What is one tiny routine or habit of mine that secretly melts your heart?", category: "Sweet 🥰" },
  { id: "unlimited_teleport", text: "If we had unlimited money and could teleport anywhere tonight, where would we go and why?", category: "Adventure ✈️" },
  { id: "one_year_dream", text: "What is the biggest personal or joint dream you want us to accomplish together in the next year?", category: "Future 🔮" },
  { id: "custom_vow", text: "Write a unique, playful, or sacred relationship promise or vow we both want to commit to right now...", category: "Promise 🤝" },
  { id: "first_date_confession", text: "What is a secret confession you have about how nervous or excited you were on our very first date?", category: "Nostalgic 🕯️" }
];

const ALL_PROMPTS = [...FRIENDSHIP_PROMPTS, ...PRESET_PROMPTS];

const getWaxColors = (isFriendship: boolean) => [
  { name: "Imperial Red", hex: "#dc2626", glow: "shadow-red-500/50", label: isFriendship ? "⚡ Chaos Besties Vibe" : "🌹 Romantic Vibe" },
  { name: "Royal Lavender", hex: "#7c3aed", glow: "shadow-purple-500/50", label: isFriendship ? "🧁 Pure Friendship Vibe" : "🪻 Cozy Vibe" },
  { name: "Celestial Gold", hex: "#d97706", glow: "shadow-amber-500/50", label: isFriendship ? "🌟 Golden BFF Vibe" : "✨ Celestial Gold" },
  { name: "Midnight Teal", hex: "#0d9488", glow: "shadow-teal-500/50", label: isFriendship ? "🚀 Ride or Die Vibe" : "🌌 Secret Vibe" }
];

export default function InteractiveConnectionRoom({ user, profile, milestones }: InteractiveConnectionRoomProps) {
  const partnerId = profile?.connectedPartnerId || null;
  const isFriendshipMode = profile?.friendshipMode || false;

  const promptsToShow = isFriendshipMode ? FRIENDSHIP_PROMPTS : PRESET_PROMPTS;
  const waxColors = getWaxColors(isFriendshipMode);

  // Real-time conversation stream states
  const [questMessages, setQuestMessages] = useState<any[]>([]);
  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  const [myAnswer, setMyAnswer] = useState("");
  const [isMyAnswerLocked, setIsMyAnswerLocked] = useState(false);
  const [selectedWaxIndex, setSelectedWaxIndex] = useState(0);

  const activeWax = waxColors[selectedWaxIndex] || waxColors[0];

  // UI animation controls
  const [sealStage, setSealStage] = useState<"idle" | "pouring" | "pressing" | "sealed">("idle");
  const [savingMilestone, setSavingMilestone] = useState(false);

  // Subscribe to love messages collection to extract interactive session data
  useEffect(() => {
    if (!partnerId) return;

    // Filter and build the real-time session
    const qOut = query(collection(db, "love_messages"), where("senderId", "==", user.uid));
    const qIn = query(collection(db, "love_messages"), where("recipientId", "==", user.uid));

    let unsubOut = onSnapshot(qOut, (snap) => {
      const outList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateCombinedStream(outList, null);
    });

    let unsubIn = onSnapshot(qIn, (snap) => {
      const inList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateCombinedStream(null, inList);
    });

    const outCache: any[] = [];
    const inCache: any[] = [];

    const updateCombinedStream = (outArr: any[] | null, inArr: any[] | null) => {
      if (outArr) outCache.splice(0, outCache.length, ...outArr);
      if (inArr) inCache.splice(0, inCache.length, ...inArr);

      const combined = [...outCache, ...inCache];
      // Filter for interactive modes only (messages containing [QUEST_])
      const filtered = combined.filter((msg: any) => 
        msg.style === "QuestState" || msg.style === "QuestAnswer"
      );

      filtered.sort((a, b) => {
        const tA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime() || 0;
        const tB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime() || 0;
        return tB - tA; // newest first to extract current active state
      });

      setQuestMessages(filtered);
    };

    return () => {
      unsubOut();
      unsubIn();
    };
  }, [user.uid, partnerId]);

  // Extract current active state based on messages
  const getCurrentState = () => {
    // 1. Find the newest QuestState message initialization
    const newestQuestInit = questMessages.find(m => m.style === "QuestState");
    if (!newestQuestInit) {
      return { prompt: null, myStatus: null, partnerStatus: null };
    }

    // Extract prompt ID
    const textMatch = newestQuestInit.text || "";
    let promptIdMatch = textMatch.match(/\[PROMPT_ID\]\s*([a-zA-Z0-9_\-]+)/);
    const pId = promptIdMatch ? promptIdMatch[1] : null;
    const prompt = ALL_PROMPTS.find(p => p.id === pId) || null;

    if (!prompt) {
      return { prompt: null, myStatus: null, partnerStatus: null };
    }

    // 2. Find answers/locked status for this specific prompt ID
    const myLockedAnswerMsg = questMessages.find(m => 
      m.style === "QuestAnswer" && 
      m.senderId === user.uid && 
      m.text.includes(`[PROMPT_ID] ${pId}`)
    );

    const partnerLockedAnswerMsg = questMessages.find(m => 
      m.style === "QuestAnswer" && 
      m.senderId === partnerId && 
      m.text.includes(`[PROMPT_ID] ${pId}`)
    );

    const myStatus = myLockedAnswerMsg ? {
      locked: true,
      text: myLockedAnswerMsg.text.replace(`[PROMPT_ID] ${pId}`, "").replace("[ANSWER]", "").trim()
    } : null;

    const partnerStatus = partnerLockedAnswerMsg ? {
      locked: true,
      text: partnerLockedAnswerMsg.text.replace(`[PROMPT_ID] ${pId}`, "").replace("[ANSWER]", "").trim()
    } : null;

    return { prompt, myStatus, partnerStatus };
  };

  const { prompt: activePrompt, myStatus, partnerStatus } = getCurrentState();

  // Handle setting a new active prompt/question
  const handleSelectPrompt = async (promptId: string) => {
    if (!partnerId) return;
    const selected = ALL_PROMPTS.find(p => p.id === promptId);
    if (!selected) return;

    const msgId = `quest_${Date.now()}`;
    const payload = {
      senderId: user.uid,
      recipientId: partnerId,
      text: `[QUEST_INIT] ${selected.text} [PROMPT_ID] ${promptId}`,
      style: "QuestState",
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, "love_messages", msgId), payload);
      // Reset input local states
      setMyAnswer("");
      setIsMyAnswerLocked(false);
      setSealStage("idle");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "love_messages");
    }
  };

  // Lock in my secret answer to FireStore
  const handleLockInAnswer = async () => {
    if (!partnerId || !activePrompt || !myAnswer.trim()) return;

    const msgId = `ans_${user.uid}_${activePrompt.id}_${Date.now()}`;
    const payload = {
      senderId: user.uid,
      recipientId: partnerId,
      text: `[ANSWER] ${myAnswer.trim()} [PROMPT_ID] ${activePrompt.id}`,
      style: "QuestAnswer",
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, "love_messages", msgId), payload);
      setIsMyAnswerLocked(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "love_messages");
    }
  };

  // Start the beautiful wax seal pouring & stamping animation
  const startSealRitual = () => {
    if (sealStage !== "idle") return;
    setSealStage("pouring");
    
    // Step 1: Pouring molten wax animation (takes 1.8 seconds)
    setTimeout(() => {
      setSealStage("pressing");
      
      // Step 2: Pressing down stamp (takes 1.2 seconds)
      setTimeout(() => {
        setSealStage("sealed");
        handleExecuteSealMilestone();
      }, 1500);
    }, 1800);
  };

  // Commit the sealed moment permanently into the Scrapbook Milestone array
  const handleExecuteSealMilestone = async () => {
    if (!activePrompt || !myStatus || !partnerStatus || savingMilestone) return;
    setSavingMilestone(true);

    const milestoneId = `sealed_moment_${Date.now()}`;
    const formattedTitle = isFriendshipMode 
      ? `Sealed BFF Moment: ${activePrompt.category} Choice 🌟` 
      : `Sealed Memory: ${activePrompt.category} Choice 💝`;

    // Construct the joint description containing both of their sealed responses
    const jointDescription = isFriendshipMode 
      ? `We completed an Interactive Bestie Quest together! 🌟

💖 ${profile?.name || "Bestie 1"}'s Answer:
"${myStatus.text}"

💖 ${profile?.partnerName || "Bestie 2"}'s Answer:
"${partnerStatus.text}"

🤝 This legendary friendship moment was locked in and sealed forever with our special ${activeWax.name} Wax Seal!`
      : `We completed an Interactive Connection Quest together! 

💌 ${profile?.name || "Partner 1"}'s Locked Secret:
"${myStatus.text}"

💌 ${profile?.partnerName || "Partner 2"}'s Locked Secret:
"${partnerStatus.text}"

🤝 This moment of intimate connection was forged, sealed with a beautiful ${activeWax.name} wax seal, and locked forever in our shared timeline.`;

    const payload = {
      userId: user.uid,
      title: formattedTitle,
      type: "Custom",
      date: new Date().toISOString().split('T')[0], // Today's date
      description: jointDescription,
      aiLetterStyle: isFriendshipMode ? "Warm" : "Romantic",
      generatedLetter: isFriendshipMode 
        ? `A certified best-friend pact. Wax Color: ${activeWax.name}. Locked on: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })} UTC.`
        : `A custom sealed covenant generated during our live conversation. Wax Color: ${activeWax.name}. Forged on: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })} UTC.`,
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, "milestones", milestoneId), payload);
      // Clean states & reset prompt choice so they can do another one!
      setTimeout(() => {
        setSavingMilestone(false);
      }, 500);
    } catch (err) {
      setSavingMilestone(false);
      handleFirestoreError(err, OperationType.WRITE, "milestones");
    }
  };

  // Reset/Trash current session to start over
  const handleResetSession = () => {
    setActivePromptId(null);
    setMyAnswer("");
    setIsMyAnswerLocked(false);
    setSealStage("idle");
  };

  // Check if current user's local input state should be overwritten if database state says they already locked
  useEffect(() => {
    if (myStatus) {
      setMyAnswer(myStatus.text);
      setIsMyAnswerLocked(true);
    } else {
      // If we don't have a locked answer in DB, reset lock status but keep draft unless prompt changed
      setIsMyAnswerLocked(false);
    }
  }, [myStatus, activePrompt?.id]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* 1. LEFT SIDEBAR: ACTIVE PROMPT LIST */}
      <div className={`lg:col-span-4 bg-white p-6 rounded-3xl border ${isFriendshipMode ? 'border-teal-100 shadow-teal-500/5' : 'border-rose-100 shadow-rose-500/5'} shadow-xs space-y-4`}>
        <div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[9px] font-black uppercase ${isFriendshipMode ? 'text-teal-600 bg-teal-50' : 'text-pink-600 bg-pink-50'} rounded-full select-none`}>
            {isFriendshipMode ? (
              <>
                <Smile className="w-3.5 h-3.5 animate-pulse" /> Friendship Catalyst
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5 animate-pulse" /> Intimacy Catalyst
              </>
            )}
          </span>
          <h3 className="font-display font-black text-lg text-slate-900 mt-2">
            {isFriendshipMode ? "Bestie Quests" : "Quest Prompts"}
          </h3>
          <p className="text-slate-500 text-[10px] leading-relaxed">
            {isFriendshipMode 
              ? "Choose an awesome best friends prompt to sync and spark hilarious conversations instantly on both dashboards!"
              : "Select an intentional relationship prompt. It will dynamically trigger in real-time across both connected dashboards!"}
          </p>
        </div>

        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
          {promptsToShow.map((p) => {
            const isCurrentActive = activePrompt?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPrompt(p.id)}
                disabled={!partnerId}
                className={`w-full text-left p-3.5 rounded-2xl border text-xs leading-relaxed font-semibold transition-all duration-300 flex flex-col gap-1.5 group select-none relative overflow-hidden cursor-pointer ${
                  isCurrentActive 
                    ? isFriendshipMode 
                      ? 'bg-teal-500 border-teal-500 text-white shadow-md shadow-teal-500/20 scale-[1.02]'
                      : 'bg-pink-500 border-pink-500 text-white shadow-md shadow-pink-500/20 scale-[1.02]' 
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs hover:scale-[1.01]'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                    isCurrentActive 
                      ? isFriendshipMode ? 'bg-teal-600 font-black text-teal-100' : 'bg-pink-600 font-black text-pink-100'
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {p.category}
                  </span>
                  {isCurrentActive && (
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                  )}
                </div>
                <p className="font-sans line-clamp-2">{p.text}</p>
                
                {/* Visual hover effect line */}
                <div className={`absolute left-0 bottom-0 top-0 w-1 ${isFriendshipMode ? 'bg-teal-500' : 'bg-pink-500'} transform transition-transform origin-left scale-y-0 group-hover:scale-y-100`} />
              </button>
            );
          })}
        </div>

        {!partnerId && (
          <div className="bg-amber-50 text-amber-800 p-3.5 rounded-2xl border border-amber-200 flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-extrabold text-[10.5px] block uppercase">Connection Required</span>
              <p className="text-[10px] leading-relaxed font-medium">To collaborate and seal moments, please pair your profile with your partner's invite code in settings!</p>
            </div>
          </div>
        )}
      </div>

      {/* 2. MAIN CENTER CONVERSTIONAL FORUM */}
      <div className="lg:col-span-8 space-y-6">
        
        {activePrompt ? (
          <div className={`bg-white rounded-3xl border ${isFriendshipMode ? 'border-teal-100' : 'border-rose-100'} shadow-sm p-6 space-y-6 relative overflow-hidden`}>
            <div className={`absolute top-0 right-0 w-36 h-36 ${isFriendshipMode ? 'bg-teal-300/10' : 'bg-pink-300/10'} rounded-full blur-3xl pointer-events-none`} />

            {/* Prompt Display Header */}
            <div className={`flex justify-between items-start border-b ${isFriendshipMode ? 'border-teal-100' : 'border-rose-100'} pb-4`}>
              <div className="space-y-1 flex-1">
                <span className={`text-[9px] ${isFriendshipMode ? 'text-teal-600' : 'text-pink-600'} font-extrabold tracking-widest uppercase`}>
                  {isFriendshipMode ? "BFF Quest Active • Real-time Bestie Link 🌟" : "Quest Active • Real-time Collaboration Link 🔒"}
                </span>
                <p className="text-[15px] font-display font-black text-slate-800 leading-snug">
                  "{activePrompt.text}"
                </p>
              </div>

              <button
                onClick={handleResetSession}
                className={`px-3 py-1.5 ${isFriendshipMode ? 'bg-slate-100 hover:bg-teal-50 text-slate-500 hover:text-teal-600' : 'bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600'} font-bold font-mono text-[9px] rounded-lg transition-colors cursor-pointer shrink-0 uppercase tracking-wider`}
              >
                Clear Quest
              </button>
            </div>

            {/* THE COLLABORATIVE BOXES DESK */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* CURRENT USER WRITING ZONE */}
              <div className="space-y-3 relative">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400">
                    Your Response
                  </span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    isMyAnswerLocked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {isMyAnswerLocked ? "Locked 🔒" : "Drafting ✍️"}
                  </span>
                </div>

                {isMyAnswerLocked ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 min-h-[160px] flex flex-col justify-between relative shadow-inner">
                    <p className="text-slate-600 text-xs italic leading-relaxed whitespace-pre-wrap font-medium">
                      "{myAnswer}"
                    </p>
                    <div className="flex justify-end pt-3">
                      <button
                        onClick={() => setIsMyAnswerLocked(false)}
                        className={`text-[9px] ${isFriendshipMode ? 'text-teal-600 hover:text-teal-700' : 'text-pink-500 hover:text-pink-600'} font-bold flex items-center gap-1 transition-colors cursor-pointer bg-white border border-slate-100 px-2.5 py-1 rounded-lg`}
                      >
                        <RefreshCw className="w-3 h-3" /> Edit Response
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      disabled={isMyAnswerLocked}
                      className={`w-full bg-linear-to-b from-stone-50 to-stone-50/50 border border-slate-200 text-xs rounded-2xl p-4 min-h-[160px] focus:outline-hidden focus:bg-white focus:border-teal-300 focus:ring-1 focus:ring-teal-300 resize-none leading-relaxed italic placeholder-slate-400`}
                      placeholder={isFriendshipMode ? "Write your silliest, most authentic bestie thoughts here... Your bestie won't see them until both click Lock In!" : "Write your secret heartfelt thoughts here... Your partner won't be able to open this container until both of you click Lock In!"}
                      value={myAnswer}
                      onChange={(e) => setMyAnswer(e.target.value)}
                    />
                    
                    <button
                      disabled={!myAnswer.trim()}
                      onClick={handleLockInAnswer}
                      className={`w-full py-2.5 ${isFriendshipMode ? 'bg-linear-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600' : 'bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'} disabled:from-slate-200 disabled:to-slate-350 disabled:text-slate-400 text-white font-black text-xs rounded-xl tracking-wider uppercase transition shadow-xs hover:scale-101 active:scale-99 flex items-center justify-center gap-1.5 cursor-pointer`}
                    >
                      <Lock className="w-3.5 h-3.5 text-white" />
                      {isFriendshipMode ? "Lock In Bestie Answer 🔒" : "Lock In Secret Answer 🔒"}
                    </button>
                  </div>
                )}
              </div>

              {/* PARTNER WRITING LOCK ZONE */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400">
                    {profile?.partnerName || "Partner"}'s Response
                  </span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    partnerStatus?.locked ? 'bg-emerald-100 text-emerald-700' : isFriendshipMode ? 'bg-teal-100 text-teal-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {partnerStatus?.locked ? "Locked 🔒" : "Drafting..."}
                  </span>
                </div>

                {partnerStatus?.locked ? (
                  <div className={`relative overflow-hidden rounded-2xl border border-dashed ${isFriendshipMode ? 'border-teal-200 bg-teal-50/20' : 'border-pink-200 bg-pink-50/20'} p-4 min-h-[160px] flex flex-col justify-between items-center text-center shadow-inner`}>
                    
                    {/* If both are locked, reveal the answer! Otherwise keep it hidden/mysterious */}
                    {isMyAnswerLocked ? (
                      <div className="w-full flex flex-col justify-between h-full text-left space-y-4">
                        <p className="text-slate-700 text-xs italic leading-relaxed whitespace-pre-wrap font-semibold">
                          "{partnerStatus.text}"
                        </p>
                        <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1 mt-auto">
                          <Unlock className="w-3 h-3 text-emerald-500" /> Secure decryption complete
                        </span>
                      </div>
                    ) : (
                      <div className="m-auto space-y-2">
                        <Lock className={`w-8 h-8 ${isFriendshipMode ? 'text-teal-500' : 'text-pink-500'} animate-bounce mx-auto`} />
                        <span className="text-xs font-bold text-slate-700 block">Locked Answer Cryptic</span>
                        <p className="text-[10px] text-slate-400 leading-normal max-w-[180px] mx-auto">
                          {profile?.partnerName || "Partner"} has locked in their response! <strong>Lock yours</strong> to decrypt and sync.
                        </p>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-4 min-h-[160px] flex flex-col items-center justify-center text-center">
                    <Feather className="w-8 h-8 text-neutral-350 animate-pulse mb-2" />
                    <span className="text-xs font-bold text-slate-550">Drafting Thoughts</span>
                    <p className="text-[9.5px] text-slate-400 leading-normal max-w-[170px] mx-auto mt-1">
                      Waiting for {profile?.partnerName || "your partner"} to lock in their thoughts...
                    </p>
                  </div>
                )}

              </div>

            </div>

            {/* WAITING / SEALING GATE DECK */}
            <AnimatePresence>
              {isMyAnswerLocked && partnerStatus?.locked && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-radial from-slate-900 to-slate-950 text-white rounded-2xl p-5 border border-slate-800 flex flex-col gap-5 shadow-xl relative overflow-hidden"
                >
                  {/* Ritual Title */}
                  <div className="flex justify-between items-center relative z-10">
                    <div className="space-y-1">
                      <span className={`flex items-center gap-1 text-[9px] uppercase font-black ${isFriendshipMode ? 'text-teal-400' : 'text-pink-400'} tracking-widest`}>
                        <Feather className="w-3.5 h-3.5 animate-bounce" /> Dual Answers Aligned
                      </span>
                      <h4 className="font-display font-black text-sm tracking-wide text-white">
                        {isFriendshipMode ? "THE BFF SEAL OF FRIENDSHIP" : "THE WAX SEAL RITUAL"}
                      </h4>
                    </div>

                    <div className="flex gap-1.5 overflow-hidden">
                      {waxColors.map((wax, idx) => (
                        <button
                          key={wax.name}
                          onClick={() => setSelectedWaxIndex(idx)}
                          className={`w-6 h-6 rounded-full cursor-pointer transition border border-white/20 select-none ${
                            activeWax.name === wax.name ? 'scale-115 ring-2 ring-teal-400 shadow-md' : 'opacity-70 hover:opacity-100 hover:scale-105'
                          }`}
                          style={{ backgroundColor: wax.hex }}
                          title={wax.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* ANIMATED RITUAL STAGE SCREEN */}
                  <div className="bg-slate-950 rounded-xl relative p-6 h-48 border border-white/5 overflow-hidden flex flex-col items-center justify-center text-center">
                    
                    {/* IDLE Stage */}
                    {sealStage === "idle" && (
                      <div className="space-y-3 z-10 m-auto">
                        {isFriendshipMode ? (
                          <Trophy className="w-10 h-10 text-teal-400 animate-pulse mx-auto" />
                        ) : (
                          <Trophy className="w-10 h-10 text-pink-400 animate-pulse mx-auto" />
                        )}
                        <div className="space-y-0.5">
                          <span className="font-display font-extrabold text-xs text-white">Answers Decrypted!</span>
                          <p className="text-[9px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                            {isFriendshipMode 
                              ? "Your custom bestie answers have matched. Select your BFF wax color, and click below to pour and press our friendship wax stamp!"
                              : "Your two perspectives have been decrypted and matched. Select your wax color above, and click below to pour and press our relationship wax stamp."}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* POURING Stage */}
                    {sealStage === "pouring" && (
                      <div className="space-y-3 z-10 m-auto">
                        {/* Molten wax drop animation simulation */}
                        <div className="relative w-8 h-8 mx-auto flex items-center justify-center">
                          <motion.div 
                            initial={{ y: -45, scale: 0.3, opacity: 0 }}
                            animate={{ y: [0, 10, 0], scale: [0.8, 1.4, 1.5], opacity: [0, 1, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: activeWax.hex, filter: "blur(2px)" }}
                          />
                        </div>
                        <span className={`font-display font-extrabold text-[11px] uppercase tracking-widest ${isFriendshipMode ? 'text-teal-300' : 'text-pink-300'} animate-pulse block`}>
                          Melting and Pouring Wax...
                        </span>
                        <p className="text-[8px] text-slate-400">Heating {activeWax.name} pellets to liquid form</p>
                      </div>
                    )}

                    {/* PRESSING Stage */}
                    {sealStage === "pressing" && (
                      <div className="space-y-3 z-10 m-auto">
                        <motion.div 
                          initial={{ y: -80, scale: 1.4 }}
                          animate={{ y: -5, scale: 1 }}
                          transition={{ type: "spring", stiffness: 120, damping: 10 }}
                          className="w-12 h-12 mx-auto"
                        >
                          {/* Wax stamp brass visual */}
                          <div className="w-10 h-10 rounded-full border-2 border-amber-400 bg-linear-to-b from-amber-200 to-amber-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-300/30">
                            <span className="text-stone-900 font-extrabold text-xs">{isFriendshipMode ? "🌟" : "❤️"}</span>
                          </div>
                        </motion.div>
                        <span className="font-display font-extrabold text-[11px] uppercase tracking-widest text-yellow-400 block animate-pulse">
                          Affixing Brass Die Stamp...
                        </span>
                        <p className="text-[8px] text-slate-400">
                          {isFriendshipMode ? "Forging legendary friendship pact into scrapbook" : "Forging everlasting bond into the scrapbook"}
                        </p>
                      </div>
                    )}

                    {/* SEALED Stage */}
                    {sealStage === "sealed" && (
                      <div className="space-y-2 z-10 m-auto">
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6 }}
                          className="relative w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-lg border-2 border-white/20"
                          style={{ backgroundColor: activeWax.hex, boxShadow: `0 0 20px ${activeWax.hex}80` }}
                        >
                          <span className="text-white font-black text-xl select-none">{isFriendshipMode ? "🌟" : "❤️"}</span>
                          <motion.span 
                            animate={{ rotate: 360 }} 
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-1.5 border border-dashed border-white/40 rounded-full"
                          />
                        </motion.div>
                        <span className="font-display font-extrabold text-[12px] uppercase tracking-widest text-emerald-400 block">
                          MOMENT FORGED &amp; SEALED! 🏆
                        </span>
                        <p className="text-[8.5px] text-slate-350">Successfully deployed into the timeline scrapbook!</p>
                      </div>
                    )}

                    {/* Glow effect matching active wax */}
                    <div 
                      className="absolute inset-0 opacity-15 pointer-events-none transition-colors duration-500" 
                      style={{ background: `radial-gradient(circle, ${activeWax.hex} 0%, transparent 70%)` }}
                    />
                  </div>

                  {sealStage === "idle" && (
                    <button
                      onClick={startSealRitual}
                      className="w-full py-4 text-slate-900 bg-amber-400 hover:bg-amber-300 font-black text-xs rounded-xl tracking-wider uppercase transition-all duration-300 shadow-md hover:shadow-lg shadow-amber-400/20 flex items-center justify-center gap-1.5 cursor-pointer relative z-10"
                    >
                      <Sparkles className="w-4 h-4 text-slate-900 animate-spin" />
                      Forge and Seal BFF Pact
                    </button>
                  )}

                  {savingMilestone && (
                    <div className="absolute inset-0 bg-black/55 flex items-center justify-center z-50 rounded-2xl select-none">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-teal-400" />
                        <span className="text-[10px] text-slate-300 font-black tracking-widest uppercase">Uploading Memory to Vault...</span>
                      </div>
                    </div>
                  )}

                </motion.div>
              )}
            </AnimatePresence>

          </div>
        ) : (
          <div className={`bg-white rounded-3xl border ${isFriendshipMode ? 'border-teal-150' : 'border-rose-100'} shadow-xs p-10 text-center space-y-4`}>
            <span className="text-4xl block leading-none">💬</span>
            <div className="space-y-2 max-w-sm mx-auto">
              <h4 className="font-display font-black text-lg text-slate-800">
                {isFriendshipMode ? "Interactive BFF Catalyst Room" : "Interactive Connection Forum"}
              </h4>
              <p className="text-slate-500 text-xs leading-relaxed font-semibold">
                {isFriendshipMode 
                  ? "Explore your best friend's secret answers and lock them in together to forge gorgeous wax sealed scrapbook logs. Both of you must lock responses before the lock reveals!"
                  : "Explore each other's secret thoughts and lock them into custom wax sealed scrapbook heirlooms. Both partners must fill out their secret answers before the vault is decrypted!"}
              </p>
            </div>
            
            <div className="pt-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${isFriendshipMode ? 'bg-teal-50 text-teal-600 border-teal-100' : 'bg-pink-50 text-pink-600 border-pink-100'} rounded-xl text-[10.5px] font-extrabold uppercase border`}>
                👉 Select a prompt on the left sidebar to activate
              </span>
            </div>
          </div>
        )}

        {/* GUIDES ABOUT HOW BOTH USERS INTERACT & SEAL THE MOMENT */}
        <div className={`bg-gradient-to-r ${isFriendshipMode ? 'from-teal-600 to-emerald-550' : 'from-purple-500 to-pink-550'} rounded-3xl p-6 text-white relative overflow-hidden shadow-xs`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-start gap-4">
            <div className="bg-white/15 p-3 rounded-2xl">
              <Feather className="w-6 h-6 text-yellow-350" />
            </div>
            <div className="space-y-1">
              <span className={`text-[9.5px] font-black uppercase tracking-wider ${isFriendshipMode ? 'text-teal-100' : 'text-pink-100'}`}>How Sealing Works</span>
              <h4 className="font-display font-black text-sm text-white">
                {isFriendshipMode ? "Bestie Co-Covenant Pact" : "Digital Co-Covenant"}
              </h4>
              <p className={`text-[10.5px] ${isFriendshipMode ? 'text-teal-50' : 'text-pink-50/80'} leading-normal max-w-2xl`}>
                {isFriendshipMode 
                  ? "True friendship scrapbook artifacts are forged together. When a bestie quest is active, both of you write and lock responses in secret. Neither of you can peek until both of you lock in! Once completed, choose a fun wax style above and press 'Forge & Seal'. The app generates a permanent record, logs both of your words, and binds it beautifully in your shared Scrapbook Timeline!"
                  : "True relationship scrapbook artifacts are constructed together. When a prompt is loaded, keep client dashboards active. Both type private answers and lock them to keep the answers a romantic surprise. Once both lock, hit Forge & Seal. The app executes an interactive wax pouring seal simulation, publishes the combined story layout into the scrapbook feed, and logs it in the vault permanent archive."}
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
