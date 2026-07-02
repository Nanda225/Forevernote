import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Heart, Plus, Settings, LogOut, Sparkles, Filter, Calendar, 
  Mail, Smile, AlertCircle, RefreshCw, X, MessageSquare, 
  FileText, Copy, UserCheck, Timer, Bell, BookOpen, Clock, 
  Send, HelpCircle, FileCheck, Camera, Mic, Play, Pause, Video, Info, Trash2, Upload,
  Lock, Unlock, CheckCircle, Compass, Map
} from "lucide-react";
import { db, auth, OperationType, handleFirestoreError, collection, doc, query, where, onSnapshot, setDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, writeBatch } from "../firebase";
import { UserProfile, Milestone, Reminder, MilestoneType, LetterStyle, ReminderType } from "../types";
import { getDefaultHtmlTemplate } from "../utils/inviteTemplates";
import ReusableStatsCounter from "./StatsCounter";
import MilestoneCard from "./MilestoneCard";
import MilestoneForm from "./MilestoneForm";
import LetterViewer from "./LetterViewer";
import CinematicVideoPlayer from "./CinematicVideoPlayer";
import InteractiveConnectionRoom from "./InteractiveConnectionRoom";
import StorytellerQuill from "./StorytellerQuill";
import GalleryView from "./GalleryView";
import MilestoneMap from "./MilestoneMap";

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

const coupleTrainSunset = new URL("../assets/images/couple_train_sunset_1780158700135.png", import.meta.url).href;

const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return null;
};

const isDirectVideo = (url: string) => {
  if (!url) return false;
  const cleanUrl = url.toLowerCase().split('?')[0];
  return cleanUrl.endsWith(".mp4") || cleanUrl.endsWith(".webm") || cleanUrl.endsWith(".ogg");
};

const getShareableUrl = (inviteCode?: string): string => {
  let origin = typeof window !== "undefined" ? window.location.origin : "";
  // Check if we are in the development sandbox domain and convert to shared preview domain
  if (origin.includes("ais-dev-")) {
    origin = origin.replace("ais-dev-", "ais-pre-");
  }
  return inviteCode ? `${origin}?code=${inviteCode}` : origin;
};

const GLOBAL_SPECIAL_DAYS = [
  { id: "global_valentines", title: "Valentine's Day 💖", month: 1, day: 14 },     // Feb 14
  { id: "global_whiteday", title: "White Day 🎁", month: 2, day: 14 },        // Mar 14
  { id: "global_kissday", title: "World Kiss Day 💋", month: 6, day: 6 },        // Jul 6
  { id: "global_hugday", title: "National Hug Day 🤗", month: 0, day: 21 },       // Jan 21
  { id: "global_loverday", title: "National Lover's Day 💞", month: 3, day: 23 }, // Apr 23
  { id: "global_newyears", title: "New Year's Eve 🎆", month: 11, day: 31 } // Dec 31
];

interface ThemeStyles {
  primaryBg: string;
  primaryHoverBg: string;
  textAccent: string;
  badgeAccent: string;
  iconBg: string;
  iconText: string;
  borderAccent: string;
  navBg: string;
  bodyBg: string;
  logoColor: string;
  isDark?: boolean;
}

const THEMES: Record<string, ThemeStyles> = {
  rose: {
    primaryBg: "bg-pink-600",
    primaryHoverBg: "hover:bg-pink-700",
    textAccent: "text-pink-600",
    badgeAccent: "bg-pink-100 text-pink-600",
    iconBg: "bg-pink-500",
    iconText: "text-pink-500",
    borderAccent: "border-rose-100",
    navBg: "bg-white/90",
    bodyBg: "bg-linear-to-b from-[#FDFBF7] via-[#FFF8F9] to-[#F1F7FB]",
    logoColor: "text-pink-500"
  },
  slate: {
    primaryBg: "bg-slate-800",
    primaryHoverBg: "hover:bg-slate-900",
    textAccent: "text-slate-800",
    badgeAccent: "bg-slate-100 text-slate-850",
    iconBg: "bg-slate-850",
    iconText: "text-slate-850",
    borderAccent: "border-slate-200",
    navBg: "bg-white/90",
    bodyBg: "bg-linear-to-b from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0]",
    logoColor: "text-slate-850"
  },
  amber: {
    primaryBg: "bg-amber-500",
    primaryHoverBg: "hover:bg-amber-600",
    textAccent: "text-amber-600",
    badgeAccent: "bg-amber-100 text-amber-700",
    iconBg: "bg-amber-500",
    iconText: "text-amber-500",
    borderAccent: "border-amber-200",
    navBg: "bg-white/90",
    bodyBg: "bg-linear-to-b from-[#FFFDF5] via-[#FFFDF0] to-[#FEFBF0]",
    logoColor: "text-amber-500"
  },
  lavender: {
    primaryBg: "bg-violet-600",
    primaryHoverBg: "hover:bg-violet-700",
    textAccent: "text-violet-600",
    badgeAccent: "bg-violet-100 text-violet-700",
    iconBg: "bg-violet-500",
    iconText: "text-violet-500",
    borderAccent: "border-violet-150",
    navBg: "bg-white/90",
    bodyBg: "bg-linear-to-b from-[#FAF5FF] via-[#F3E8FF] to-[#E9D5FF]",
    logoColor: "text-violet-500"
  },
  emerald: {
    primaryBg: "bg-emerald-600",
    primaryHoverBg: "hover:bg-emerald-700",
    textAccent: "text-emerald-600",
    badgeAccent: "bg-emerald-100 text-emerald-700",
    iconBg: "bg-emerald-500",
    iconText: "text-emerald-500",
    borderAccent: "border-emerald-200",
    navBg: "bg-white/90",
    bodyBg: "bg-linear-to-b from-[#F0FDF4] via-[#DCFCE7] to-[#BBF7D0]",
    logoColor: "text-emerald-500"
  },
  midnight: {
    primaryBg: "bg-indigo-600",
    primaryHoverBg: "hover:bg-indigo-700",
    textAccent: "text-indigo-400",
    badgeAccent: "bg-indigo-950/80 text-indigo-300",
    iconBg: "bg-indigo-600",
    iconText: "text-indigo-400",
    borderAccent: "border-indigo-900/60",
    navBg: "bg-slate-900/90",
    bodyBg: "bg-linear-to-b from-[#090D1A] via-[#0F172A] to-[#1D243B]",
    logoColor: "text-indigo-400",
    isDark: true
  }
};

interface DashboardProps {
  user: any; // Firebase user credential
  onSignOut: () => void;
  urlInviteCode?: string;
}

export default function Dashboard({ user, onSignOut, urlInviteCode }: DashboardProps) {
  // Navigation: 'timeline' (Scrapbook), 'messages' (Secret Messages), 'wishes' (Wishes Vault), 'interactive' (Connection Room), 'storyteller' (Storyteller Quill), 'reminders' (Special Day Reminders), 'gallery' (Cozy Collage Gallery)
  const [activeTab, setActiveTab ] = useState<'timeline' | 'messages' | 'wishes' | 'interactive' | 'storyteller' | 'reminders' | 'gallery'>('timeline');

  // Database States
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [hasMilestonesLoaded, setHasMilestonesLoaded] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  
  // Dual streams to fetch secret love messages safely without rules failure
  const [outgoingMsgs, setOutgoingMsgs] = useState<any[]>([]);
  const [incomingMsgs, setIncomingMsgs] = useState<any[]>([]);
  
  // Simulated Chat / Demo Partner States deleted as requested
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [simulatedIncomingMsgs] = useState<any[]>([]);
  
  // UI States
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [activeLetterMilestone, setActiveLetterMilestone] = useState<Milestone | null>(null);
  const [isLetterOpen, setIsLetterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("All");

  // Profile Form / Settings State
  const [profName, setProfName] = useState(user.displayName || "");
  const [profPartnerName, setProfPartnerName] = useState("");
  const [profPartnerEmail, setProfPartnerEmail] = useState("");
  const [profAnniversary, setProfAnniversary] = useState("");
  const [editFriendshipMode, setEditFriendshipMode] = useState<boolean>(false);
  const [editAppearanceTheme, setEditAppearanceTheme] = useState<string>("rose");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Manual Invite Connect States inside Dashboard helper
  const [connectCodeInput, setConnectCodeInput] = useState("");
  const [connectMessage, setConnectMessage] = useState("");
  const [connectError, setConnectError] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [autoPairAttempted, setAutoPairAttempted] = useState(false);

  // Shared/synced romantic anniversary date across the pair
  const effectiveAnniversaryDate = profile?.anniversaryDate || partnerProfile?.anniversaryDate || "";

  const currentTheme = profile?.appearanceTheme || "rose";
  const isFriendshipMode = profile?.friendshipMode || false;
  const themeStyles = useMemo(() => THEMES[currentTheme] || THEMES.rose, [currentTheme]);

  const renderLogoIcon = () => {
    const iconClass = "w-5 h-5 fill-white";
    if (isFriendshipMode) {
      return <Smile className="w-5 h-5" />;
    }
    switch (currentTheme) {
      case "slate":
        return <Compass className="w-5 h-5" />;
      case "lavender":
        return <Sparkles className="w-5 h-5" />;
      case "emerald":
        return <Compass className="w-5 h-5" />;
      case "midnight":
        return <Clock className="w-5 h-5" />;
      default:
        return <Heart className={iconClass} />;
    }
  };

  // Auto-fill form field with effective anniversary once loaded/synced
  useEffect(() => {
    if (effectiveAnniversaryDate && !profAnniversary) {
      setProfAnniversary(effectiveAnniversaryDate);
    }
  }, [effectiveAnniversaryDate, profAnniversary]);

  // Email Invitation States
  const [connectSubTab, setConnectSubTab] = useState<'pair' | 'email'>('pair');
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSubject, setInviteSubject] = useState("Join our private space on ForeverNote 💖");
  const [inviteMessage, setInviteMessage] = useState("");

  // AI & Handwritten invitation configuration states
  const [partnerNickname, setPartnerNickname] = useState("");
  const [inviteVibe, setInviteVibe] = useState<'romantic' | 'playful' | 'cute' | 'nostalgic' | 'mysterious'>('romantic');
  const [inviteHighlights, setInviteHighlights] = useState<string[]>([
    "Secret Love Messages 💌",
    "Private Scrapbook & Milestones 📖",
    "Anniversary Countdown Reminders 🗓️"
  ]);
  const [inviteGenLoading, setInviteGenLoading] = useState(false);
  const [handwritingFont, setHandwritingFont] = useState<'font-caveat' | 'font-architects' | 'font-sacramento' | 'font-playpen'>('font-caveat');
  const [paperTheme, setPaperTheme] = useState<'notebook' | 'parchment' | 'blueprint' | 'napkin'>('notebook');
  const [designTemplate, setDesignTemplate] = useState<'ticket' | 'telegram' | 'scrapbook' | 'cyber'>('ticket');
  const [inviteHtml, setInviteHtml] = useState<string>("");
  const [previewFormatTab, setPreviewFormatTab] = useState<'rich' | 'ascii'>('rich');

  // New Secret Message Box State
  const [newMsgText, setNewMsgText] = useState("");
  const [selectedMsgStyle, setSelectedMsgStyle] = useState("Romantic Rose 🌹");
  const [sendMsgLoading, setSendMsgLoading] = useState(false);

  // Tracking Unread Messages Count safely
  const [messagesLastSeenAt, setMessagesLastSeenAt] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const val = localStorage.getItem("fn_messages_last_seen_at");
      return val ? parseInt(val, 10) : 0;
    }
    return 0;
  });

  const unreadMsgCount = useMemo(() => {
    if (!profile?.connectedPartnerId) return 0;
    return incomingMsgs.filter((msg) => {
      const msgTime = msg.createdAt?.seconds 
        ? msg.createdAt.seconds * 1000 
        : (msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now());
      return msgTime > messagesLastSeenAt;
    }).length;
  }, [incomingMsgs, messagesLastSeenAt, profile?.connectedPartnerId]);

  useEffect(() => {
    if (activeTab === "messages") {
      const now = Date.now();
      localStorage.setItem("fn_messages_last_seen_at", String(now));
      setMessagesLastSeenAt(now);
    }
  }, [activeTab, incomingMsgs.length]);

  // States for answering connection quest prompts inside Secret Messages area
  const [draftQuestAnswer, setDraftQuestAnswer] = useState("");
  const [lockingQuestAnswer, setLockingQuestAnswer] = useState(false);

  // Handler to select and trigger a new Connection Quest from Dashboard
  const handleSelectQuestPrompt = async (promptId: string) => {
    const partnerId = profile?.connectedPartnerId;
    if (!partnerId) {
      showNotification("info", "Please connect with a partner first to initiate interaction quests.");
      return;
    }
    const selected = PRESET_PROMPTS.find(p => p.id === promptId);
    if (!selected) return;

    try {
      const msgId = `quest_${Date.now()}`;
      await setDoc(doc(db, "love_messages", msgId), {
        senderId: user?.uid,
        recipientId: partnerId,
        text: `[QUEST_INIT] ${selected.text} [PROMPT_ID] ${promptId}`,
        style: "QuestState",
        createdAt: serverTimestamp()
      });
      showNotification("success", `Launched intimacy catalyst: "${selected.text}"!`);
    } catch (err: any) {
      console.error(err);
      showNotification("error", "Failed to construct catalyst quest: " + err.message);
    }
  };

  // Handler to lock in a Quest Answer from Dashboard Secret Messages
  const handleLockInQuestAnswer = async () => {
    const partnerId = profile?.connectedPartnerId;
    if (!partnerId || !activeQuest || !draftQuestAnswer.trim()) return;

    try {
      setLockingQuestAnswer(true);
      const msgId = `ans_${user?.uid}_${activeQuest.prompt.id}_${Date.now()}`;
      await setDoc(doc(db, "love_messages", msgId), {
        senderId: user?.uid,
        recipientId: partnerId,
        text: `[ANSWER] ${draftQuestAnswer.trim()} [PROMPT_ID] ${activeQuest.prompt.id}`,
        style: "QuestAnswer",
        createdAt: serverTimestamp()
      });
      setDraftQuestAnswer("");
      showNotification("success", "Locked in your secret thoughts privately! Awaiting partner decryption.");
    } catch (err: any) {
      console.error(err);
      showNotification("error", "Error filing lock-in secret: " + err.message);
    } finally {
      setLockingQuestAnswer(false);
    }
  };

  // New Upload Wishes Vault Form State
  const [wishTitle, setWishTitle] = useState("");
  const [wishType, setWishType] = useState<'letter' | 'photo' | 'voice' | 'video' | 'wish' | 'friendship'>('letter');
  const [wishContent, setWishContent] = useState("");
  const [wishMediaUrl, setWishMediaUrl] = useState("");
  const [wishSaving, setWishSaving] = useState(false);
  const [wishFormOpen, setWishFormOpen] = useState(false);
  const [vaultUploading, setVaultUploading] = useState(false);
  const [vaultDragOver, setVaultDragOver] = useState(false);
  const [vaultError, setVaultError] = useState("");

  // Live countdown states
  const [countdownText, setCountdownText] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [countdownLabel, setCountdownLabel] = useState("Relationship Anniversary");
  const [localPinnedId, setLocalPinnedId] = useState<string>("auto");
  const [specialDaysOpen, setSpecialDaysOpen] = useState(false);
  const [newSpecialTitle, setNewSpecialTitle] = useState("");
  const [newSpecialDate, setNewSpecialDate] = useState("");
  const [newSpecialIsOneTime, setNewSpecialIsOneTime] = useState(false);
  const [newSpecialMode, setNewSpecialMode] = useState<"date" | "days">("date");
  const [newSpecialDaysValue, setNewSpecialDaysValue] = useState("");
  const [specialSaving, setSpecialSaving] = useState(false);
  const [specialDaysTab, setSpecialDaysTab] = useState<'list' | 'add'>('list');

  // Simulated media playback helper state (for Voice loop widgets in wishes grid)
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const [isConnectionPanelCollapsed, setIsConnectionPanelCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('forevernote_conn_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleConnectionPanel = () => {
    const newVal = !isConnectionPanelCollapsed;
    setIsConnectionPanelCollapsed(newVal);
    try {
      localStorage.setItem('forevernote_conn_collapsed', String(newVal));
    } catch {}
  };

  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // India DPDP Act, 2023 Compliance States
  const [privacyConsent, setPrivacyConsent] = useState(true);
  const [dpdpLanguage, setDpdpLanguage] = useState<'en' | 'hi'>('en');
  const [isEraseProcessing, setIsEraseProcessing] = useState(false);

  // Private Visitor Counter states
  const [globalGuestVisits, setGlobalGuestVisits] = useState<number>(0);
  const [myGuestVisits, setMyGuestVisits] = useState<number>(0);

  useEffect(() => {
    let localVisits = 0;
    try {
      const stored = localStorage.getItem("fn_guest_visits");
      localVisits = stored ? parseInt(stored, 10) : 0;
    } catch (e) {
      console.warn("localStorage not fully accessible:", e);
    }
    setMyGuestVisits(localVisits);

    const statsRef = doc(db, "public_stats", "visitors");
    let unsub = () => {};
    try {
      unsub = onSnapshot(statsRef, (docSnap: any) => {
        if (docSnap && docSnap.exists()) {
          setGlobalGuestVisits(docSnap.data().count || 0);
        }
      }, (err: any) => {
        console.warn("onSnapshot failed for public stats inside dashboard:", err);
      });
    } catch (err) {
      console.warn("Could not listen to stats updates inside dashboard:", err);
    }

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  const handleToggleConsent = async (consentVal: boolean) => {
    setPrivacyConsent(consentVal);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        dpdpConsentGiven: consentVal
      });
      if (consentVal) {
        showNotification("success", "Consent successfully re-established under India DPDP Act, 2023! 🌸");
      } else {
        showNotification("info", "Consent withdrawn. Your space is now in limited DPDP protection status. ⚠️");
      }
    } catch (err: any) {
      console.error(err);
      showNotification("error", "Failed to update DPDP consent: " + err.message);
    }
  };

  const handleEraseAllUserData = async () => {
    if (!window.confirm("🔴 DANGER: This is a permanent, non-reversible data erasure request under Section 12 of the India Digital Personal Data Protection (DPDP) Act, 2023. This will instantly delete your account profile, all shared love letters, secret message logs, countdowns, and media gallery items forever. Are you absolutely sure you want to proceed?")) {
      return;
    }
    
    if (!window.confirm("⚠️ FINAL WARNING: Once you click OK, all your relationship scrapbook memories are gone forever and cannot be recovered. Confirm data erasure?")) {
      return;
    }

    try {
      setIsEraseProcessing(true);
      showNotification("info", "Initiating complete DPDP data purge... 🗑️");

      const myUid = user.uid;
      const partnerId = profile?.connectedPartnerId;

      // 1. Delete user profile document
      const myUserRef = doc(db, "users", myUid);
      await deleteDoc(myUserRef);

      // 2. Unlink partner if paired so they are cleanly notified and not stranded
      if (partnerId) {
        try {
          const partnerRef = doc(db, "users", partnerId);
          await updateDoc(partnerRef, {
            connectedPartnerId: "",
            partnerEmail: "",
            partnerInviteCode: ""
          });
        } catch (partnerErr) {
          console.warn("Failed to clean up partner link during erasure:", partnerErr);
        }
      }

      // 3. Purge milestones where userId == myUid
      const milestonesQuery = query(collection(db, "milestones"), where("userId", "==", myUid));
      const milestonesSnap = await getDocs(milestonesQuery);
      for (const mDoc of milestonesSnap.docs) {
        await deleteDoc(doc(db, "milestones", mDoc.id));
      }

      // 4. Purge reminders where userId == myUid
      const remindersQuery = query(collection(db, "reminders"), where("userId", "==", myUid));
      const remindersSnap = await getDocs(remindersQuery);
      for (const rDoc of remindersSnap.docs) {
        await deleteDoc(doc(db, "reminders", rDoc.id));
      }

      // 5. Purge secret love messages where senderId == myUid or recipientId == myUid
      const msgsQuery1 = query(collection(db, "love_messages"), where("senderId", "==", myUid));
      const msgsSnap1 = await getDocs(msgsQuery1);
      for (const mDoc of msgsSnap1.docs) {
        await deleteDoc(doc(db, "love_messages", mDoc.id));
      }
      const msgsQuery2 = query(collection(db, "love_messages"), where("recipientId", "==", myUid));
      const msgsSnap2 = await getDocs(msgsQuery2);
      for (const mDoc of msgsSnap2.docs) {
        await deleteDoc(doc(db, "love_messages", mDoc.id));
      }

      // 6. Purge gallery items uploaded by myUid
      const galleryQuery = query(collection(db, "gallery_items"), where("userId", "==", myUid));
      const gallerySnap = await getDocs(galleryQuery);
      for (const gDoc of gallerySnap.docs) {
        await deleteDoc(doc(db, "gallery_items", gDoc.id));
      }

      // 7. Clear secure local storage
      try {
        localStorage.removeItem("fn_virtual_user");
        localStorage.removeItem("fn_guest_visits");
        localStorage.removeItem("forevernote_conn_collapsed");
        const keys = Object.keys(localStorage);
        for (const k of keys) {
          if (k.startsWith("fn_vdb_") || k.startsWith("secure_storage_")) {
            localStorage.removeItem(k);
          }
        }
      } catch (localErr) {
        console.warn("Error clearing local storage:", localErr);
      }

      showNotification("success", "Your account and all emotional scrapbook data have been permanently erased. Farewell! ❤️");
      setIsSettingsOpen(false);
      setTimeout(() => {
        onSignOut();
      }, 2500);

    } catch (err: any) {
      console.error("Purge failure:", err);
      showNotification("error", "DPDP Erasure failed: " + err.message);
    } finally {
      setIsEraseProcessing(false);
    }
  };

  const handleExportAllUserData = () => {
    try {
      const exportData = {
        meta: {
          app: "ForeverNote",
          regulation: "Digital Personal Data Protection Act (DPDP), 2023 (India)",
          exportedAt: new Date().toISOString(),
          dataPrincipalEmail: user.email,
          dataPrincipalUid: user.uid,
          consentStatus: privacyConsent ? "ACTIVE_CONSENT_GRANTED" : "WITHDRAWN"
        },
        profile: {
          displayName: profile?.name || user?.displayName || "N/A",
          email: profile?.email || user?.email || "N/A",
          partnerName: profile?.partnerName || "N/A",
          partnerEmail: profile?.partnerEmail || "N/A",
          anniversaryDate: profile?.anniversaryDate || "N/A",
          inviteCode: profile?.inviteCode || "N/A",
          connectedPartnerId: profile?.connectedPartnerId || "N/A"
        },
        milestones: milestones.map(m => ({
          title: m.title,
          type: m.type,
          date: m.date,
          description: m.description,
          aiLetterStyle: m.aiLetterStyle || "N/A",
          generatedLetter: m.generatedLetter || "N/A",
          imageUrl: m.imageUrl ? "(Encrypted/Base64 Image Kept)" : "N/A",
          createdAt: m.createdAt
        })),
        reminders: reminders.map(r => ({
          deliveryType: r.deliveryType,
          scheduledDate: r.scheduledDate,
          status: r.status,
          createdAt: r.createdAt
        })),
        love_messages: {
          outgoing: outgoingMsgs.map(m => ({ text: m.text, style: m.style, createdAt: m.createdAt })),
          incoming: incomingMsgs.map(m => ({ text: m.text, style: m.style, createdAt: m.createdAt }))
        }
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `forevernote_dpdp_export_${user.uid}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showNotification("success", "Your complete relationship data file has been compiled and downloaded successfully! 🌸");
    } catch (err: any) {
      console.error(err);
      showNotification("error", "Failed to compile your data export file: " + err.message);
    }
  };

  const showNotification = (type: "success" | "error" | "info", msg: string) => {
    setNotification({ type, message: msg });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // 1. Core Profile listener (with dynamic partner reload support)
  useEffect(() => {
    if (!user) return;

    setIsProfileLoading(true);
    const unsubProfile = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const udata = docSnap.data();

        // Auto-cleanup legacy AI simulated partner (Liam) if found in their db document
        if (udata.connectedPartnerId === "FN-DEMO-PARTNER" || (udata.partnerName && udata.partnerName.includes("Liam"))) {
          updateDoc(doc(db, "users", user.uid), {
            connectedPartnerId: "",
            partnerName: "",
            partnerEmail: "",
            partnerInviteCode: "",
          }).catch(err => console.error("Auto-cleanup Liam connection error:", err));
          return;
        }

        const prof: any = {
          id: docSnap.id,
          name: udata.name,
          email: udata.email,
          partnerName: udata.partnerName || "",
          partnerEmail: udata.partnerEmail || "",
          anniversaryDate: udata.anniversaryDate || "",
          inviteCode: udata.inviteCode || "",
          partnerInviteCode: udata.partnerInviteCode || "",
          connectedPartnerId: udata.connectedPartnerId || "",
          activeCountdownId: udata.activeCountdownId || "auto",
          friendshipMode: udata.friendshipMode || false,
          appearanceTheme: udata.appearanceTheme || "rose",
          createdAt: udata.createdAt,
          dpdpConsentGiven: udata.dpdpConsentGiven !== false,
        };
        setProfile(prof);
        setPrivacyConsent(udata.dpdpConsentGiven !== false);
        
        // Populate inputs
        setProfName(udata.name || "");
        setProfPartnerName(udata.partnerName || "");
        setProfPartnerEmail(udata.partnerEmail || "");
        setProfAnniversary(udata.anniversaryDate || "");
        setEditFriendshipMode(udata.friendshipMode || false);
        setEditAppearanceTheme(udata.appearanceTheme || "rose");
      } else {
        // Auto-initialize profile document if not found, to ensure they can connect with a code
        const randomCode = "FN-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        setDoc(doc(db, "users", user.uid), {
          name: user.displayName || "Cozy Partner",
          email: user.email || "",
          inviteCode: randomCode,
          partnerInviteCode: "",
          connectedPartnerId: "",
          partnerName: "",
          partnerEmail: "",
          anniversaryDate: "",
          friendshipMode: false,
          appearanceTheme: "rose",
          createdAt: serverTimestamp(),
        }).catch((err) => console.error("Error auto-creating profile doc:", err));
      }
      setIsProfileLoading(false);
    }, (err) => {
      console.error("Profile error:", err);
      setIsProfileLoading(false);
    });

    return () => unsubProfile();
  }, [user]);

  // Helper to format last active status in a beautifully clean way
  const formatFriendlyActiveStatus = (isoString?: string | null): string => {
    if (!isoString) return "Never";
    try {
      const visitedDate = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - visitedDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      
      return visitedDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return "Recently";
    }
  };

  // 1b. Log current user's visit on mount / initial load (only after profile is loaded and exists)
  const loggedVisitRef = useRef(false);
  useEffect(() => {
    if (!user?.uid || !profile || loggedVisitRef.current) return;
    
    loggedVisitRef.current = true;
    const logVisit = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          lastVisitedAt: new Date().toISOString()
        });
        console.log(`[Dashboard] Logged visit timestamp for user ${user.uid}`);
      } catch (err) {
        console.error("[Dashboard] Error logging visit timestamp:", err);
      }
    };
    
    logVisit();
  }, [user?.uid, profile]);

  // 1c. Partner Profile Subscription (retrieves real-time visited and details)
  useEffect(() => {
    if (!profile?.connectedPartnerId) {
      setPartnerProfile(null);
      return;
    }
    
    const unsubPartner = onSnapshot(doc(db, "users", profile.connectedPartnerId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPartnerProfile({
          id: docSnap.id,
          name: data.name || "Cozy Partner",
          email: data.email || "",
          lastVisitedAt: data.lastVisitedAt || null,
          inviteCode: data.inviteCode || "",
          anniversaryDate: data.anniversaryDate || "",
        });
      }
    }, (err) => {
      console.error("[Dashboard] Partner profile subscription error:", err);
    });
    
    return () => unsubPartner();
  }, [profile?.connectedPartnerId]);

  // 1d. Background Auto-Sync for Relationship Anniversary Date
  // Since security rules restrict direct writes to the partner's user document, we sync reactively.
  // When a change in the partner's anniversaryDate is detected (or if we don't have one set but our partner does),
  // we automatically update our own user profile to match so that both dashboards are perfectly synchronized.
  useEffect(() => {
    if (!user?.uid || !profile || !partnerProfile) return;
    
    const myAnniversary = profile.anniversaryDate || "";
    const partnerAnniversary = partnerProfile.anniversaryDate || "";
    
    if (partnerAnniversary && myAnniversary !== partnerAnniversary) {
      console.log(`[AnniversarySync] Syncing anniversaryDate from partner: "${partnerAnniversary}" (ours was "${myAnniversary}")`);
      const userRef = doc(db, "users", user.uid);
      updateDoc(userRef, {
        anniversaryDate: partnerAnniversary
      }).catch(err => {
        console.error("[AnniversarySync] Error updating our anniversaryDate:", err);
      });
    }
  }, [user?.uid, profile?.anniversaryDate, partnerProfile?.anniversaryDate]);

  // Background Auto-Heal: Ensures that any gallery photos uploaded by the current user are immediately synced
  // with their partnerId as soon as a partner connection is detected, ensuring real-time cross-client reflecting.
  useEffect(() => {
    if (!user?.uid || !profile?.connectedPartnerId) return;
    
    const healPartnerId = profile.connectedPartnerId;
    const galleryRef = collection(db, "gallery_items");
    const qUploadedToUpdate = query(galleryRef, where("userId", "==", user.uid));
    
    getDocs(qUploadedToUpdate).then((snapshot) => {
      snapshot.forEach(async (docSnap) => {
        const data = docSnap.data();
        if (data.partnerId !== healPartnerId) {
          try {
            await updateDoc(docSnap.ref, { partnerId: healPartnerId });
            console.log(`[GlobalAutoHeal] Successfully synced retro-active partnerId to ${healPartnerId} for photo ${docSnap.id}`);
          } catch (err) {
            console.error("Failed to global-auto-heal partnerId for item:", docSnap.id, err);
          }
        }
      });
    }).catch(err => console.error("Error fetching items for query-based auto-heal:", err));
  }, [user?.uid, profile?.connectedPartnerId]);

  // Prefill connect code input from URL parameters and perform instant auto-pairing
  useEffect(() => {
    if (urlInviteCode) {
      setConnectCodeInput(urlInviteCode);
      
      // Auto pair if we have a valid profile, are not connected, and haven't tried yet
      if (profile && !profile.connectedPartnerId && !autoPairAttempted) {
        const normalizedUrlCode = urlInviteCode.toUpperCase().replace(/\s+/g, "").replace(/-+/g, "-");
        const normalizedMyCode = (profile.inviteCode || "").toUpperCase().replace(/\s+/g, "").replace(/-+/g, "-");
        
        if (normalizedUrlCode && normalizedUrlCode !== normalizedMyCode) {
          console.log(`[Dashboard Auto-Connect] Found urlInviteCode "${normalizedUrlCode}". Triggering auto-connection link...`);
          setAutoPairAttempted(true);
          showNotification("success", `Connecting your space instantly to code: ${normalizedUrlCode}! 💖`);
          handleConnectWithPartnerCode(undefined, urlInviteCode);
        }
      }
    }
  }, [urlInviteCode, profile, autoPairAttempted]);

  // Initializer and reactive sync for email invitation contents
  useEffect(() => {
    if (profile?.inviteCode) {
      if (!inviteMessage) {
        setInviteMessage(
          `Hey there! I've created a private space for just the two of us on ForeverNote to preserve our cozy memories, share secret messages, keep countdowns for our special days, and build our shared scrapbook. \n\nDirect Link to Join & Connect Instantly:\n👉 ${getShareableUrl(profile.inviteCode)}\n\nMy invitation code to connect:\n👉 ${profile.inviteCode}\n\nCan't wait! 💖`
        );
      }
      // Reactive preview generation based on template selection prior to Gemini overrides
      setInviteHtml(getDefaultHtmlTemplate(
        profile.inviteCode,
        profile.displayName || user?.displayName || "Me",
        partnerNickname || "dearest",
        designTemplate,
        getShareableUrl()
      ));
    }
    if (profile?.partnerEmail && !inviteEmail) {
      setInviteEmail(profile.partnerEmail);
    }
  }, [profile?.inviteCode, profile?.partnerEmail, profile?.displayName, user?.displayName, partnerNickname, designTemplate, inviteMessage]);

  // 2. Load Combined Milestones and Reminders dynamically based on pairing status
  useEffect(() => {
    if (!user || isProfileLoading || !profile) return;

    let unsubMilestones = () => {};
    let unsubReminders = () => {};
    let unsubOut = () => {};
    let unsubIn = () => {};

    const partnerId = profile?.connectedPartnerId || null;

    // A. Listen to Milestones – Fetch milestones created by current user OR connected partner
    const mQuery = partnerId 
      ? query(collection(db, "milestones"), where("userId", "in", [user.uid, partnerId])) 
      : query(collection(db, "milestones"), where("userId", "==", user.uid));

    unsubMilestones = onSnapshot(mQuery, (snapshot) => {
      const list: Milestone[] = [];
      snapshot.forEach((docDoc) => {
        const data = docDoc.data();
        list.push({
          id: docDoc.id,
          userId: data.userId || "",
          title: data.title || "",
          type: data.type || "Custom",
          date: data.date || "",
          description: data.description || "",
          aiLetterStyle: data.aiLetterStyle,
          generatedLetter: data.generatedLetter,
          imageUrl: data.imageUrl,
          createdAt: data.createdAt,
        });
      });
      // Sort: newest milestone date first
      list.sort((a, b) => {
        const tA = a.date ? new Date(a.date).getTime() : 0;
        const tB = b.date ? new Date(b.date).getTime() : 0;
        return tB - tA;
      });
      setMilestones(list);
      setHasMilestonesLoaded(true);
    }, (err) => {
      console.error("Milestones read error:", err);
      setHasMilestonesLoaded(true);
    });

    // B. Listen to Reminders for current user
    const rQuery = query(collection(db, "reminders"), where("userId", "==", user.uid));
    unsubReminders = onSnapshot(rQuery, (snapshot) => {
      const list: Reminder[] = [];
      snapshot.forEach((docDoc) => {
        const data = docDoc.data();
        list.push({
          id: docDoc.id,
          milestoneId: data.milestoneId,
          userId: data.userId,
          deliveryType: data.deliveryType,
          scheduledDate: data.scheduledDate,
          status: data.status,
          createdAt: data.createdAt,
        });
      });
      setReminders(list);
    }, (err) => {
      console.error("Reminders listener failed:", err);
    });

    // C. Listen to secret private love messages flow
    if (partnerId) {
      const qOut = query(collection(db, "love_messages"), where("senderId", "==", user.uid));
      unsubOut = onSnapshot(qOut, (snap) => {
        const list: any[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setOutgoingMsgs(list);
      });

      const qIn = query(collection(db, "love_messages"), where("recipientId", "==", user.uid));
      unsubIn = onSnapshot(qIn, (snap) => {
        const list: any[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setIncomingMsgs(list);
      });
    }

    return () => {
      unsubMilestones();
      unsubReminders();
      unsubOut();
      unsubIn();
    };
  }, [user, isProfileLoading, profile, profile?.connectedPartnerId]);

  // Auto-seed relationship reminders to match mockup calendar layout on first run
  useEffect(() => {
    if (isProfileLoading || !profile || !user || !db || !hasMilestonesLoaded) return;
    
    // Check if there are already any custom special countdowns with the [SPECIAL-COUNTDOWN] tag description
    const specialCountdowns = milestones.filter(m => m.description?.startsWith("[SPECIAL-COUNTDOWN]"));
    if (specialCountdowns.length === 0) {
      const seedData = [
        { title: "Marriage Anniversary", date: "2027-03-14", desc: "[SPECIAL-COUNTDOWN] Annual recurring countdown holiday" },
        { title: "Proposal Day", date: "2027-04-02", desc: "[SPECIAL-COUNTDOWN] Annual recurring countdown holiday" },
        { title: "Love Anniversary", date: "2026-09-14", desc: "[SPECIAL-COUNTDOWN] Annual recurring countdown holiday" },
        { title: "First Meet Day", date: "2026-07-27", desc: "[SPECIAL-COUNTDOWN] Annual recurring countdown holiday" },
        { title: "Friendship Day", date: "2026-08-04", desc: "[SPECIAL-COUNTDOWN] Annual recurring countdown holiday" },
        { title: "Birthday - Partner", date: "2026-12-11", desc: "[SPECIAL-COUNTDOWN] Annual recurring countdown holiday" }
      ];
      
      const seedReminders = async () => {
        try {
          console.log("Seeding relationship milestones for the beautiful calendar...");
          for (const item of seedData) {
            const sanitizedTitle = item.title.replace(/[^a-zA-Z0-9_\-]+/g, '_').toLowerCase();
            const mId = `m_special_seed_${sanitizedTitle}_${user.uid}`;
            await setDoc(doc(db, "milestones", mId), {
              userId: user.uid,
              title: item.title,
              type: "Custom",
              date: item.date,
              description: item.desc,
              createdAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error("Auto seeding special days error:", err);
        }
      };
      
      seedReminders();
    }
  }, [milestones, isProfileLoading, user]);

  // Compute activeMilestones directly
  const activeMilestones = useMemo<Milestone[]>(() => {
    return milestones;
  }, [milestones]);

  // Combine and sort Love Messages
  const allLoveMessages = useMemo(() => {
    let combined = [...outgoingMsgs, ...incomingMsgs];
    return [...combined].sort((a, b) => {
      const tA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime() || 0;
      const tB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime() || 0;
      return tA - tB;
    });
  }, [outgoingMsgs, incomingMsgs]);

  // Compute active connection quest state in real-time
  const activeQuest = useMemo(() => {
    // Filter for interaction quest/answers
    const questMsgs = allLoveMessages.filter(
      (m: any) => m.style === "QuestState" || m.style === "QuestAnswer"
    );
    if (questMsgs.length === 0) return null;

    // Sort to have newest first to find active quest init
    const sortedQuestMsgs = [...questMsgs].sort((a: any, b: any) => {
      const tA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime() || 0;
      const tB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime() || 0;
      return tB - tA;
    });

    const newestInit = sortedQuestMsgs.find((m: any) => m.style === "QuestState");
    if (!newestInit) return null;

    const textMatch = newestInit.text || "";
    let promptIdMatch = textMatch.match(/\[PROMPT_ID\]\s*([a-zA-Z0-9_\-]+)/);
    const pId = promptIdMatch ? promptIdMatch[1] : null;
    const prompt = PRESET_PROMPTS.find(p => p.id === pId) || null;

    if (!prompt) return null;

    // Find locked answers for this prompt ID
    const myLocked = sortedQuestMsgs.find((m: any) => 
      m.style === "QuestAnswer" && 
      m.senderId === user?.uid && 
      m.text.includes(`[PROMPT_ID] ${pId}`)
    );

    const partnerId = profile?.connectedPartnerId;
    const partnerLocked = partnerId ? sortedQuestMsgs.find((m: any) => 
      m.style === "QuestAnswer" && 
      m.senderId === partnerId && 
      m.text.includes(`[PROMPT_ID] ${pId}`)
    ) : null;

    const myAnswerText = myLocked ? myLocked.text.replace(`[PROMPT_ID] ${pId}`, "").replace("[ANSWER]", "").trim() : "";
    const partnerAnswerText = partnerLocked ? partnerLocked.text.replace(`[PROMPT_ID] ${pId}`, "").replace("[ANSWER]", "").trim() : "";

    return {
      prompt,
      myStatus: myLocked ? { locked: true, text: myAnswerText } : null,
      partnerStatus: partnerLocked ? { locked: true, text: partnerAnswerText } : null,
      id: pId
    };
  }, [allLoveMessages, user?.uid, profile?.connectedPartnerId]);

  // Calculate dynamic Countdown timer for special dates
  useEffect(() => {
    const interval = setInterval(() => {
      let targetDate: Date | null = null;
      let label = "Relationship Start Anniversary";

      const today = new Date();
      const todayTime = today.getTime();

      const activeId = profile?.activeCountdownId || localPinnedId || "auto";

      const getNextAnniversary = (dateStr: string) => {
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return null;
          let candidate = new Date(today.getFullYear(), d.getMonth(), d.getDate());
          if (candidate.getTime() < todayTime) {
            candidate.setFullYear(today.getFullYear() + 1);
          }
          return candidate;
        } catch {
          return null;
        }
      };

      const getGlobalDate = (month: number, day: number) => {
        let candidate = new Date(today.getFullYear(), month, day, 0, 0, 0, 0);
        if (candidate.getTime() < todayTime) {
          candidate.setFullYear(today.getFullYear() + 1);
        }
        return candidate;
      };

      if (activeId === "relationship_anniversary") {
        if (effectiveAnniversaryDate) {
          targetDate = getNextAnniversary(effectiveAnniversaryDate);
          label = isFriendshipMode ? "Best Friends Anniversary" : "Couple Relationship Anniversary";
        }
      } else if (activeId === "days_together_milestone") {
        if (effectiveAnniversaryDate) {
          try {
            const startStr = effectiveAnniversaryDate;
            const start = new Date(startStr);
            start.setHours(0, 0, 0, 0);
            const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
            const diffMs = todayClean.getTime() - start.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            const baseMilestones = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000];
            const nextMilest = baseMilestones.find(m => m > diffDays) || ((Math.floor(diffDays / 100) + 1) * 100);
            
            const target = new Date(start.getTime() + nextMilest * 24 * 60 * 60 * 1000);
            targetDate = target;
            label = isFriendshipMode ? `Our ${nextMilest} Days of Friendship Celebration 🥂` : `Our ${nextMilest} Days Together Celebration 🥂`;
          } catch {
            // fallback
          }
        }
      } else if (activeId.startsWith("global_")) {
        const found = GLOBAL_SPECIAL_DAYS.find(g => g.id === activeId);
        if (found) {
          targetDate = getGlobalDate(found.month, found.day);
          label = found.title;
        }
      } else if (activeId !== "auto") {
        // Look up by milestone ID
        const targetMilestone = activeMilestones.find(m => m.id === activeId);
        if (targetMilestone) {
          const mDate = new Date(targetMilestone.date);
          const isOneTime = (targetMilestone.description || "").includes("[ONE-TIME]");
          
          if (isOneTime && mDate.getTime() > todayTime) {
            targetDate = mDate;
            label = `Upcoming: "${targetMilestone.title}"`;
          } else {
            targetDate = getNextAnniversary(targetMilestone.date);
            label = `Anniversary of "${targetMilestone.title}"`;
          }
        }
      }

      // If nothing selected or "auto" is active or target is not found, fallback to auto-smart proximity!
      if (!targetDate) {
        const candidates: { date: Date; label: string }[] = [];

        if (effectiveAnniversaryDate) {
          const rAnn = getNextAnniversary(effectiveAnniversaryDate);
          if (rAnn) candidates.push({ date: rAnn, label: isFriendshipMode ? "Best Friends Anniversary" : "Couple Relationship Anniversary" });

          try {
            const start = new Date(effectiveAnniversaryDate);
            start.setHours(0, 0, 0, 0);
            const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
            const diffMs = todayClean.getTime() - start.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            const baseMilestones = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000];
            const nextMilest = baseMilestones.find(m => m > diffDays) || ((Math.floor(diffDays / 100) + 1) * 100);
            const target = new Date(start.getTime() + nextMilest * 24 * 60 * 60 * 1000);
            candidates.push({ date: target, label: isFriendshipMode ? `Our ${nextMilest} Days of Friendship Celebration 🥂` : `${nextMilest} Days Together Celebration 🥂` });
          } catch (e) {
            console.error("Error computing auto-proximity days together:", e);
          }
        }

        activeMilestones.forEach(m => {
          if ((m.description || "").startsWith("[VAULT-ITEM-")) return;
          const isOneTime = (m.description || "").includes("[ONE-TIME]");
          const mDate = new Date(m.date);
          if (isOneTime && mDate.getTime() > todayTime) {
            candidates.push({ date: mDate, label: `Upcoming: "${m.title}"` });
          } else {
            const mAnn = getNextAnniversary(m.date);
            if (mAnn) candidates.push({ date: mAnn, label: `Anniversary of "${m.title}"` });
          }
        });

        GLOBAL_SPECIAL_DAYS.forEach(g => {
          candidates.push({ date: getGlobalDate(g.month, g.day), label: g.title });
        });

        if (candidates.length > 0) {
          candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
          targetDate = candidates[0].date;
          label = candidates[0].label;
        }
      }

      if (targetDate) {
        const diffMs = targetDate.getTime() - todayTime;
        if (diffMs > 0) {
          const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const h = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((diffMs % (1000 * 60)) / 1000);
          setCountdownText({ days: d, hours: h, minutes: m, seconds: s });
          setCountdownLabel(label);
        } else {
          setCountdownText({ days: 0, hours: 0, minutes: 0, seconds: 0 });
          setCountdownLabel(`${label} is here! 🎉`);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeMilestones, effectiveAnniversaryDate, profile?.activeCountdownId, localPinnedId]);

  // Compute Smart Notifications dynamically
  const getSmartNotifications = () => {
    const list: { text: string; type: string; key: string }[] = [];
    const today = new Date();

    if (unreadMsgCount > 0) {
      list.push({
        key: "unread-secret-msg",
        text: isFriendshipMode 
          ? `🌟 You have ${unreadMsgCount} new bestie message${unreadMsgCount > 1 ? 's' : ''}! Open Bestie Messages to decrypt.` 
          : `💌 You have ${unreadMsgCount} new secret love note${unreadMsgCount > 1 ? 's' : ''}! Open Secret Messages to decrypt.`,
        type: "today"
      });
    }

    // Loop milestones and analyze dates
    activeMilestones.forEach((m) => {
      try {
        const mDate = new Date(m.date);
        
        // check Month & Day match
        const isToday = today.getMonth() === mDate.getMonth() && today.getDate() === mDate.getDate();
        
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        const isTomorrow = tomorrow.getMonth() === mDate.getMonth() && tomorrow.getDate() === mDate.getDate();

        if (isToday) {
          list.push({
            key: `today-${m.id}`,
            text: isFriendshipMode 
              ? `Today is your "${m.title}"! 🎉 Unlock your friendship vault!` 
              : `Today is your "${m.title}"! 🎉 Unlock your wishes vault!`,
            type: "today"
          });
        } else if (isTomorrow) {
          list.push({
            key: `tomorrow-${m.id}`,
            text: isFriendshipMode 
              ? `Tomorrow is your "${m.title}" 🌟 Prepare a bestie surprise card!` 
              : `Tomorrow is your "${m.title}" ❤️ Prepare a surprise secret card!`,
            type: "tomorrow"
          });
        }
      } catch (err) {}
    });

    // Default notifications if none exist
    if (list.length === 0) {
      if (effectiveAnniversaryDate) {
        list.push({
          key: "default-clock",
          text: isFriendshipMode 
            ? "Your Besties Space is active! Ticking down friendship countdown milestones in real time. 💫" 
            : "Your Couple Space is active! Ticking down countdown milestones in real time. 💫",
          type: "info"
        });
      } else {
        list.push({
          key: "default-welcome",
          text: isFriendshipMode 
            ? "Welcome to ForeverNote! Add your Friendaversary Date in Settings to unlock your countdown calendar! 🌟" 
            : "Welcome to ForeverNote! Add your Anniversary Date in Settings to unlock the countdown calendar! 💖",
          type: "guide"
        });
      }
    }

    return list;
  };

  const dynamicNotifications = getSmartNotifications();

  // Save profile updates
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profName.trim()) {
      setProfileError("Please provide your display name.");
      return;
    }

    try {
      setProfileSaving(true);
      setProfileError("");
      const userRef = doc(db, "users", user.uid);
      
      const updateData: any = {
        name: profName,
        partnerName: profPartnerName || "",
        partnerEmail: profPartnerEmail || "",
        anniversaryDate: profAnniversary || "",
        friendshipMode: editFriendshipMode,
        appearanceTheme: editAppearanceTheme,
      };

      // Safeguard against wiping existing fields
      if (profile?.inviteCode) {
        updateData.inviteCode = profile.inviteCode;
      }

      await updateDoc(userRef, updateData).catch(async (err) => {
        // Fallback to setDoc only if document doesn't exist yet
        if (err.code === "not-found") {
          const randomCode = "FN-" + Math.random().toString(36).substring(2, 8).toUpperCase();
          await setDoc(userRef, {
            ...updateData,
            email: user.email || "",
            inviteCode: profile?.inviteCode || randomCode,
            partnerInviteCode: profile?.partnerInviteCode || "",
            connectedPartnerId: profile?.connectedPartnerId || "",
            createdAt: serverTimestamp(),
          });
        } else {
          throw err;
        }
      });

      setProfileSaving(false);
      setIsSettingsOpen(false);
    } catch (err: any) {
      setProfileSaving(false);
      setProfileError("Couldn't save: " + (err?.message || err));
    }
  };

  // Quick toggle between Friendship / Besties Mode and Couple Mode from sticky header
  const handleToggleFriendshipMode = async () => {
    if (!user?.uid || !profile) return;
    try {
      const newMode = !isFriendshipMode;
      const userRef = doc(db, "users", user.uid);
      
      // Update local edit state
      setEditFriendshipMode(newMode);
      
      if (user.uid.startsWith("demo") || !db) {
        setProfile(prev => prev ? { ...prev, friendshipMode: newMode } : null);
      } else {
        await updateDoc(userRef, {
          friendshipMode: newMode
        });
        
        if (profile.connectedPartnerId) {
          try {
            const partnerRef = doc(db, "users", profile.connectedPartnerId);
            await updateDoc(partnerRef, {
              friendshipMode: newMode
            });
          } catch (partnerErr) {
            console.warn("Failed to automatically update partner's friendship mode:", partnerErr);
          }
        }
      }
      
      showNotification(
        "success", 
        newMode 
          ? "Switched to Besties Space! 🌟 Cherish your amazing friendship!" 
          : "Switched to Couple Space! 💖 Celebrate your love!"
      );
    } catch (err: any) {
      console.error("Error toggling friendship mode:", err);
      showNotification("error", "Failed to switch modes: " + (err.message || err));
    }
  };

  // Profile link search & connect
  const handleConnectWithPartnerCode = async (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    console.log(`[handleConnectWithPartnerCode] Initiating partner pairing process.`);
    const rawInput = (customCode || connectCodeInput).trim();
    console.log(`[handleConnectWithPartnerCode] Raw input values: "${rawInput}"`);

    if (!rawInput) {
      setConnectError("Enter a valid invite code or partner's email address.");
      return;
    }

    const isEmailInput = rawInput.includes("@");
    let codeInput = "";
    let emailInput = "";

    if (isEmailInput) {
      emailInput = rawInput.toLowerCase();
      if (emailInput === user.email?.toLowerCase()) {
        setConnectError("That's your own email address!");
        return;
      }
    } else {
      codeInput = rawInput.toUpperCase().replace(/\s+/g, "").replace(/-+/g, "-");
      // Auto-prepend "FN-" if the user only entered the 6-character suffix (e.g., "ABC123" -> "FN-ABC123")
      if (codeInput.length === 6 && !codeInput.startsWith("FN-")) {
        codeInput = "FN-" + codeInput;
      }
      if (codeInput === profile?.inviteCode) {
        setConnectError("That's your own profile code!");
        return;
      }
    }

    console.log(`[handleConnectWithPartnerCode] Resolved targets: emailInput="${emailInput}", codeInput="${codeInput}"`);
    console.log(`[handleConnectWithPartnerCode] Current user UID: "${user.uid}", inviteCode: "${profile?.inviteCode || "N/A"}"`);

    try {
      setConnectLoading(true);
      setConnectError("");
      setConnectMessage("");

      let q;
      if (isEmailInput) {
        const titleEmail = rawInput.charAt(0).toUpperCase() + rawInput.slice(1);
        const emailVariants = Array.from(new Set([emailInput, rawInput, titleEmail]));
        console.log(`[handleConnectWithPartnerCode] Querying Firestore 'users' for email in variants:`, emailVariants);
        q = query(
          collection(db, "users"),
          where("email", "in", emailVariants)
        );
      } else {
        console.log(`[handleConnectWithPartnerCode] Querying Firestore 'users' for inviteCode == "${codeInput}"`);
        q = query(
          collection(db, "users"), 
          where("inviteCode", "==", codeInput)
        );
      }
      const snap = await getDocs(q);

      console.log(`[handleConnectWithPartnerCode] Query execution completed. Empty response?: ${snap.empty}`);
      if (snap.empty) {
        console.warn(`[handleConnectWithPartnerCode] No matching partner found for input: "${rawInput}". Verification failed.`);
        
        // Debug assistance: log all existing invite codes to see what's in Firestore
        try {
          console.log(`[handleConnectWithPartnerCode] [DEBUG] Fetching all registered users to assist debugging...`);
          const allUsersSnap = await getDocs(collection(db, "users"));
          console.log(`[handleConnectWithPartnerCode] [DEBUG] Total registered users in database: ${allUsersSnap.size}`);
          allUsersSnap.forEach((docSnap) => {
            const data = docSnap.data();
            console.log(`[DEBUG USER] docID: "${docSnap.id}", name: "${data.name || "N/A"}", email: "${data.email || "N-A"}", inviteCode: "${data.inviteCode || "N/A"}", partnerInviteCode: "${data.partnerInviteCode || "N/A"}", connectedPartnerId: "${data.connectedPartnerId || "N/A"}"`);
          });
        } catch (debugErr) {
          console.error(`[handleConnectWithPartnerCode] [DEBUG] Failed to list all users:`, debugErr);
        }

        const fallbackMsg = isEmailInput
          ? "No partner found with that email address. Please make sure they have signed up first."
          : `No partner found with invite code "${rawInput}". Please verify or ask your partner to sign up!`;
        setConnectError(fallbackMsg);
        showNotification("error", fallbackMsg);
        return;
      }

      const partnerDoc = snap.docs[0];
      const partnerData = partnerDoc.data() as any;
      const partnerUid = partnerDoc.id;

      console.log(`[handleConnectWithPartnerCode] Matching partner found! UID: "${partnerUid}", Name: "${partnerData.name}", Email: "${partnerData.email || "N/A"}"`);
      console.log(`[handleConnectWithPartnerCode] Preparing atomic batch write to pair current user "${user.uid}" with partner "${partnerUid}"`);

      const batch = writeBatch(db);

      // Unilaterally updating both directories in Firestore in one single atomic transaction
      console.log(`[handleConnectWithPartnerCode] Adding batch update for current user: "${user.uid}"`);
      batch.update(doc(db, "users", user.uid), {
        connectedPartnerId: partnerUid,
        partnerName: partnerData.name || "My Partner",
        partnerEmail: partnerData.email || "",
        partnerInviteCode: partnerData.inviteCode || codeInput,
      });

      console.log(`[handleConnectWithPartnerCode] Adding batch update for partner: "${partnerUid}"`);
      batch.update(doc(db, "users", partnerUid), {
        connectedPartnerId: user.uid,
        partnerName: profile?.name || user.displayName || "My Partner",
        partnerEmail: user.email || "",
        partnerInviteCode: profile?.inviteCode || "",
      });

      console.log(`[handleConnectWithPartnerCode] Committing transactional batch updates to Firestore...`);
      await batch.commit();

      console.log(`[handleConnectWithPartnerCode] Batch updates successfully committed! Connection established!`);
      setConnectMessage(`Successfully linked! Connected with ${partnerData.name}! 💖`);
      setConnectCodeInput("");

      // Clear URL params and localStorage so it is only run once and address looks clean
      if (typeof window !== "undefined") {
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete("code");
          url.searchParams.delete("inviteCode");
          window.history.replaceState({}, document.title, url.toString());
          localStorage.removeItem("fn_url_invite_code");
        } catch (urlCleanupErr) {
          console.warn("Could not clean up URL history tracker parameters:", urlCleanupErr);
        }
      }
    } catch (err: any) {
      console.error("[handleConnectWithPartnerCode] Pairing execution failed:", err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      const errMsg = err?.message || "Failed to link your partner.";
      setConnectError(errMsg);
      showNotification("error", errMsg);
    } finally {
      setConnectLoading(false);
    }
  };

  // Unlink paired dashboards
  const handleDisconnectPartner = async () => {
    if (!profile?.connectedPartnerId) return;

    try {
      const partnerUid = profile.connectedPartnerId;
      const batch = writeBatch(db);

      // Unlink both users dynamically and atomically on Firestore
      batch.update(doc(db, "users", user.uid), {
        connectedPartnerId: "",
        partnerName: "",
        partnerEmail: "",
        partnerInviteCode: "",
      });

      batch.update(doc(db, "users", partnerUid), {
        connectedPartnerId: "",
        partnerName: "",
        partnerEmail: "",
        partnerInviteCode: "",
      });

      await batch.commit();
      showNotification("success", "Dashboards disconnected. Workspaces safely unlinked! 💔");
      setIsSettingsOpen(false);
    } catch (err: any) {
      console.error("Disconnection error:", err);
      showNotification("error", "Failed to disconnect: " + err.message);
    }
  };

  // handleConnectDemoPartner removed as requested

  // Handle building and launching email templates (supports standard mailto and web-based Gmail)
  const handleSendEmailInvite = (e?: React.FormEvent, method: 'mailto' | 'gmail' = 'mailto') => {
    if (e) e.preventDefault();
    if (!inviteEmail.trim()) {
      showNotification("info", "Please enter your partner's email address first.");
      return;
    }
    const templateSubject = encodeURIComponent(inviteSubject);
    const templateBody = encodeURIComponent(inviteMessage);

    if (method === 'gmail') {
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${inviteEmail.trim()}&su=${templateSubject}&body=${templateBody}`;
      window.open(gmailUrl, "_blank");
      showNotification("success", "Opening Gmail Web draft editor! 📬");
    } else {
      const mailtoUrl = `mailto:${inviteEmail.trim()}?subject=${templateSubject}&body=${templateBody}`;
      window.location.href = mailtoUrl;
      showNotification("success", "Email invitation drafted in your local mail client! 💌");
    }
  };

  // Copy invitation draft text directly to clipboard
  const handleCopyEmailInvite = () => {
    navigator.clipboard.writeText(inviteMessage);
    showNotification("success", "Invitation text copied to clipboard! You can paste and send it anywhere. 💖");
  };

  // Elite copy function that writes rich formatted HTML directly to clipboard.
  // Paste in Gmail instantly preserves backgrounds, fonts, buttons, and ticket structures!
  const handleCopyRichHtmlClipboard = async () => {
    try {
      const htmlContent = inviteHtml || getDefaultHtmlTemplate(
        profile?.inviteCode || "FN-CONNECT",
        profile?.displayName || user?.displayName || "Me",
        partnerNickname || "dearest",
        designTemplate,
        getShareableUrl()
      );
      const plainText = inviteMessage || `Join our ForeverNote sanctuary!\nLink: ${getShareableUrl(profile?.inviteCode)}\nCode: ${profile?.inviteCode}`;
      
      const blobHtml = new Blob([htmlContent], { type: "text/html" });
      const blobText = new Blob([plainText], { type: "text/plain" });
      
      const dataItem = new ClipboardItem({
        "text/html": blobHtml,
        "text/plain": blobText
      });
      
      await navigator.clipboard.write([dataItem]);
      showNotification("success", "Rich designed card copied! Open your Gmail Compose and hit Paste (Ctrl+V) to see the beautiful graphic appear instantly! 🪄✨");
    } catch (err: any) {
      console.error("Rich copy failed, falling back to standard string:", err);
      // Fallback
      navigator.clipboard.writeText(inviteHtml || inviteMessage);
      showNotification("success", "Copied raw layout code to clipboard! 📋");
    }
  };

  // Generate exciting AI Handwritten Invitation Letter using Gemini with rich designs
  const generateAiInvitationLetter = async () => {
    if (!profile?.inviteCode) {
      showNotification("error", "Waiting for your invitation code to compile...");
      return;
    }
    setInviteGenLoading(true);
    try {
      const resp = await fetch("/api/invite/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: profile?.displayName || user?.displayName || "Me",
          nickname: partnerNickname.trim() || "my favorite human",
          inviteCode: profile.inviteCode,
          vibe: inviteVibe,
          highlights: inviteHighlights,
          designTemplate: designTemplate,
          appUrl: getShareableUrl(),
        }),
      });
      if (!resp.ok) {
        throw new Error("Handwritten scribe server returned an error");
      }
      const data = await resp.json();
      if (data?.letter) {
        setInviteMessage(data.letter);
        if (data.htmlLetter) {
          setInviteHtml(data.htmlLetter);
        }
        showNotification("success", `Generated exciting "${designTemplate}" design draft! ✨✍️`);
      } else {
        throw new Error("No letter text returned");
      }
    } catch (err: any) {
      console.error(err);
      showNotification("error", "The quill ran dry. Try pressing Generate again!");
    } finally {
      setInviteGenLoading(false);
    }
  };

  // Send a secret love message
  const handleSendSecretMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsgText.trim()) return;
    if (!profile?.connectedPartnerId) {
      showNotification("info", "Please connect with your partner first to transmit messages.");
      return;
    }

    try {
      setSendMsgLoading(true);
      const msgId = `msg_${Date.now()}`;
      await setDoc(doc(db, "love_messages", msgId), {
        senderId: user.uid,
        recipientId: profile.connectedPartnerId,
        text: newMsgText.trim(),
        style: selectedMsgStyle,
        createdAt: serverTimestamp(),
      });
      setNewMsgText("");
    } catch (err: any) {
      console.error(err);
      showNotification("error", "Couldn't send: " + err.message);
    } finally {
      setSendMsgLoading(false);
    }
  };

  const processVaultFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setVaultError("Please select a valid image file.");
      showNotification("error", "Please select a valid image file.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setVaultError("Files are limited to smaller than 12MB.");
      showNotification("error", "Files are limited to smaller than 12MB.");
      return;
    }
    try {
      setVaultUploading(true);
      setVaultError("");
      const { compressAndConvertToBase64 } = await import("../utils/imageCompressor");
      const base64 = await compressAndConvertToBase64(file);
      setWishMediaUrl(base64);
      showNotification("success", "Polaroid photo optimized and attached! 📸");
    } catch (err: any) {
      console.error(err);
      setVaultError("Could not optimize or attach this image.");
      showNotification("error", "Could not process this image.");
    } finally {
      setVaultUploading(false);
    }
  };

  const handleVaultFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      await processVaultFile(files[0]);
    }
  };

  // Upload/Save dynamic custom Wishes & Scrapbook items in vault (milestones collection)
  const handleSaveWish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishTitle.trim() || !wishContent.trim()) {
      showNotification("info", "Please fill out both the title and text.");
      return;
    }

    try {
      wishSaving;
      setWishSaving(true);
      const wishId = `wish_${Date.now()}`;
      
      // We write this scrapbook item directly into our secure Milestones collection!
      // This is elegant and perfectly uses our standard Firebase paths
      await setDoc(doc(db, "milestones", wishId), {
        userId: user.uid,
        title: wishTitle.trim(),
        type: "Custom", // Map to custom category
        date: new Date().toISOString().substring(0, 10), // Current date YYYY-MM-DD
        description: `[VAULT-ITEM-${wishType.toUpperCase()}] ${wishContent.trim()} ${wishMediaUrl ? `| link: ${wishMediaUrl.trim()}` : ""}`,
        aiLetterStyle: "Cute", 
        generatedLetter: wishMediaUrl.trim() || "", // Keep the media attachment path here
        createdAt: serverTimestamp(),
      });

      setWishTitle("");
      setWishContent("");
      setWishMediaUrl("");
      setWishFormOpen(false);
      showNotification("success", "Successfully locked your memory in the vault! 🔐");
    } catch (err) {
      console.error(err);
      showNotification("error", "Couldn't upload memory item.");
    } finally {
      setWishSaving(false);
    }
  };

  // Delete Vault memory
  const handleDeleteVaultItem = async (mId: string) => {
    if (!window.confirm("Bury this memory item from the vault?")) return;
    try {
      await deleteDoc(doc(db, "milestones", mId));
    } catch (e) {
      showNotification("error", "Couldn't delete item.");
    }
  };

  const getMilestoneReminder = (mId: string) => {
    return reminders.find((r) => r.milestoneId === mId) || null;
  };

  // Save Milestone & Reminder from standard timeline log
  const handleSaveMilestone = async (
    milestoneInput: {
      title: string;
      type: MilestoneType;
      date: string;
      description: string;
      aiLetterStyle: LetterStyle;
      imageUrl?: string;
    },
    reminderInput: {
      deliveryType: ReminderType;
      scheduledDate: string;
      enableReminder: boolean;
    }
  ) => {
    const isEdit = !!editingMilestone;
    const milestoneId = isEdit ? editingMilestone!.id : `m_${Date.now()}`;
    const mRef = doc(db, "milestones", milestoneId);

    const mData = {
      userId: isEdit ? editingMilestone!.userId : user.uid, // preserve creator uid
      title: milestoneInput.title,
      type: milestoneInput.type,
      date: milestoneInput.date,
      description: milestoneInput.description,
      aiLetterStyle: milestoneInput.aiLetterStyle,
      generatedLetter: isEdit ? editingMilestone!.generatedLetter || "" : "",
      imageUrl: milestoneInput.imageUrl || "",
      createdAt: isEdit ? editingMilestone!.createdAt : serverTimestamp(),
    };

    try {
      await setDoc(mRef, mData);

      const existingRem = getMilestoneReminder(milestoneId);
      if (reminderInput.enableReminder) {
        const reminderId = existingRem ? existingRem.id : `r_${Date.now()}`;
        const rRef = doc(db, "reminders", reminderId);
        const rData = {
          milestoneId,
          userId: user.uid,
          deliveryType: reminderInput.deliveryType,
          scheduledDate: reminderInput.scheduledDate,
          status: "pending",
          createdAt: existingRem ? existingRem.createdAt : serverTimestamp(),
        };
        await setDoc(rRef, rData);
      } else if (existingRem) {
        await deleteDoc(doc(db, "reminders", existingRem.id));
      }
      setIsFormOpen(false);
    } catch (err) {
      handleFirestoreError(err, isEdit ? OperationType.UPDATE : OperationType.CREATE, `milestones/${milestoneId}`);
    }
  };

  const handleDeleteMilestone = async (mId: string) => {
    if (!window.confirm("Bury this memory milestone?")) return;
    try {
      const associatedReminder = getMilestoneReminder(mId);
      if (associatedReminder) {
        await deleteDoc(doc(db, "reminders", associatedReminder.id));
      }
      await deleteDoc(doc(db, "milestones", mId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `milestones/${mId}`);
    }
  };

  const handleSaveReminder = async (
    milestoneId: string,
    deliveryType: ReminderType,
    scheduledDate: string,
    isDelete: boolean = false
  ) => {
    try {
      const existingRem = getMilestoneReminder(milestoneId);
      if (isDelete) {
        if (existingRem) {
          await deleteDoc(doc(db, "reminders", existingRem.id));
          showNotification("success", "Scrapbook reminder cancelled successfully! 🔔");
        }
        return;
      }

      const reminderId = existingRem ? existingRem.id : `r_${Date.now()}`;
      const rRef = doc(db, "reminders", reminderId);
      const rData = {
        milestoneId,
        userId: user.uid,
        deliveryType,
        scheduledDate,
        status: "pending",
        createdAt: existingRem ? existingRem.createdAt : serverTimestamp(),
      };
      await setDoc(rRef, rData);
      showNotification("success", `Scrapbook reminder scheduled for ${scheduledDate}! 🎉`);
    } catch (err: any) {
      console.error(err);
      showNotification("error", "Failed to update scrapbook reminder: " + err.message);
    }
  };

  const handleSaveLetterText = async (milestoneId: string, letter: string, style: LetterStyle) => {
    try {
      const mRef = doc(db, "milestones", milestoneId);
      await updateDoc(mRef, {
        generatedLetter: letter,
        aiLetterStyle: style,
      });
      if (activeLetterMilestone && activeLetterMilestone.id === milestoneId) {
        setActiveLetterMilestone({
          ...activeLetterMilestone,
          generatedLetter: letter,
          aiLetterStyle: style,
        });
      }
      showNotification("success", "Locked this heartfelt letter into your memory vault! 💖");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `milestones/${milestoneId}`);
    }
  };
  
  // Love Countdown Pinned & Special Days logic helpers
  const handlePinCountdown = async (id: string) => {
    setLocalPinnedId(id);
    if (user && profile) {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          activeCountdownId: id
        });
        if (profile.connectedPartnerId) {
          await updateDoc(doc(db, "users", profile.connectedPartnerId), {
            activeCountdownId: id
          });
        }
      } catch (err) {
        console.error("Error updating pinned countdown:", err);
      }
    }
  };

  const getDaysLeft = (dateStr: string, isOneTime?: boolean) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eventDate = new Date(dateStr);
      
      if (isOneTime) {
        const diffTime = eventDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
      } else {
        let candidate = new Date(today.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        if (candidate.getTime() < today.getTime()) {
          candidate.setFullYear(today.getFullYear() + 1);
        }
        const diffTime = candidate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
      }
    } catch {
      return 0;
    }
  };

  const formatDaysLeft = (days: number) => {
    if (days === 0) return "Today! 🎉";
    if (days < 0) return `${Math.abs(days)} days ago ⏰`;
    return `In ${days} days 💖`;
  };

  const handleSaveSpecialDay = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newSpecialTitle.trim()) {
      showNotification("info", "Please enter a title for this landmark.");
      return;
    }

    let finalTargetDate = newSpecialDate;
    let finalIsOneTime = newSpecialIsOneTime;

    if (newSpecialMode === "days") {
      if (!effectiveAnniversaryDate) {
        showNotification("error", "Please configure your Relationship Anniversary start date in Settings first to add reminders by days.");
        return;
      }
      const daysCount = parseInt(newSpecialDaysValue, 10);
      if (isNaN(daysCount) || daysCount < 0) {
        showNotification("error", "Please enter a valid positive number of days.");
        return;
      }
      
      try {
        const start = new Date(effectiveAnniversaryDate);
        start.setDate(start.getDate() + daysCount);
        const y = start.getFullYear();
        const m = String(start.getMonth() + 1).padStart(2, '0');
        const s = String(start.getDate()).padStart(2, '0');
        finalTargetDate = `${y}-${m}-${s}`;
        finalIsOneTime = true; // Milestones relative to anniversary are one-time landmarks
      } catch (err) {
        showNotification("error", "Could not calculate the target date.");
        return;
      }
    } else {
      if (!newSpecialDate) {
        showNotification("info", "Please select a special calendar date.");
        return;
      }
    }

    try {
      setSpecialSaving(true);
      const mId = `m_special_${Date.now()}`;
      
      const descriptionTag = finalIsOneTime ? "[ONE-TIME] Custom countdown landmark" : "Annual recurring countdown holiday";
      
      await setDoc(doc(db, "milestones", mId), {
        userId: user.uid,
        title: newSpecialTitle.trim(),
        type: "Custom",
        date: finalTargetDate,
        description: `[SPECIAL-COUNTDOWN] ${descriptionTag}`,
        createdAt: new Date().toISOString(),
      });

      await handlePinCountdown(mId);

      setNewSpecialTitle("");
      setNewSpecialDate("");
      setNewSpecialDaysValue("");
      setNewSpecialIsOneTime(false);
      setSpecialDaysTab('list');
      showNotification("success", "Custom Landmark added & countdown synchronized! 💖");
    } catch (err: any) {
      console.error(err);
      showNotification("error", "Error adding Special Landmark: " + err.message);
    } finally {
      setSpecialSaving(false);
    }
  };

  // Filter list of milestones (exclude vault items and special countdown metrics from standard diary timeline)
  const timelineMilestones = activeMilestones.filter((m) => {
    const isVaultItem = (m.description || "").startsWith("[VAULT-ITEM-");
    if (isVaultItem) return false;
    const isSpecialCountdown = (m.description || "").startsWith("[SPECIAL-COUNTDOWN]");
    if (isSpecialCountdown) return false;
    
    if (selectedTypeFilter === "All") return true;
    return m.type === selectedTypeFilter;
  });

  // Extract individual wishes for Wishes subgrid
  const uploadedWishes = activeMilestones.filter((m) => {
    return (m.description || "").startsWith("[VAULT-ITEM-");
  }).map((m) => {
    const rawDesc = m.description || "";
    const endHeaderIdx = rawDesc.indexOf("]");
    const typeTag = rawDesc.substring(12, endHeaderIdx).toLowerCase();
    const cleanContent = rawDesc.substring(endHeaderIdx + 2);
    return {
      id: m.id,
      userId: m.userId,
      title: m.title,
      type: typeTag,
      content: cleanContent,
      mediaUrl: m.generatedLetter || "", // stored there
      date: m.date,
    };
  });

  if (isProfileLoading || !profile) {
    return (
      <div className="min-h-screen bg-linear-to-b from-[#FFF5F6] via-purple-50 to-[#F3F8FB] flex items-center justify-center">
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="text-pink-500 mx-auto w-10 h-10"
          >
            <RefreshCw className="w-10 h-10" />
          </motion.div>
          <p className="text-slate-600 font-display font-medium text-sm">Opening ForeverNote core databases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeStyles.bodyBg} pb-16 ${themeStyles.isDark ? 'text-slate-100' : 'text-slate-850'} relative w-full overflow-x-hidden font-sans transition-all duration-500`}>
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[99999] max-w-sm w-11/12 p-4 rounded-2xl border shadow-2xl flex items-center justify-between text-xs font-bold ${
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
      
      {/* Immersive Cozy Train Sunset Backdrop Cover */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-[0.05] pointer-events-none mix-blend-multiply z-0" 
        style={{ backgroundImage: `url(${coupleTrainSunset})` }}
      />
      
      {/* Top sticky nav bar bar */}
      <nav id="sticky-header" className={`sticky top-0 ${themeStyles.isDark ? 'bg-slate-900/90 border-b border-slate-800' : 'bg-white/90 border-b ' + themeStyles.borderAccent + '/50'} backdrop-blur-md z-30 shadow-xs relative transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          
          {/* Logo Brand area */}
          <div className="flex items-center gap-2 shrink-0">
            <div className={`${themeStyles.iconBg} p-2 rounded-xl text-white shadow-xs animate-pulse`}>
              {renderLogoIcon()}
            </div>
            <span className={`font-display font-black text-lg sm:text-xl tracking-tight ${themeStyles.isDark ? 'text-white' : 'text-slate-850'}`}>
              ForeverNote <span className={`text-[11px] ${themeStyles.badgeAccent} font-extrabold px-1.5 py-0.5 rounded-md align-middle inline-block ml-1`}>
                {isFriendshipMode ? "BESTIESBOARD" : "LOVEBOARD"}
              </span>
            </span>
          </div>

          {/* Right actions corner */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* Logged in Profiles Info Badge - responsive & non-overlapping truncating wrapper */}
            <span 
              className={`text-[11px] font-black hidden md:inline-flex items-center gap-1.5 ${themeStyles.isDark ? 'bg-slate-800/80 border-slate-700/60 text-slate-300' : 'bg-slate-50 border border-slate-200 text-slate-500'} rounded-full px-3 py-1.5 max-w-[280px] lg:max-w-[360px] truncate cursor-help`}
              title={profile?.partnerName ? `${profile?.name || user.displayName} & ${profile.partnerName} connected. Partner last active: ${formatFriendlyActiveStatus(partnerProfile?.lastVisitedAt)}` : `Waiting for partner...`}
            >
              <Smile className={`w-4 h-4 ${themeStyles.textAccent} shrink-0`} />
              <span className="truncate max-w-[80px]" title={profile?.name || user.displayName}>
                {profile?.name || user.displayName}
              </span>
              {profile?.partnerName && (
                <>
                  <span className="text-slate-300 font-normal">&amp;</span>
                  <span className={`${themeStyles.textAccent} truncate max-w-[80px] font-bold`} title={profile.partnerName}>
                    {profile.partnerName}
                  </span>
                  <span className="relative flex h-2 w-2 ml-0.5 shrink-0" title={`Partner Active: ${formatFriendlyActiveStatus(partnerProfile?.lastVisitedAt)}`}>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </>
              )}
            </span>

            {/* Friends / Couple Switch Option */}
            <div 
              onClick={handleToggleFriendshipMode}
              className={`relative cursor-pointer select-none rounded-full p-0.5 flex items-center transition-all duration-300 ${
                isFriendshipMode 
                  ? 'bg-slate-800 border border-slate-700' 
                  : 'bg-pink-100 border border-pink-200'
              } w-[76px] sm:w-[100px] h-8 sm:h-9 shrink-0 shadow-3xs hover:scale-105 active:scale-95`}
              title={isFriendshipMode ? "Active: Besties Space. Click to switch to Couple Space! 💖" : "Active: Couple Space. Click to switch to Besties Space! 🌟"}
            >
              {/* Slider thumb */}
              <div 
                className={`absolute top-0.5 bottom-0.5 rounded-full shadow-xs transition-all duration-300 flex items-center justify-center ${
                  isFriendshipMode 
                    ? 'left-[38px] sm:left-[50px] right-0.5 bg-slate-900 text-teal-400' 
                    : 'left-0.5 right-[38px] sm:right-[50px] bg-white text-pink-600'
                }`}
              >
                {isFriendshipMode ? (
                  <Smile className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                ) : (
                  <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current animate-pulse" />
                )}
              </div>
              
              {/* Toggle text labels */}
              <div className="w-full flex justify-between px-2.5 text-[8.5px] sm:text-[10px] font-black uppercase pointer-events-none tracking-wider select-none">
                <span className={isFriendshipMode ? 'text-slate-500 opacity-40' : 'text-pink-700'}>Love</span>
                <span className={isFriendshipMode ? 'text-teal-400 font-extrabold' : 'text-pink-300/40'}>Bff</span>
              </div>
            </div>

            {/* Quick Settings Icon */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`p-2 sm:p-2.5 border ${themeStyles.isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white' : 'border-slate-200/80 hover:bg-slate-50 hover:border-slate-350 text-slate-600 hover:text-slate-800'} rounded-xl transition cursor-pointer shrink-0`}
              title="Settings & Connection Code"
              aria-label="Settings"
            >
              <Settings className="w-4.5 h-4.5" />
            </button>

            {/* Sign Out Button - Always visible, labeled and non-overlapping on all device viewports */}
            <button
              onClick={() => {
                onSignOut();
              }}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 border ${themeStyles.isDark ? 'border-indigo-900 bg-indigo-950/40 hover:bg-indigo-900/40 text-indigo-300' : 'border-rose-200 hover:border-rose-300 bg-rose-50/75 hover:bg-rose-100 text-rose-600 hover:text-rose-700'} rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-black shadow-3xs shrink-0`}
              title="Sign out of ForeverNote"
            >
              <LogOut className={`w-4 h-4 ${themeStyles.isDark ? 'text-indigo-400' : 'text-rose-500'}`} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Global categories navigation strip - displayed on ALL devices to prevent horizontal overflows in Row 1 */}
        <div className={`flex items-center justify-start sm:justify-center border-t ${themeStyles.isDark ? 'border-slate-800 bg-slate-900/50' : 'border-' + themeStyles.borderAccent + '/40 bg-slate-50/40'} py-2.5 px-3 text-xs font-bold overflow-x-auto gap-2.5 scrollbar-none snap-x whitespace-nowrap w-full border-b ${themeStyles.isDark ? 'border-slate-800' : 'border-' + themeStyles.borderAccent + '/30'} transition-all duration-300`}>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3 md:px-4 py-1.5 transition shrink-0 rounded-full snap-center text-[11px] font-extrabold flex items-center gap-1 ${
              activeTab === 'timeline' 
                ? `${themeStyles.primaryBg} text-white shadow-xs` 
                : themeStyles.isDark 
                ? 'bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                : 'bg-white border border-slate-200/50 text-slate-500 hover:text-slate-800'
            }`}
            title="Pristine diary log & map of your unforgettable milestones"
          >
            <span>🌸 Timeline Diary</span>
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-3 md:px-4 py-1.5 transition shrink-0 rounded-full snap-center text-[11px] font-extrabold flex items-center gap-1.5 relative ${
              activeTab === 'messages' 
                ? `${themeStyles.primaryBg} text-white shadow-xs` 
                : themeStyles.isDark 
                ? 'bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                : 'bg-white border border-slate-200/50 text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>💬 {isFriendshipMode ? "Bestie Messages" : "Secret Messages"}</span>
            {unreadMsgCount > 0 ? (
              <span className={`flex h-4 min-w-4 px-1 items-center justify-center ${themeStyles.isDark ? 'bg-indigo-500' : 'bg-pink-500'} text-white rounded-full text-[9px] font-black animate-pulse`}>
                {unreadMsgCount}
              </span>
            ) : profile?.connectedPartnerId ? (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${themeStyles.isDark ? 'bg-slate-900 text-slate-400' : 'bg-pink-50 text-pink-600'}`}>🔒</span>
            ) : null}
          </button>
          <button
            onClick={() => setActiveTab('interactive')}
            className={`px-3 md:px-4 py-1.5 transition shrink-0 rounded-full snap-center text-[11px] font-extrabold flex items-center gap-1 ${
              activeTab === 'interactive' 
                ? `${themeStyles.primaryBg} text-white shadow-xs` 
                : themeStyles.isDark 
                ? 'bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                : 'bg-white border border-slate-200/50 text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📋 {isFriendshipMode ? "Bestie Quest" : "Connection Quest"}</span>
          </button>
          <button
            onClick={() => setActiveTab('storyteller')}
            className={`px-3 md:px-4 py-1.5 transition shrink-0 rounded-full snap-center text-[11px] font-extrabold flex items-center gap-1 ${
              activeTab === 'storyteller' 
                ? `${themeStyles.primaryBg} text-white shadow-xs` 
                : themeStyles.isDark 
                ? 'bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                : 'bg-white border border-slate-200/50 text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>✍️ Storyteller's Quill</span>
          </button>
          <button
            onClick={() => setActiveTab('wishes')}
            className={`px-3 md:px-4 py-1.5 transition shrink-0 rounded-full snap-center text-[11px] font-extrabold flex items-center gap-1 ${
              activeTab === 'wishes' 
                ? `${themeStyles.primaryBg} text-white shadow-xs` 
                : themeStyles.isDark 
                ? 'bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                : 'bg-white border border-slate-200/50 text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🎁 {isFriendshipMode ? "Bestie Vault" : "Wishes & Vault"}</span>
          </button>
          <button
            onClick={() => setActiveTab('reminders')}
            className={`px-3 md:px-4 py-1.5 transition shrink-0 rounded-full snap-center text-[11px] font-extrabold flex items-center gap-1 ${
              activeTab === 'reminders' 
                ? `${themeStyles.primaryBg} text-white shadow-xs` 
                : themeStyles.isDark 
                ? 'bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                : 'bg-white border border-slate-200/50 text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📅 Reminders</span>
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-3 md:px-4 py-1.5 transition shrink-0 rounded-full snap-center text-[11px] font-extrabold flex items-center gap-1 ${
              activeTab === 'gallery' 
                ? `${themeStyles.primaryBg} text-white shadow-xs` 
                : themeStyles.isDark 
                ? 'bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                : 'bg-white border border-slate-200/50 text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📸 Cozy Gallery</span>
          </button>
        </div>
      </nav>

      {/* Main dashboard content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        
        {/* India DPDP Consent Withdrawn Restricted Alert Banner */}
        {!privacyConsent && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-300 text-amber-900 rounded-3xl p-5 shadow-xs space-y-3 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start gap-4">
              <div className="bg-amber-100 text-amber-700 p-3 rounded-2xl shrink-0">
                <AlertCircle className="w-6 h-6 shrink-0" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-extrabold text-sm text-amber-900 flex items-center gap-2">
                  <span>Consent Withdrawn (सहमति वापस ली गई)</span>
                  <span className="text-[10px] bg-amber-200 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">Restricted Mode</span>
                </h3>
                <p className="text-xs leading-relaxed text-amber-850 font-semibold max-w-4xl">
                  <strong>Notice under India DPDP Act, 2023:</strong> You have exercised your legal right to withdraw consent. Under Section 6(4) of the Act, we have ceased further active data collection and processing. Your shared timeline, memories, and messages are now in restricted <strong>Read-Only Mode</strong>. You can re-enable consent inside the <span className="underline font-bold cursor-pointer" onClick={() => setIsSettingsOpen(true)}>Configuration Panel</span> or request a complete, permanent erasure of all your personal data.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Real-time Connection Status Indicator */}
        <div id="connection-status-panel" className="relative">
          {isConnectionPanelCollapsed ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 border border-pink-100/60 rounded-2xl px-5 py-3 hover:border-pink-200 transition-all shadow-3xs select-none"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs text-slate-600 font-bold">
                  {profile?.connectedPartnerId ? (
                    <>Paired with partner <span className="font-extrabold text-pink-600 font-display">{profile?.partnerName || "Lover"}</span>. Connection secure.</>
                  ) : (
                    <>Interactive features locked — Waiting to pair with partner.</>
                  )}
                </span>
              </div>
              <button
                onClick={toggleConnectionPanel}
                className="text-[10px] uppercase font-black text-pink-600 hover:text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-100/40 px-3.5 py-1.5 rounded-full transition cursor-pointer select-none"
              >
                Show Pairing Controls ✨
              </button>
            </motion.div>
          ) : profile?.connectedPartnerId ? (
            /* CONNECTED STATE */
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-emerald-500/10 border border-emerald-200/85 rounded-3xl p-5 shadow-xs relative overflow-hidden"
            >
              {/* Background abstract overlay logic */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl border border-emerald-200/25 shadow-xs flex-shrink-0">
                    <UserCheck className="w-6 h-6 animate-bounce" style={{ animationDuration: '3s' }} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        Synchronized
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span>Connection Active &amp; Real-Time</span>
                      </div>
                    </div>
                    <h2 className="font-display font-black text-lg text-slate-900 flex items-center gap-1.5">
                      Connected to <span className="text-pink-600 underline decoration-pink-300 decoration-wavy decoration-2 underline-offset-4">{profile?.partnerName || "Your Partner"}</span> 💖
                    </h2>
                    <p className="text-slate-550 text-xs leading-relaxed max-w-2xl font-medium">
                      Your dashboards are perfectly paired! Timeline scrapbook stories, secret love notes, countdowns, and wishlists will update instantly across both devices.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center">
                  <div className="text-right hidden md:block mr-1">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">Partner Email</span>
                    <span className="text-xs font-black text-slate-700">{profile?.partnerEmail || "N/A"}</span>
                  </div>
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-355 text-slate-700 rounded-xl text-xs font-bold transition shadow-3xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Settings className="w-4 h-4" />
                    <span>View Relationship</span>
                  </button>
                  <button
                    onClick={toggleConnectionPanel}
                    className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-650 transition shadow-3xs cursor-pointer"
                    title="Minimize"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* WAITING STATE */
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-amber-500/5 via-rose-500/5 to-amber-500/10 border border-amber-200/80 rounded-3xl p-5 shadow-xs relative overflow-hidden"
            >
              {/* Background abstract overlay logic */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-full blur-2xl pointer-events-none" />
              
              {/* Corner Close button */}
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={toggleConnectionPanel}
                  className="p-2 hover:bg-amber-100/40 rounded-xl transition text-slate-400 hover:text-slate-600"
                  title="Minimize pairing deck"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-4 max-w-3xl">
                  <div className="flex items-start gap-4">
                    <div className="bg-amber-50 text-amber-600 p-3 rounded-2xl border border-amber-200/20 shadow-xs flex-shrink-0 relative">
                      <Clock className="w-6 h-6 animate-spin" style={{ animationDuration: '12s' }} />
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-450 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                      </span>
                    </div>
                    <div className="space-y-1 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                          Pending Connection
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-rose-500 font-bold bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                          </span>
                          <span>Waiting for partner...</span>
                        </div>
                      </div>
                      <h2 className="font-display font-black text-lg text-slate-900">
                        Awaiting Partner Connection
                      </h2>
                      <p className="text-slate-550 text-xs leading-relaxed font-medium">
                        To activate all couple features (Secret Chat, Connection Quest, Wish Vault, and Love Storyteller), pair your space with your loved one. Send your Invite code below!
                      </p>
                    </div>
                  </div>

                  {/* Share code block */}
                  <div className="space-y-3.5 pl-0 sm:pl-14 w-full text-left">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs text-slate-500 font-bold">Your Unique Invite Code:</span>
                      <div className="bg-white border border-rose-150 px-3.5 py-1.5 rounded-2xl text-xs font-black text-rose-600 flex items-center gap-1.5 shadow-2xs">
                        <span className="font-mono">{profile?.inviteCode || "FN-PENDING"}</span>
                        <button 
                          onClick={() => {
                            try {
                              navigator.clipboard.writeText(profile?.inviteCode || "");
                              showNotification("success", "Invite Connection code copied to your clipboard! Send it to your partner. 💌");
                            } catch (err) {
                              showNotification("error", "Failed to access clipboard automatically. Please copy the code text manually.");
                            }
                          }} 
                          title="Copy code" 
                          type="button"
                          className="text-rose-400 hover:text-rose-600 transition border-none bg-transparent"
                        >
                          <Copy className="w-4 h-4 inline-block cursor-pointer" />
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-rose-500/5 border border-rose-100 rounded-2xl max-w-xl space-y-2">
                      <span className="text-[10px] font-black uppercase text-rose-700 tracking-wider block">Shareable Connection Link (Preview Link)</span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                          className="bg-white border border-rose-200/60 text-xs rounded-xl px-3 py-2 w-full text-slate-700 font-mono focus:outline-hidden cursor-pointer"
                          value={getShareableUrl(profile?.inviteCode || "")}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              const directUrl = getShareableUrl(profile?.inviteCode || "");
                              navigator.clipboard.writeText(directUrl);
                              showNotification("success", "Direct connection link copied! Send it to your partner. 💖");
                            } catch (err) {
                              showNotification("success", "Click and highlight the direct box to copy! 💌");
                            }
                          }}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex-shrink-0 cursor-pointer shadow-3xs"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-550 leading-normal font-medium">
                        👉 <strong>Note for Testing:</strong> Since this applet is running inside a secure development workspace, we automatically route the link to your public <strong>Shared Preview URL</strong> domain (<span className="font-mono text-pink-600">ais-pre-..</span>) instead of the private dev domain so your partner can pair instantly! Click on the box to highlight and copy manually if the copy button fails.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick inline connect block directly inside the connection panel */}
                <div className="bg-white p-4.5 rounded-3xl border border-rose-100 shadow-3xs lg:w-[360px] w-full shrink-0 space-y-2 text-left">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block font-mono">Quick-Connect Portal</span>
                  
                  <form onSubmit={handleConnectWithPartnerCode} className="space-y-2">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 w-full focus:outline-hidden text-slate-850 font-black focus:bg-white transition"
                        placeholder="Partner's invite code or email"
                        value={connectCodeInput}
                        onChange={(e) => setConnectCodeInput(e.target.value)}
                      />
                      <button
                        type="submit"
                        disabled={connectLoading}
                        className="px-3.5 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-black rounded-xl transition shadow-3xs cursor-pointer flex-shrink-0"
                      >
                        {connectLoading ? "Pairing..." : "Connect"}
                      </button>
                    </div>
                  </form>
                  <p className="text-[9px] text-slate-450 font-bold leading-normal">
                    Input their invite code (e.g. <span className="font-mono text-slate-650">FN-ABCD99</span>) or registration email to connect instantly!
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* UNREAD SECRET MESSAGE INTERACTIVE ALERT BANNER */}
        {unreadMsgCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-linear-to-r from-pink-500 via-rose-500 to-pink-600 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4 cursor-pointer"
            onClick={() => setActiveTab('messages')}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-300/10 via-transparent to-transparent pointer-events-none" />
            <div className="flex items-center gap-4">
              <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20 animate-bounce" style={{ animationDuration: '2.5s' }}>
                <MessageSquare className="w-6 h-6 text-white fill-white/10" />
              </div>
              <div className="space-y-1 text-center md:text-left">
                <span className="text-[9px] font-black uppercase tracking-widest bg-white/20 text-white px-2.5 py-0.5 rounded-full inline-block">
                  Encrypted Beacon Unlocked 🔒
                </span>
                <h3 className="font-display font-black text-lg leading-tight flex items-center justify-center md:justify-start gap-1.5">
                  You have {unreadMsgCount} new secret {unreadMsgCount === 1 ? 'message' : 'messages'} from {profile?.partnerName || "your partner"}! 💌
                </h3>
                <p className="text-pink-50 text-xs">
                  Only the two of you hold the coordinates to decrypt these words. Click here to open and read them now.
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab('messages');
              }}
              className="px-5 py-2.5 bg-white text-pink-600 hover:bg-pink-50 font-black text-xs rounded-xl transition shadow-md shrink-0 cursor-pointer"
            >
              Decrypt &amp; Read 🔓
            </button>
          </motion.div>
        )}

        {/* Dynamic Countdown, Cinematic Video Player & Smart Notification Ribbon (Always shown at top) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Real-time Countdown clock */}
          <div className="lg:col-span-4 bg-slate-900 text-white rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/15 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex justify-between items-start mb-3">
              <div className="space-y-1">
                <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-pink-400 tracking-wider">
                  <Timer className="w-3.5 h-3.5 animate-pulse" /> Live Countdown
                </span>
                <p className="text-[11px] text-slate-300 font-semibold line-clamp-1">{countdownLabel}</p>
              </div>
              <Heart className="w-5 h-5 text-pink-500 fill-pink-500 animate-bounce" />
            </div>

            <div className="grid grid-cols-4 gap-2 py-4 bg-white/5 border border-white/5 rounded-2xl text-center">
              <div>
                <span className="block font-display font-black text-2xl text-white">{countdownText.days}</span>
                <span className="text-[9px] text-slate-400 uppercase font-black">Days</span>
              </div>
              <div>
                <span className="block font-display font-black text-2xl text-white">{countdownText.hours}</span>
                <span className="text-[9px] text-slate-400 uppercase font-black">Hours</span>
              </div>
              <div>
                <span className="block font-display font-black text-2xl text-white">{countdownText.minutes}</span>
                <span className="text-[9px] text-slate-400 uppercase font-black">Mins</span>
              </div>
              <div>
                <span className="block font-display font-black text-2xl text-pink-400">{countdownText.seconds}</span>
                <span className="text-[9px] text-slate-400 uppercase font-black">Secs</span>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <button
                onClick={() => setActiveTab('reminders')}
                className="w-full py-1.5 px-3 bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white rounded-xl text-xs font-bold leading-normal transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-pink-900/10"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Special Days Countdowns ({6 + activeMilestones.filter(m => m.description?.startsWith("[SPECIAL-COUNTDOWN]")).length})</span>
              </button>
              <div className="text-[9px] text-slate-400 font-medium flex justify-between items-center px-1">
                <span>⏰ Real-time syncing ticker</span>
                <span>📌 Choose &amp; pin target</span>
              </div>
            </div>
          </div>

          {/* Cinematic Memory Video Reel ("Right Place") */}
          <div className="lg:col-span-5 relative">
            <CinematicVideoPlayer 
              milestones={activeMilestones}
              profile={profile}
              user={user}
            />
          </div>

          {/* Dynamic Smart Notifications board */}
          <div className="lg:col-span-3 bg-white rounded-3xl p-5 border border-rose-100 shadow-sm flex flex-col justify-between">
            <div>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                <Bell className="w-3.5 h-3.5 text-purple-500" /> Notifications Board
              </span>
              
              <div className="space-y-2 max-h-[145px] overflow-y-auto pr-1">
                {dynamicNotifications.length > 0 ? (
                  dynamicNotifications.map((n) => (
                    <div 
                      key={n.key} 
                      className={`p-2.5 rounded-xl text-[11px] font-bold border flex items-center gap-2 ${
                        n.type === "today" 
                          ? 'bg-rose-50 border-rose-100 text-rose-800' 
                          : n.type === "tomorrow"
                          ? 'bg-purple-50 border-purple-100 text-purple-800'
                          : 'bg-slate-50 border-slate-150 text-slate-700'
                      }`}
                    >
                      <span className="text-sm shrink-0">{n.type === "today" ? "🎉" : n.type === "tomorrow" ? "❤️" : "💫"}</span>
                      <span className="line-clamp-2 leading-tight">{n.text}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-[10px] text-slate-450 py-4 text-center">No new notifications.</div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[8.5px] text-slate-400 font-medium font-mono text-right">
              Scrapbook Auto-feed
            </div>
          </div>
        </div>

        {/* CONNECTION CARD WARNING BANNER (If not connected yet) */}
        {!profile?.connectedPartnerId && (
          <div className={`p-6 rounded-3xl border border-pink-200 shadow-sm relative transition-all duration-300 ${
            connectSubTab === 'email' 
              ? 'bg-gradient-to-br from-slate-50 via-rose-50/10 to-white flex flex-col gap-6 lg:block lg:space-y-6' 
              : 'bg-linear-to-r from-pink-500/10 via-purple-500/5 to-indigo-500/10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center'
          }`}>
            
            {/* If Pair tab, show the classic message column & form column */}
            {connectSubTab === 'pair' && (
              <>
                <div className="md:col-span-7 space-y-2">
                  <h3 className="font-display font-black text-lg text-slate-900 flex items-center gap-2">
                    <span>💖 Invite &amp; Connect Your Special Person!</span>
                  </h3>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    To unlock your shared couple space timeline, secret chat boxes, and coordinate mutual wishes, you need to link your dashboards with your loved one.
                  </p>

                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-xs text-slate-400">Your Invitation Connection Code:</span>
                    <span className="bg-white border border-pink-200 px-3 py-1 rounded-xl text-xs font-black text-pink-600 block flex items-center gap-1 shadow-xs">
                      {profile?.inviteCode || "FN-PENDING"}
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(profile?.inviteCode || "");
                          showNotification("success", "Invitation Connection code copied! Send it to your partner. 💌");
                        }} 
                        title="Copy code" 
                        type="button"
                        className="text-pink-400 hover:text-pink-600 transition border-none bg-transparent"
                      >
                        <Copy className="w-3.5 h-3.5 ml-1 inline-block cursor-pointer" />
                      </button>
                    </span>
                  </div>
                </div>

                <div className="md:col-span-5 bg-white p-4.5 rounded-3xl border border-pink-100 shadow-sm space-y-3">
                  {/* Tab Selector inside styling */}
                  <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/60 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setConnectSubTab('pair')}
                      className={`flex-1 py-1.5 text-[11px] font-black rounded-xl transition cursor-pointer ${
                        connectSubTab === 'pair' 
                          ? 'bg-white text-pink-600 shadow-2xs' 
                          : 'text-slate-500 hover:text-slate-850'
                      }`}
                    >
                      🔗 Enter Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setConnectSubTab('email')}
                      className={`flex-1 py-1.5 text-[11px] font-black rounded-xl transition cursor-pointer ${
                        connectSubTab === 'email' 
                          ? 'bg-white text-pink-600 shadow-2xs' 
                          : 'text-slate-500 hover:text-slate-850'
                      }`}
                    >
                      📧 Email Invitation
                    </button>
                  </div>

                  <form onSubmit={handleConnectWithPartnerCode} className="space-y-3 pt-1">
                    {connectError && (
                      <div className="p-2 bg-red-50 border border-red-100 text-[10px] text-red-650 font-bold rounded-xl">{connectError}</div>
                    )}
                    {connectMessage && (
                      <div className="p-2 bg-emerald-50 border border-emerald-100 text-[10px] text-emerald-650 font-bold rounded-xl">{connectMessage}</div>
                    )}
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-450 block pb-0.5">Enter Partner's Invite Code</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 w-full focus:outline-hidden uppercase text-slate-850 font-black shadow-inner"
                          placeholder="e.g. FN-XYZ456"
                          value={connectCodeInput}
                          onChange={(e) => setConnectCodeInput(e.target.value)}
                        />
                        <button
                          type="submit"
                          disabled={connectLoading}
                          className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition shadow-xs cursor-pointer flex-shrink-0"
                        >
                          {connectLoading ? "Pairing..." : "Connect"}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </>
            )}

            {/* If Email invitation tab, expand to full width gorgeous interactive workspace */}
            {connectSubTab === 'email' && (
              <div className="space-y-6 w-full">
                {/* Header banner area */}
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-pink-100/60 pb-4 gap-4">
                  <div className="space-y-1">
                    <h3 className="font-display font-black text-xl text-slate-900 flex items-center gap-2">
                      <span>💌 Designer Invitation Studio</span>
                      <span className="bg-rose-100 text-rose-700 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-3xs animate-pulse">Pre-Design Presets Live</span>
                    </h3>
                    <p className="text-slate-500 text-xs">
                      Generate beautiful, highly customized invitations to replace boring emails. Send as a rich-styled card or a cozy ASCII-art handwritten letter!
                    </p>
                  </div>
                  
                  {/* Tab Selector back to pair button */}
                  <div className="flex bg-slate-200/60 p-1 rounded-2xl border border-slate-200 shadow-inner shrink-0 self-start md:self-auto font-sans">
                    <button
                      type="button"
                      onClick={() => setConnectSubTab('pair')}
                      className={`px-4 py-1.5 text-[11px] font-black rounded-xl transition cursor-pointer ${
                        connectSubTab === 'pair' 
                          ? 'bg-white text-pink-600 shadow-2xs' 
                          : 'text-slate-600 hover:text-slate-850'
                      }`}
                    >
                      🔗 Enter Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setConnectSubTab('email')}
                      className={`px-4 py-1.5 text-[11px] font-black rounded-xl transition cursor-pointer ${
                        connectSubTab === 'email' 
                          ? 'bg-white text-pink-600 shadow-2xs' 
                          : 'text-slate-600 hover:text-slate-850'
                      }`}
                    >
                      📧 Invite Studio
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Scribe Configuration Controller */}
                  <div className="lg:col-span-12 xl:col-span-5 bg-white p-5 rounded-3xl border border-pink-50 shadow-xs space-y-4">
                    <div className="border-b border-slate-150 pb-2">
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-pink-500" />
                        1. Select Designer Draft Style
                      </h4>
                      <p className="text-[10px] text-slate-400">Transform your standard cold invitation link with a beautiful story theme.</p>
                    </div>

                    {/* Highly Visual Design Template Selectors */}
                    <div className="grid grid-cols-2 gap-2 font-sans">
                      {[
                        { id: 'ticket', name: 'Boarding Pass 🎟️', desc: 'Direct flight ticket to our shared couple space.', bg: 'from-pink-500/10 to-rose-500/10 border-rose-200' },
                        { id: 'telegram', name: 'Retro Telegram 📜', desc: '1920s urgent vintage typewriter decree.', bg: 'from-amber-600/10 to-yellow-600/10 border-amber-200' },
                        { id: 'scrapbook', name: 'Cozy Scrapbook 🌸', desc: 'Flower sticker frames & handwritten details.', bg: 'from-fuchsia-500/10 to-pink-400/10 border-fuchsia-200' },
                        { id: 'cyber', name: 'Astro Cyber 🌌', desc: 'Glowing cosmic grid system coordinates.', bg: 'from-teal-500/10 to-sky-500/10 border-teal-200' },
                      ].map((tpl) => {
                        const isSelected = designTemplate === tpl.id;
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => {
                              setDesignTemplate(tpl.id as any);
                              // Sync matching paper & font defaults for best look
                              if (tpl.id === 'ticket') {
                                setPaperTheme('notebook');
                                setHandwritingFont('font-playpen');
                              } else if (tpl.id === 'telegram') {
                                setPaperTheme('parchment');
                                setHandwritingFont('font-architects');
                              } else if (tpl.id === 'scrapbook') {
                                setPaperTheme('notebook');
                                setHandwritingFont('font-caveat');
                              } else if (tpl.id === 'cyber') {
                                setPaperTheme('blueprint');
                                setHandwritingFont('font-sacramento');
                              }
                            }}
                            className={`p-3 rounded-2xl text-left border transition-all cursor-pointer select-none relative overflow-hidden flex flex-col justify-between h-[92px] ${
                              isSelected 
                                ? 'bg-gradient-to-br ' + tpl.bg + ' ring-2 ring-pink-500 border-transparent shadow-xs' 
                                : 'bg-slate-50/50 hover:bg-slate-50 border-slate-200/80 text-slate-700'
                            }`}
                          >
                            <span className="text-xs font-black text-slate-900 block">{tpl.name}</span>
                            <span className="text-[9px] text-slate-500 leading-normal line-clamp-2 block mt-1">{tpl.desc}</span>
                            {isSelected && (
                              <div className="absolute right-1 bottom-1 w-4 h-4 rounded-full bg-pink-500 text-white flex items-center justify-center text-[8px] font-bold">✓</div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="border-b border-rose-50/60 pt-2 pb-1">
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <span>⚙️</span>
                        2. Personalize Scribe Parameters
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 gap-2 font-sans">
                      {/* Recipient Email */}
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-extrabold text-slate-500 block">Dearest Partner's Email</label>
                        <input
                          type="email"
                          required
                          placeholder="dearest@example.com"
                          className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 w-full focus:outline-hidden text-slate-850 font-medium shadow-inner"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>

                      {/* Partner Nickname */}
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-extrabold text-slate-500 block">Sweet Nickname</label>
                        <input
                          type="text"
                          placeholder="e.g. Sweetheart, Babe"
                          className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 w-full focus:outline-hidden text-slate-850 font-medium shadow-inner"
                          value={partnerNickname}
                          onChange={(e) => setPartnerNickname(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Vibe tone picker */}
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-extrabold text-slate-500 block">Excitement Vibe &amp; Tone</label>
                      <div className="grid grid-cols-5 gap-1.5 font-sans">
                        {(['romantic', 'playful', 'cute', 'nostalgic', 'mysterious'] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setInviteVibe(v)}
                            className={`py-1.5 rounded-xl text-[10px] font-extrabold transition text-center capitalize border cursor-pointer ${
                              inviteVibe === v 
                                ? 'bg-pink-600 border-pink-600 text-white shadow-2xs' 
                                : 'bg-slate-50 border-slate-150 hover:bg-slate-100 text-slate-600'
                            }`}
                          >
                            <span>{v === 'romantic' ? '💖' : v === 'playful' ? '🤪' : v === 'cute' ? '🧸' : v === 'nostalgic' ? '⏳' : '🤫'}</span>
                            <span className="block text-[8px] font-black mt-0.5">{v}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Feature Highlight selection cards */}
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-extrabold text-slate-500 block">Highlights to feature in draft</label>
                      <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 shadow-inner font-sans">
                        {[
                          "Secret Love Messages ✨",
                          "Anniversary Countdown Reminders 🗓️",
                          "Private Memory scrapbooks 📖",
                          "Collaborative Wishes Wall 🌠",
                          "Cinematic Memory Video Reels 🎥"
                        ].map((h) => {
                          const isSelected = inviteHighlights.includes(h);
                          return (
                            <label key={h} className="flex items-center gap-2 text-[10px] font-extrabold text-slate-700 hover:text-slate-850 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    setInviteHighlights(inviteHighlights.filter(item => item !== h));
                                  } else {
                                    setInviteHighlights([...inviteHighlights, h]);
                                  }
                                }}
                                className="w-3.5 h-3.5 accent-pink-600 rounded border-slate-300 cursor-pointer"
                              />
                              <span>{h}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Trigger Generate Button */}
                    <button
                      type="button"
                      disabled={inviteGenLoading}
                      onClick={generateAiInvitationLetter}
                      className="w-full py-3 bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 hover:from-pink-700 hover:to-amber-600 text-white rounded-2xl text-xs font-black shadow-md shadow-pink-900/10 cursor-pointer select-none transition-all flex items-center justify-center gap-1.5"
                    >
                      {inviteGenLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Quill is Drafting Visual Pass...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Write Designer Draft ✍️</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Right Column: Immersive Beautiful Stationery Letter Preview & Quick Actions */}
                  <div className="lg:col-span-12 xl:col-span-7 flex flex-col gap-4">
                    
                    {/* Simulated Web Email Dashboard Window Wrapper */}
                    <div className="bg-slate-900/95 rounded-3xl border border-slate-800 shadow-xl overflow-hidden font-sans">
                      {/* Browser mock header dots & details */}
                      <div className="bg-slate-850 px-4 py-3 flex items-center justify-between border-b border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 block"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 block"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500 block"></span>
                          <span className="text-[10px] text-slate-450 font-bold font-mono ml-2 animate-pulse">gmail_composer_mockup.html</span>
                        </div>
                        <div className="bg-slate-800 px-3 py-1 rounded-lg text-[9px] text-emerald-400 font-extrabold flex items-center gap-1 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                          SECURE DRAFT PREVIEW
                        </div>
                      </div>

                      {/* Webmail composing headers */}
                      <div className="p-4 bg-slate-900 text-[11px] text-slate-300 border-b border-slate-800 space-y-2">
                        <div className="flex items-start">
                          <span className="w-14 text-slate-450 font-bold shrink-0">From:</span>
                          <span className="font-medium text-slate-200 font-mono text-[10px]">Your ForeverNote Studio Address &lt;{user?.email || 'me'}&gt;</span>
                        </div>
                        <div className="flex items-start">
                          <span className="w-14 text-slate-450 font-bold shrink-0">To:</span>
                          <span className="font-bold text-pink-350 font-mono text-[10px]">{inviteEmail || ' partner@recipient.com (Enter in left column)'}</span>
                        </div>
                        <div className="flex items-start">
                          <span className="w-14 text-slate-450 font-bold shrink-0">Subject:</span>
                          <span className="font-black text-slate-100 italic">✨ Special Invitation: {inviteSubject}</span>
                        </div>
                      </div>

                      {/* Live Selector Segment tabs between Graphic layout and Plain text */}
                      <div className="flex bg-slate-950 p-1 divide-x divide-slate-850 border-b border-slate-850">
                        <button
                          type="button"
                          onClick={() => setPreviewFormatTab('rich')}
                          className={`flex-1 py-2 text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition ${
                            previewFormatTab === 'rich'
                              ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-inner'
                              : 'text-slate-450 hover:text-slate-200'
                          }`}
                        >
                          <span>🎨 Interactive Designed HTML Card</span>
                          <span className="bg-white/15 px-1.5 py-0.5 rounded text-[8px]">New</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewFormatTab('ascii')}
                          className={`flex-1 py-2 text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition ${
                            previewFormatTab === 'ascii'
                              ? 'bg-gradient-to-r from-slate-850 to-slate-900 text-slate-100 shadow-inner'
                              : 'text-slate-450 hover:text-slate-200'
                          }`}
                        >
                          <span>✍️ Cozy ASCII Cursive Notepad</span>
                        </button>
                      </div>

                      {/* Display Screen */}
                      <div className="bg-[#121c2c] p-6 min-h-[420px] flex flex-col justify-center">
                        
                        {previewFormatTab === 'rich' ? (
                          <div className="space-y-4">
                            {/* Tips notification */}
                            <div className="bg-pink-950/40 border border-pink-900/40 rounded-xl p-3 text-[10px] text-pink-250 leading-relaxed font-sans">
                              💡 <strong>GMAIL PRO COPILY TIP:</strong> Copy the designed card directly by pressing the pink button below, then simply <strong>Paste (Ctrl+V)</strong> directly into Gmail compose window! Gmail will parse the rich gradients, custom boarding stub buttons, and stellar frames beautifully in real-time!
                            </div>

                            {/* Safe iframe previewing self-contained styling */}
                            <div className="border-4 border-slate-950 rounded-2xl overflow-hidden bg-white shadow-inner h-[400px]">
                              <iframe
                                title="designed-email-iframe"
                                srcDoc={`
                                  <html>
                                    <head>
                                      <meta charset="utf-8">
                                      <style>
                                        body { margin: 0; background-color: #f1f5f9; padding: 2px; }
                                      </style>
                                    </head>
                                    <body>
                                      ${inviteHtml || getDefaultHtmlTemplate(profile?.inviteCode || "FN-CONNECT", profile?.displayName || user?.displayName || "Me", partnerNickname || "my favorite human", designTemplate, window.location.origin)}
                                    </body>
                                  </html>
                                `}
                                className="w-full h-full border-0 select-none pointer-events-none"
                              />
                            </div>
                          </div>
                        ) : (
                          <div 
                            style={
                              paperTheme === 'notebook' 
                                ? { 
                                    backgroundImage: "repeating-linear-gradient(#fffdf0 0px, #fffdf0 27px, #e9e3c9 27px, #e9e3c9 28px)",
                                    backgroundAttachment: "local"
                                  }
                                : paperTheme === 'blueprint'
                                ? {
                                    backgroundSize: '24px 24px',
                                    backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)'
                                  }
                                : undefined
                            }
                            className={`relative rounded-3xl p-6 pb-12 shadow-lg border outline-hidden transition-all duration-300 min-h-[385px] flex flex-col justify-between ${
                              paperTheme === 'notebook'
                                ? 'bg-[#fffdf0] border-amber-100 text-slate-700'
                                : paperTheme === 'parchment'
                                ? 'bg-amber-50/70 border-4 border-double border-amber-600/35 text-stone-850 shadow-amber-900/5'
                                : paperTheme === 'blueprint'
                                ? 'bg-[#1e3450] border-sky-800 text-sky-100 shadow-inner'
                                : 'bg-[#fefcf7] border-4 border-dashed border-stone-200/90 text-blue-850 shadow-2xs'
                            }`}
                          >
                            {/* Notebook top golden margin strips */}
                            {paperTheme === 'notebook' && (
                              <div className="absolute top-0 left-0 right-0 h-6 bg-amber-150 border-b border-amber-200/80 pointer-events-none" />
                            )}
                            
                            {/* Notebook vertical margins red lines */}
                            {paperTheme === 'notebook' && (
                              <div className="absolute top-0 bottom-0 left-12 w-0.5 bg-red-300/40 pointer-events-none" />
                            )}

                            {/* Blueprint header coords */}
                            {paperTheme === 'blueprint' && (
                              <div className="absolute top-2 left-4 text-[8px] font-mono opacity-40 select-none pointer-events-none text-sky-300">
                                COMPONENT_LAYOUT_DUMP_V1
                              </div>
                            )}

                            {/* Content editable writing area */}
                            <div className="space-y-4 pt-4 h-full flex flex-col justify-start">
                              {/* Invitation connection details stamp tag top-right */}
                              <div className="self-end z-10 p-2 border-2 border-dashed border-pink-400/40 rounded-xl bg-white/40 text-[9px] font-black uppercase text-pink-600 tracking-wider rotate-3 font-mono">
                                🔑 Code stamp: {profile?.inviteCode || "PENDING"}
                              </div>

                              {/* Editable Invitation letter input text */}
                              <textarea
                                rows={11}
                                style={
                                  paperTheme === 'notebook' 
                                    ? { lineHeight: '28px', paddingTop: '10px' } 
                                    : { lineHeight: '1.6' }
                                }
                                className={`w-full bg-transparent border-0 focus:outline-hidden focus:ring-0 leading-normal resize-none ${handwritingFont} ${
                                  paperTheme === 'notebook'
                                    ? 'pl-8 text-[14px] font-black tracking-wide text-slate-700 select-all'
                                    : paperTheme === 'parchment'
                                    ? 'text-[15px] font-extrabold tracking-wide text-stone-850 select-all'
                                    : paperTheme === 'blueprint'
                                    ? 'text-[13px] font-extrabold text-[#90caf9] select-all font-mono'
                                    : 'text-[14px] font-black text-blue-900 select-all'
                                }`}
                                value={inviteMessage}
                                onChange={(e) => setInviteMessage(e.target.value)}
                              />
                            </div>

                            {/* Soft closing handwriting signature label */}
                            <div className={`text-right pr-4 text-[10px] font-bold leading-normal select-none pointer-events-none mt-2 opacity-50`}>
                              - generated with 🌟 from ForeverNote Draft Studio -
                            </div>
                          </div>
                        )}

                      </div>
                    </div>

                    {/* Quick Launch & Distribution Suite buttons */}
                    <div className="space-y-2 font-sans">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        
                        {/* Copy the selected format for Gmail */}
                        {previewFormatTab === 'rich' ? (
                          <button
                            type="button"
                            onClick={handleCopyRichHtmlClipboard}
                            className="py-3.5 px-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white text-xs font-black rounded-2xl transition-all shadow-md shadow-pink-900/15 cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01]"
                          >
                            <span className="text-sm">📋</span>
                            <span>Copy Designed Card (Ready for Gmail)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleCopyEmailInvite}
                            className="py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-2xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01]"
                          >
                            <span className="text-sm">📋</span>
                            <span>Copy Plain-Text &amp; ASCII letter</span>
                          </button>
                        )}
                        
                        {/* Gmail specific launch draft */}
                        <button
                          type="button"
                          onClick={(e) => handleSendEmailInvite(e, 'gmail')}
                          className="py-3.5 px-4 bg-[#ea4335] hover:bg-[#d93025] text-white text-xs font-black rounded-2xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01]"
                        >
                          <span className="text-sm">📨</span>
                          <span>Launch Gmail Composer tab</span>
                        </button>
                        
                      </div>

                      {/* Additional Helper info banner */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2 text-[10.5px] text-slate-500">
                        <Info className="w-4 h-4 text-slate-450 shrink-0 mt-0.5" />
                        <div>
                          <strong>Gmail compatibility note:</strong> Both methods work effortlessly. Standard mail copy drafts clean plain text with customized ASCII stars. Selecting <strong>HTML Card Copy</strong> and typing Ctrl+V inside your Gmail compose area pastes beautiful ticket structures. Enter key in pairing module to register.
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            )}

          </div>
        )}

        {/* Dynamic subtabs viewports */}
        <AnimatePresence mode="wait">

          {/* TAB 1: TIMELINE SCRAPBOOK & LOGBOOK */}
          {activeTab === 'timeline' && (
            <motion.div
              key="timeline-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Counter panels with stats / live countdown area */}
              <ReusableStatsCounter
                profile={profile}
                milestones={timelineMilestones}
                remindersCount={reminders.length}
                globalGuestVisits={globalGuestVisits}
                myGuestVisits={myGuestVisits}
              />

              {/* Unique design to view in timeline scrapbook area */}
              <MilestoneMap
                milestones={timelineMilestones}
                reminders={reminders}
                selectedTypeFilter={selectedTypeFilter}
                onSelectedTypeFilterChange={setSelectedTypeFilter}
                onAddMilestoneClick={() => { setEditingMilestone(null); setIsFormOpen(true); }}
                onEditMilestone={(m) => { setEditingMilestone(m); setIsFormOpen(true); }}
                onViewLetter={(m) => { setActiveLetterMilestone(m); setIsLetterOpen(true); }}
                onDeleteMilestone={handleDeleteMilestone}
                onSaveReminder={handleSaveReminder}
              />
            </motion.div>
          )}

          {/* TAB 2: PRIVATE SECRET CHAT & MESSAGE CARDS */}
          {activeTab === 'messages' && (
            <motion.div
              key="messages-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch"
            >
              
              {/* Message Composer Card */}
              <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-rose-100 shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-pink-50 text-pink-600 p-2 rounded-xl">
                      <MessageSquare className="w-5 h-5 fill-pink-50" />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-lg text-slate-900 leading-none">Secret Message Cards</h3>
                      <p className="text-slate-500 text-[10px]">Send private emotion cards to your loved one</p>
                    </div>
                  </div>

                  <p className="text-slate-600 text-xs leading-relaxed font-medium">
                    Send secret messages to someone special. Only the sender and receiver can read the messages securely inside the website. Choose your theme, write your secret feeling, and deploy!
                  </p>

                  <form onSubmit={handleSendSecretMessage} className="space-y-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Select Card Style Theme</label>
                      <select
                        value={selectedMsgStyle}
                        onChange={(e) => setSelectedMsgStyle(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-hidden font-bold cursor-pointer"
                      >
                        <option value="Romantic Rose 🌹">Romantic Rose Theme 🌹</option>
                        <option value="Cozy Lavender 🪻">Cozy Lavender Theme 🪻</option>
                        <option value="Champagne Gold 🥂">Champagne Gold Theme 🥂</option>
                        <option value="Secret Midnight 🌌">Secret Midnight Theme 🌌</option>
                        <option value="Cute Sunshine ☀️">Cute Sunshine Theme ☀️</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Your Secret Message Content</label>
                      <textarea
                        required
                        className="w-full bg-slate-55 border border-slate-200 text-xs rounded-xl px-3 py-2 w-full focus:outline-hidden min-h-[140px] focus:bg-white"
                        placeholder="Write something emotional and private..."
                        value={newMsgText}
                        onChange={(e) => setNewMsgText(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={sendMsgLoading || !profile?.connectedPartnerId}
                      className="w-full py-3 bg-pink-500 hover:bg-pink-600 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{sendMsgLoading ? "Encrypting Note..." : "Deploy Secret Message Card"}</span>
                    </button>
                    
                    {!profile?.connectedPartnerId && (
                      <p className="text-[10px] text-red-500 text-center font-bold">⚠️ Connection code pairing required before sending messages!</p>
                    )}
                  </form>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
                  🔒 Highly Secure: Messages are dynamically fetched using verified partner ID snapshots.
                </div>
              </div>

              {/* Secure Chat Stream Viewport */}
              <div className="lg:col-span-7 bg-linear-to-b from-slate-100 via-white to-slate-50 border border-slate-250/50 rounded-3xl p-6 shadow-xs flex flex-col justify-between min-h-[500px]">
                <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>🔒 End-to-End Chat Vault</span>
                  <span>Active Live Feed</span>
                </div>

                {/* DYNAMIC REAL-TIME CONNECTION QUEST MODULE */}
                <div className="bg-linear-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-2xl p-4.5 mb-4 space-y-3 relative overflow-hidden">
                  <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-10">
                    <Heart className="w-24 h-24 text-teal-600 fill-teal-500 animate-pulse" />
                  </div>
                  
                  {activeQuest ? (
                    <div className="space-y-3 relative z-10 w-full">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase text-teal-700 bg-teal-100/80 rounded-md">
                          ⚡ ACTIVE CONNECTION QUEST
                        </span>
                        <span className="text-[9px] font-bold text-teal-600 uppercase">
                          {activeQuest.prompt.category}
                        </span>
                      </div>
                      
                      <p className="text-slate-800 text-xs font-bold leading-relaxed">
                        "{activeQuest.prompt.text}"
                      </p>

                      {/* Quest Answer inputs or statuses */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[10px]">
                        {/* MY ANSWER STATUS */}
                        <div className="bg-white/80 border border-white p-2.5 rounded-xl flex flex-col justify-between">
                          <span className="font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                            Your status
                          </span>
                          {activeQuest.myStatus ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 font-extrabold py-1.5">
                              <CheckCircle className="w-4 h-4 fill-emerald-50" />
                              <span>Answer Locked 🔒</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <input 
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 text-[11px] rounded-lg px-2.5 py-1.5 focus:outline-hidden text-slate-800"
                                placeholder="Type your secret thoughts..."
                                value={draftQuestAnswer}
                                onChange={(e) => setDraftQuestAnswer(e.target.value)}
                              />
                              <button
                                onClick={handleLockInQuestAnswer}
                                disabled={lockingQuestAnswer || !draftQuestAnswer.trim()}
                                className="w-full py-1.5 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg transition text-[9px] flex items-center justify-center gap-1 cursor-pointer shadow-3xs"
                              >
                                <Lock className="w-3 h-3" />
                                <span>{lockingQuestAnswer ? "Locking..." : "Lock In Secret 🔒"}</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* PARTNER ANSWER STATUS */}
                        <div className="bg-white/80 border border-white p-2.5 rounded-xl flex flex-col justify-between">
                          <span className="font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                            {profile?.partnerName || "Partner"}'s status
                          </span>
                          {activeQuest.partnerStatus ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 font-extrabold py-1.5">
                              <CheckCircle className="w-4 h-4 fill-emerald-50" />
                              <span>Answer Locked 🔒</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-amber-600 font-bold py-2">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin mr-0.5" />
                              <span>Awaiting Answer ⏳</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* IF BOTH ANSWERED - REVEAL DECRYPTION */}
                      {activeQuest.myStatus && activeQuest.partnerStatus && (
                        <div className="bg-teal-500 text-white p-3 rounded-xl space-y-2 mt-2 shadow-2xs">
                          <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider">
                            <span>🔓 Quest Decrypted!</span>
                            <span className="bg-white/25 px-1.5 py-0.5 rounded-sm">Pair Success</span>
                          </div>
                          <div className="space-y-1.5 font-sans divide-y divide-white/10 pt-1 text-[11px]">
                            <div>
                              <strong className="text-teal-100 uppercase text-[9px] block">Your secret Answer</strong>
                              <p className="italic font-bold">"{activeQuest.myStatus.text}"</p>
                            </div>
                            <div className="pt-1.5">
                              <strong className="text-teal-100 uppercase text-[9px] block">{profile?.partnerName || "Partner"}'s secret Answer</strong>
                              <p className="italic font-bold">"{activeQuest.partnerStatus.text}"</p>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => setActiveTab('interactive')}
                            className="w-full mt-2.5 py-1.5 bg-white text-teal-600 hover:bg-teal-50 font-black text-[10px] rounded-lg transition text-center cursor-pointer shadow-3xs"
                          >
                            🏺 Jointly Seal into Scrapbook Timeline 🏺
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
                      <div className="space-y-1 text-center sm:text-left">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[8px] font-black uppercase text-emerald-700 bg-emerald-100/80 rounded-md">
                          💎 Connection Quest Catalyst
                        </span>
                        <h4 className="font-display font-bold text-slate-800 text-xs mt-1">
                          No active Intimacy Quest selected yet
                        </h4>
                        <p className="text-[10px] text-slate-500 max-w-xs font-semibold leading-normal">
                          Trigger an intentional relationship prompt to test your partner's mind in real-time!
                        </p>
                      </div>

                      {/* Dropdown prompt selector */}
                      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-3xs w-full sm:w-auto">
                        <select
                          disabled={!profile?.connectedPartnerId}
                          onChange={(e) => {
                            if (e.target.value) {
                              handleSelectQuestPrompt(e.target.value);
                              e.target.value = ""; // reset selection
                            }
                          }}
                          className="bg-transparent focus:outline-hidden text-slate-700 font-bold text-[10px] cursor-pointer w-full"
                          defaultValue=""
                        >
                          <option value="" disabled>⚡ Choose active Prompt...</option>
                          {PRESET_PROMPTS.map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.category}] {p.text}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Messages list container */}
                <div className="flex-grow space-y-4 overflow-y-auto max-h-[440px] pr-2 custom-scrollbar">
                  {allLoveMessages.length > 0 ? (
                    allLoveMessages.map((msg: any) => {
                      const isMe = msg.senderId === user.uid;
                      const msgStyle = msg.style || "Romantic Rose 🌹";
                      
                      if (msgStyle === "QuestState") {
                        let cleanText = msg.text || "";
                        cleanText = cleanText.replace(/\[QUEST_INIT\]/, "").replace(/\[PROMPT_ID\]\s*[a-zA-Z0-9_\-]+/, "").trim();
                        return (
                          <div key={msg.id} className="flex flex-col items-center w-full my-2 animate-fade-in">
                            <div className="w-full max-w-md bg-linear-to-r from-emerald-500 via-teal-500 to-teal-600 text-white p-4.5 rounded-2xl shadow-md text-center space-y-2 relative overflow-hidden flex flex-col items-center">
                              <span className="text-[8px] uppercase tracking-widest font-black bg-white/25 text-teal-100 px-2 py-0.5 rounded-full inline-block select-none">
                                ⚡ Intimacy Catalyst Prompt Triggered
                              </span>
                              <p className="text-xs font-black leading-relaxed italic">"{cleanText}"</p>
                              <div className="text-[9.5px] text-teal-100/95 flex gap-1 items-center font-bold mt-1 select-none">
                                <span>Selected by {isMe ? "You" : profile?.partnerName || "Partner"}</span>
                                <span>•</span>
                                <span>Real-time Active 🌐</span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (msgStyle === "QuestAnswer") {
                        let pIdMatch = msg.text.match(/\[PROMPT_ID\]\s*([a-zA-Z0-9_\-]+)/);
                        let promptId = pIdMatch ? pIdMatch[1] : "";
                        
                        // Check if both answered in this conversation stream
                        let myAns = allLoveMessages.find((m: any) => m.style === "QuestAnswer" && m.senderId === user.uid && m.text.includes(`[PROMPT_ID] ${promptId}`));
                        let partnerAns = profile?.connectedPartnerId ? allLoveMessages.find((m: any) => m.style === "QuestAnswer" && m.senderId === profile.connectedPartnerId && m.text.includes(`[PROMPT_ID] ${promptId}`)) : null;
                        
                        let isResolved = !!(myAns && partnerAns);
                        let answerText = msg.text.replace(/\[ANSWER\]/, "").replace(/\[PROMPT_ID\]\s*[a-zA-Z0-9_\-]+/, "").trim();
                        
                        if (isMe) {
                          return (
                            <div key={msg.id} className="flex flex-col items-end w-full animate-fade-in">
                              <div className="max-w-md bg-linear-to-r from-slate-800 via-slate-850 to-slate-900 border border-slate-705 text-slate-100 p-4 rounded-2xl shadow-md rounded-tr-none space-y-2">
                                <span className="text-[8px] uppercase tracking-widest font-black bg-white/10 text-slate-300 px-2 py-0.5 rounded-full inline-block select-none">
                                  🔒 Your Locked Secret response
                                </span>
                                <p className="text-xs italic leading-relaxed">"{answerText}"</p>
                                <div className="text-[9px] text-slate-400/90 flex justify-between items-center gap-6 font-bold select-none">
                                  <span>Sent by: You</span>
                                  <span>{isResolved ? "🔓 Decrypted" : "⏳ Peer answer required"}</span>
                                </div>
                              </div>
                            </div>
                          );
                        } else {
                          if (isResolved) {
                            return (
                              <div key={msg.id} className="flex flex-col items-start w-full animate-fade-in">
                                <div className="max-w-md bg-linear-to-r from-teal-500 to-emerald-500 text-white p-4 rounded-2xl shadow-md rounded-tl-none space-y-2">
                                  <span className="text-[8px] uppercase tracking-widest font-black bg-white/20 text-teal-100 px-2 py-0.5 rounded-full inline-block select-none">
                                    🔓 Decrypted Partner Secret
                                  </span>
                                  <p className="text-xs italic leading-relaxed">"{answerText}"</p>
                                  <div className="text-[9px] text-teal-100/90 flex justify-between items-center gap-6 font-bold select-none">
                                    <span>Sent by: {profile?.partnerName || "Partner"}</span>
                                    <span>🔓 Decrypted</span>
                                  </div>
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div key={msg.id} className="flex flex-col items-start w-full animate-fade-in">
                                <div className="max-w-md bg-linear-to-b from-slate-205 to-slate-100 border border-slate-300 text-slate-700 p-4 rounded-2xl shadow-sm rounded-tl-none space-y-2">
                                  <div className="flex items-center gap-1.5 text-slate-600 font-extrabold select-none">
                                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[8px] uppercase tracking-widest font-black bg-slate-300 text-slate-800 px-2 py-0.5 rounded-full">
                                      🔒 Encrypted Partner Answer
                                    </span>
                                  </div>
                                  <p className="text-xs font-semibold select-none filter blur-xs leading-normal opacity-40">
                                    This message contains confidential thoughts that are sealed content.
                                  </p>
                                  <div className="text-[9px] text-slate-500 pt-1.5 border-t border-slate-200 flex justify-between items-center gap-6 font-bold select-none">
                                    <span>Sent by: {profile?.partnerName || "Partner"}</span>
                                    <span className="text-rose-500 font-black flex items-center gap-0.5">
                                      <Heart className="w-3 h-3 fill-rose-50 animate-pulse" /> Answer quest to unlock!
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        }
                      }

                      // Assign style theme colors based on style choice
                      let themeClass = "from-pink-500 to-rose-500 text-white";
                      if (msgStyle.includes("Lavender")) themeClass = "from-purple-500 via-indigo-500 to-slate-900 text-white";
                      else if (msgStyle.includes("Gold")) themeClass = "from-amber-400 to-yellow-600 text-white";
                      else if (msgStyle.includes("Midnight")) themeClass = "from-slate-950 via-[#1E1E2F] to-slate-900 text-white border border-slate-800";
                      else if (msgStyle.includes("Sunshine")) themeClass = "from-amber-400 to-orange-400 text-slate-900";

                      return (
                        <div 
                          key={msg.id} 
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div className={`max-w-md bg-gradient-to-r ${themeClass} p-4 rounded-2xl shadow-md ${isMe ? 'rounded-tr-none' : 'rounded-tl-none'} space-y-2`}>
                            <span className="text-[8px] uppercase font-bold tracking-widest bg-white/20 text-white px-2 py-0.5 rounded-full inline-block">
                              {msgStyle}
                            </span>
                            <p className="text-sm italic break-words whitespace-pre-wrap leading-relaxed">"{msg.text}"</p>
                            <div className="text-[9px] text-white/70 flex justify-between font-bold items-center gap-6">
                              <span>Sent by: {isMe ? "You" : profile?.partnerName || "Partner"}</span>
                              <span>🔒 Decrypted</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center py-20 space-y-3">
                      <span className="text-3xl">💌</span>
                      <p className="text-slate-400 text-xs font-semibold">No secret messages recorded inside this couple room.</p>
                      <p className="text-[10px] text-slate-400 max-w-xs mx-auto">Write your first encrypted emotion card using the composer on the left!</p>
                    </div>
                  )}

                  {partnerTyping && (
                    <div className="flex flex-col items-start animate-fade-in">
                      <div className="max-w-md bg-slate-100 border border-slate-205 text-slate-800 p-3.5 rounded-2xl rounded-tl-none shadow-xs space-y-1">
                        <span className="text-[8.5px] uppercase font-bold tracking-wider text-pink-600 block animate-pulse">
                          {profile?.partnerName || "Partner"}
                        </span>
                        <div className="flex items-center gap-1.5 py-1">
                          <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          <span className="text-slate-400 text-[10px] ml-1 font-semibold">is drafting a response...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-center pt-4 border-t border-slate-200 text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" /> Only connected partner has private key access to read files.
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: INTERACTIVE CONNECTION QUEST ROOM */}
          {activeTab === 'interactive' && (
            <motion.div
              key="interactive-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <InteractiveConnectionRoom 
                user={user} 
                profile={profile} 
                milestones={activeMilestones}
              />
            </motion.div>
          )}

          {/* TAB 5: STORYTELLER CREATIVE JOURNAL & MEMOIRS */}
          {activeTab === 'storyteller' && (
            <motion.div
              key="storyteller-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <StorytellerQuill
                user={user}
                profile={profile}
                milestones={activeMilestones}
                onSaveStory={async (title, storyData, refinedContent) => {
                  try {
                    const mId = `story_${Date.now()}`;
                    await setDoc(doc(db, "milestones", mId), {
                      userId: user.uid,
                      title: title,
                      type: "Custom",
                      date: new Date().toISOString().split("T")[0],
                      description: `[STORYTELLER]${JSON.stringify(storyData)}`,
                      generatedLetter: refinedContent,
                      createdAt: serverTimestamp()
                    });
                  } catch (err: any) {
                    console.error("Error creating storyteller story:", err);
                    handleFirestoreError(err, OperationType.CREATE, "milestones");
                  }
                }}
                onUpdateStoryReactions={async (storyId, reactions) => {
                  try {
                    const storyRef = doc(db, "milestones", storyId);
                    const existingStory = milestones.find(m => m.id === storyId);
                    if (!existingStory) return;
                    let storyDataStr = existingStory.description;
                    if (storyDataStr.startsWith("[STORYTELLER]")) {
                      storyDataStr = storyDataStr.replace("[STORYTELLER]", "").trim();
                    }
                    const parsed = JSON.parse(storyDataStr);
                    parsed.reactions = reactions;

                    await updateDoc(storyRef, {
                      description: `[STORYTELLER]${JSON.stringify(parsed)}`
                    });
                  } catch (err: any) {
                    console.error("Error updating reactions:", err);
                    handleFirestoreError(err, OperationType.UPDATE, `milestones/${storyId}`);
                  }
                }}
                onDeleteStory={handleDeleteMilestone}
              />
            </motion.div>
          )}

          {/* TAB 3: UPLOAD WISHES & MEMORY CRYPTO-VAULT */}
          {activeTab === 'wishes' && (
            <motion.div
              key="wishes-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              
              {/* Wishes header controls */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-linear-to-r from-amber-500/10 to-pink-500/10 p-6 rounded-3xl border border-amber-200/50 mb-4 shadow-2xs">
                <div className="space-y-1">
                  <h3 className="font-display font-black text-slate-900 text-xl flex items-center gap-1.5">
                    <span>Upload Wishes &amp; Romantic Scrapbooks</span>
                    <FileText className="w-5 h-5 text-amber-500" />
                  </h3>
                  <p className="text-xs text-slate-650 leading-relaxed font-sans max-w-2xl font-medium">
                    Store and lock digital assets like letters, voice note simulations, polaroids, videos, romantic wishes, and friendship memories in your private vault collection.
                  </p>
                </div>
                
                <button
                  onClick={() => setWishFormOpen(true)}
                  className="px-4.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Lock Wish / Memory</span>
                </button>
              </div>

              {/* Wish Submission Dialog Popup */}
              <AnimatePresence>
                {wishFormOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
                      onClick={() => setWishFormOpen(false)}
                    />

                    <motion.div
                      initial={{ y: 20, scale: 0.95 }}
                      animate={{ y: 0, scale: 1 }}
                      exit={{ y: 20, scale: 0.95 }}
                      className="relative bg-white rounded-3xl p-6 md:p-8 border border-amber-200/50 shadow-2xl max-w-md w-full z-10 max-h-[88vh] overflow-y-auto"
                    >
                      <button
                        onClick={() => setWishFormOpen(false)}
                        className="absolute top-5 right-5 p-2 hover:bg-stone-50 rounded-xl transition cursor-pointer"
                      >
                        <X className="w-5 h-5 text-gray-450 hover:text-red-500" />
                      </button>

                      <div className="flex items-center gap-2 mb-6">
                        <div className="bg-amber-100 text-amber-600 p-2 rounded-xl">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-display font-extrabold text-lg text-slate-900 leading-none">Vault Locker</h3>
                          <p className="text-slate-500 text-[10px]">Lock private media files &amp; wishes</p>
                        </div>
                      </div>

                      <form onSubmit={handleSaveWish} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Memory Title</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Birthday Voice Note from Chloe"
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-hidden"
                            value={wishTitle}
                            onChange={(e) => setWishTitle(e.target.value)}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attachment Type</label>
                          <select
                            value={wishType}
                            onChange={(e: any) => setWishType(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-hidden font-semibold cursor-pointer"
                          >
                            <option value="letter">💌 Love Letter</option>
                            <option value="photo">📸 Polaroid Photo Attachment</option>
                            <option value="voice">🎙️ Voice Note Recording</option>
                            <option value="video">🎥 Cute Video link</option>
                            <option value="wish">💝 Romantic Wishing card</option>
                            <option value="friendship">✨ Friendship Memories</option>
                          </select>
                        </div>

                        {wishType === 'photo' && (
                          <div className="space-y-1.5" id="vault-photo-upload-section">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Optional Polaroid Photo Upload
                            </label>

                            {wishMediaUrl ? (
                              <div className="relative aspect-video rounded-2xl overflow-hidden border border-purple-200 shadow-xs group bg-slate-50">
                                <img
                                  src={wishMediaUrl}
                                  alt="Vault attachment preview"
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setWishMediaUrl("")}
                                    className="px-3.5 py-1.5 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer border-none"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Remove Image</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                onDragOver={(e) => { e.preventDefault(); setVaultDragOver(true); }}
                                onDragLeave={() => setVaultDragOver(false)}
                                onDrop={async (e) => {
                                  e.preventDefault();
                                  setVaultDragOver(false);
                                  const files = e.dataTransfer.files;
                                  if (files && files[0]) {
                                    await processVaultFile(files[0]);
                                  }
                                }}
                                onClick={() => document.getElementById("vault-file-input")?.click()}
                                className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                  vaultDragOver
                                    ? "border-purple-400 bg-purple-50/55"
                                    : "border-stone-200 hover:border-purple-350 hover:bg-stone-50/50 bg-stone-50"
                                }`}
                              >
                                <input
                                  id="vault-file-input"
                                  type="file"
                                  accept="image/*"
                                  onChange={handleVaultFileChange}
                                  className="hidden"
                                />
                                <div className="p-2.5 bg-white rounded-full shadow-3xs border border-stone-100 text-stone-400">
                                  {vaultUploading ? (
                                    <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Upload className="w-4 h-4 text-amber-500" />
                                  )}
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-xs font-bold text-slate-800">
                                    {vaultUploading ? "Optimizing photo file..." : "Choose Polaroid Snapshot"}
                                  </p>
                                  <p className="text-[9px] text-gray-400 font-medium font-mono leading-none">
                                    Drag &amp; drop or click to upload
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Let them optionally fallback/override via URL pasting */}
                            <div className="pt-1">
                              <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Or paste direct Image link instead:</span>
                              <input
                                type="text"
                                placeholder="https://example.com/beautiful-photo.jpg"
                                className="w-full px-3 py-1.5 mt-1 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-hidden"
                                value={wishMediaUrl}
                                onChange={(e) => setWishMediaUrl(e.target.value)}
                              />
                            </div>
                          </div>
                        )}

                        {/* RENDER FALLBACK FOR NON-PHOTO ATTACHMENTS */}
                        {(wishType === 'video' || wishType === 'voice') && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Media Link URL</label>
                            <input
                              type="text"
                              placeholder="Copy paste photo/audio URL address"
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-hidden"
                              value={wishMediaUrl}
                              onChange={(e) => setWishMediaUrl(e.target.value)}
                            />
                            <p className="text-[9px] text-gray-400 italic">Provide any valid live link or photo URL to render beautifully.</p>
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Wish Text / Memory Description</label>
                          <textarea
                            required
                            placeholder="Write down the details or script emotional feelings here..."
                            className="w-full bg-slate-55 border border-slate-200 text-xs rounded-xl px-3 py-2 w-full focus:outline-hidden min-h-[110px]"
                            value={wishContent}
                            onChange={(e) => setWishContent(e.target.value)}
                          />
                        </div>

                        <div className="flex gap-2 justify-end pt-3">
                          <button
                            type="button"
                            onClick={() => setWishFormOpen(false)}
                            className="px-4 py-2 hover:bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={wishSaving}
                            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
                          >
                            Lock in Vault
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Secure Vault catalog dashboard grid */}
              {uploadedWishes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {uploadedWishes.map((w) => {
                    const isLetter = w.type === 'letter';
                    const isPhoto = w.type === 'photo';
                    const isVoice = w.type === 'voice';
                    const isVideo = w.type === 'video';
                    const isWish = w.type === 'wish';

                    return (
                      <div 
                        key={w.id} 
                        className="bg-white rounded-3xl p-5 border border-slate-200 shadow-lg flex flex-col justify-between relative space-y-4 overflow-hidden group hover:scale-[1.01] transition-transform duration-300"
                      >
                        {/* Header badge */}
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-bold tracking-widest text-[#B45309] bg-[#FEF3C7] px-2.5 py-1 rounded-full uppercase">
                            {w.type === 'letter' ? '💌 Letter' : w.type === 'photo' ? '📸 Polaroid' : w.type === 'voice' ? '🎙️ Voice note' : w.type === 'video' ? '🎥 Video' : '💝 Wish Card'}
                          </span>
                          
                          {/* Trash button */}
                          {w.userId === user.uid && (
                            <button 
                              onClick={() => handleDeleteVaultItem(w.id)}
                              className="text-stone-300 hover:text-red-500 transition"
                              title="Delete Memory"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Title of asset */}
                        <h4 className="font-display font-black text-slate-800 text-base">{w.title}</h4>

                        {/* CUSTOM HIGH-FIDELITY LAYOUTS ACCORDING TO ASSET CATEGORIES */}
                        
                        {/* 1. PHOTO POLAROID VIEW */}
                        {isPhoto && (
                          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-150 text-center space-y-2">
                            <div className="aspect-square w-full rounded-lg bg-slate-200 overflow-hidden border border-white shadow-inner relative flex items-center justify-center">
                              {w.mediaUrl ? (
                                <img 
                                  src={w.mediaUrl} 
                                  alt={w.title} 
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                  onError={(e: any) => { e.target.src = "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=500"; }}
                                />
                              ) : (
                                <span className="text-slate-400 text-xs">No image uploaded</span>
                              )}
                            </div>
                            <p className="font-accent text-stone-600 text-xs italic py-1 font-bold">"Captured with genuine joy"</p>
                          </div>
                        )}

                        {/* 2. VOICE NOTE PLAYER WAVEFORM */}
                        {isVoice && (
                          <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-3 shadow-inner relative">
                            <span className="text-[8px] uppercase tracking-wider text-amber-400 block font-bold font-mono">Simulated Waveform Equalizer</span>
                            
                            <div className="flex gap-3 items-center">
                              <button 
                                onClick={() => setPlayingVoiceId(playingVoiceId === w.id ? null : w.id)}
                                className="w-9 h-9 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-full flex items-center justify-center transition shrink-0 cursor-pointer"
                              >
                                {playingVoiceId === w.id ? <Pause className="w-4 h-4 fill-slate-900" /> : <Play className="w-4 h-4 fill-slate-900 ml-0.5" />}
                              </button>
                              
                              <div className="flex-grow space-y-1">
                                <div className="text-[10px] font-bold block truncate font-mono">{w.mediaUrl || "VoiceMemo-789.mp3"}</div>
                                <div className="flex items-end gap-1 h-6">
                                  {Array.from({ length: 16 }).map((_, idx) => (
                                    <div 
                                      key={idx} 
                                      className="bg-amber-400 w-1 rounded-sm"
                                      style={{ 
                                        height: playingVoiceId === w.id 
                                          ? `${15 + Math.random() * 85}%` 
                                          : '20%',
                                        transition: 'height 0.15s ease' 
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 3. LOVE LETTER / PARCHMENT ROLL */}
                        {isLetter && (
                          <div className="bg-[#FAF6EE] border border-[#E9DFCB] p-4.5 rounded-2xl text-stone-700 italic text-xs leading-relaxed max-h-[140px] overflow-y-auto relative shadow-inner">
                            <span className="text-[8px] uppercase font-bold text-amber-700 block mb-1">Parchment Scroll</span>
                            "{w.content}"
                          </div>
                        )}

                        {/* 4. HIGH-FIDELITY VIDEO MEDIA BLOCK */}
                        {isVideo && (
                          <div className="bg-slate-900 border border-slate-800 text-slate-100 p-3 rounded-2xl relative shadow-md space-y-3">
                            <span className="text-[8px] uppercase tracking-wider text-pink-400 block font-bold font-mono">🎥 Secure Movie Frame</span>
                            
                            {w.mediaUrl ? (
                              <div className="aspect-video w-full rounded-xl bg-black overflow-hidden relative shadow-inner flex items-center justify-center border border-slate-800">
                                {getYouTubeEmbedUrl(w.mediaUrl) ? (
                                  <iframe
                                    src={getYouTubeEmbedUrl(w.mediaUrl)!}
                                    title={w.title}
                                    className="w-full h-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                ) : isDirectVideo(w.mediaUrl) ? (
                                  <video 
                                    controls 
                                    className="w-full h-full object-cover"
                                    src={w.mediaUrl}
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center space-y-2 bg-gradient-to-b from-slate-950 to-slate-900">
                                    <span className="text-2xl">📽️</span>
                                    <div className="space-y-1">
                                      <span className="text-[9px] text-slate-400 font-bold block truncate max-w-[180px]">{w.mediaUrl}</span>
                                      <a 
                                        href={w.mediaUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1 text-[9px] font-black bg-pink-500 hover:bg-pink-600 text-white rounded-lg uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                                      >
                                        <span>Stream video Link ↗️</span>
                                      </a>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="aspect-video w-full rounded-xl bg-slate-950 flex items-center justify-center text-slate-500 text-[10px] select-none border border-dashed border-slate-800 font-mono">
                                No streamable media URL linked.
                              </div>
                            )}

                            {w.content && (
                              <p className="text-[11px] text-slate-300 font-sans italic leading-relaxed line-clamp-3">
                                "{w.content}"
                              </p>
                            )}
                          </div>
                        )}

                        {/* 5. DEFAULT TEXT / WISH / FRIENDSHIP NOTES */}
                        {!isPhoto && !isVoice && !isLetter && !isVideo && (
                          <div className="bg-sky-50/50 border border-sky-100 p-4 rounded-xl text-xs text-slate-700 font-medium leading-relaxed leading-loose italic">
                            "{w.content}"
                          </div>
                        )}

                        {/* Card footer details */}
                        <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-bold flex justify-between items-center">
                          <span>Recorded: {w.date}</span>
                          <span>🔒 Vault Protected</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white border p-12 rounded-3xl text-center space-y-4 max-w-lg mx-auto shadow-xs">
                  <span className="text-4xl block font-bold">🔐</span>
                  <div className="space-y-1">
                    <h3 className="font-display font-bold text-lg text-slate-800">Your memory vault is active!</h3>
                    <p className="text-slate-500 text-xs">
                      Lock letters, polaroid photos, simulated audio clips, and romantic wishes inside this private drawer to build your secure digital scrapbook.
                    </p>
                  </div>
                  <button
                    onClick={() => setWishFormOpen(true)}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition shadow-3xs cursor-pointer"
                  >
                    Lock First Wish Memory
                  </button>
                </div>
              )}

              {/* COMPACT ABOUT US BANNER IN WORKSPACE */}
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-rose-50/50 shadow-sm mt-12 max-w-4xl mx-auto space-y-4">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-pink-500" />
                  <h4 className="font-display font-black text-lg text-slate-900 leading-none">About Us</h4>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed font-sans font-semibold">
                  ForeverNote was created to help people preserve emotions, memories, and relationships in a secure and beautiful way. In today’s busy world, special moments are often forgotten. Our platform helps couples and friends stay emotionally connected through memories, reminders, and heartfelt messages.
                </p>
              </div>
            </motion.div>
          )}

          {/* TAB 6: SPECIAL DAY REMINDERS CALENDAR */}
          {activeTab === 'reminders' && (
            <motion.div
              key="reminders-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Header section styled exactly like mockup */}
              <div className="space-y-2">
                <span className="text-[11.5px] font-bold text-pink-605 tracking-widest uppercase font-mono block text-rose-600">
                  — Calendar
                </span>
                <h1 className="font-display font-extrabold text-[#1E293B] text-3xl md:text-4xl tracking-tight leading-tight">
                  Special day reminders
                </h1>
                <p className="text-sm text-slate-500 font-semibold font-sans">
                  Set them once. We'll whisper them back to you exactly when they matter.
                </p>
              </div>

              {/* LOVE ODYSSEY - 50/100 DAYS TRACKER */}
              <div className="bg-gradient-to-r from-rose-50/70 to-pink-50/50 border border-pink-100 rounded-3xl p-6 md:p-8 max-w-4xl shadow-3xs relative overflow-hidden">
                {/* Decorative sparkles */}
                <div className="absolute top-4 right-4 text-pink-300 pointer-events-none text-lg">✨</div>
                
                {effectiveAnniversaryDate ? (() => {
                  const start = new Date(effectiveAnniversaryDate);
                  const todayClean = new Date();
                  todayClean.setHours(0, 0, 0, 0);
                  const diffMs = todayClean.getTime() - start.getTime();
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  
                  // Safe guard for negative days (future start date)
                  const togetherDays = Math.max(0, diffDays);
                  
                  // Calculate active interval milestones:
                  const baseMilestones = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000];
                  
                  // Current next milestone is the nearest greater milestone
                  const nextMilestone = baseMilestones.find(m => m > togetherDays) || ((Math.floor(togetherDays / 100) + 1) * 100);
                  // Previous completed milestone
                  const prevMilestone = baseMilestones.filter(m => m <= togetherDays).pop() || 0;
                  
                  const progressInSpan = togetherDays - prevMilestone;
                  const totalSpan = nextMilestone - prevMilestone;
                  const progressPercent = Math.min(100, Math.max(0, (progressInSpan / totalSpan) * 100));
                  const daysToNext = nextMilestone - togetherDays;
                  
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      <div className="md:col-span-4 space-y-2 text-center md:text-left">
                        <span className="text-[10px] font-black tracking-widest text-rose-500 uppercase font-mono bg-rose-100/60 px-2.5 py-1 rounded-full border border-rose-200/40">
                          💞 Love Odyssey Tracker
                        </span>
                        <div className="pt-2">
                          <span className="font-display font-black text-4xl sm:text-5xl text-[#7F1D1D] block leading-none">
                            {togetherDays}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block pt-1 select-none font-mono">
                            DAYS SPENT TOGETHER
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-semibold font-sans pt-1">
                          Since your chemistry start date: <strong className="text-[#7F1D1D] font-mono">{effectiveAnniversaryDate}</strong>
                        </p>
                      </div>
                      
                      <div className="md:col-span-8 space-y-4 text-left">
                        <div className="flex items-center justify-between text-xs font-black text-slate-700">
                          <span className="flex items-center gap-1">
                            🎉 Last station: <strong className="text-[#7F1D1D]">{prevMilestone > 0 ? `${prevMilestone} Days` : "Start!"}</strong>
                          </span>
                          <span className="flex items-center gap-1 text-right">
                            🏁 Next Milestone: <strong className="text-rose-600">{nextMilestone} Days</strong>
                          </span>
                        </div>
                        
                        {/* Dynamic Progress Bar */}
                        <div className="w-full h-4 bg-white/70 rounded-full border border-pink-100 overflow-hidden relative shadow-3xs p-0.5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-pink-400 to-rose-400 rounded-full relative"
                          >
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-white font-mono font-black pr-0.5 select-none">♥</div>
                          </motion.div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                          <div className="space-y-0.5">
                            <p className="text-xs font-black text-slate-850">
                              💌 {daysToNext} days remaining until our {nextMilestone}-day celebration!
                            </p>
                            <p className="text-[10px] text-slate-500 font-semibold">
                              We'll automatically update the main countdown after completing {nextMilestone} days!
                            </p>
                          </div>
                          
                          {/* Pin option */}
                          <button
                            type="button"
                            onClick={() => handlePinCountdown('days_together_milestone')}
                            className={`px-4 py-2 text-[10px] font-black rounded-xl transition cursor-pointer flex items-center justify-center gap-1 border shrink-0 ${
                              (profile?.activeCountdownId || localPinnedId) === 'days_together_milestone'
                                ? "bg-rose-500 border-rose-500 text-white shadow-3xs hover:bg-rose-600"
                                : "bg-white hover:bg-rose-50 border-pink-200 text-rose-605 hover:text-rose-700 shadow-3xs"
                            }`}
                          >
                            <span>{(profile?.activeCountdownId || localPinnedId) === 'days_together_milestone' ? "📌 Landmark Pinned" : "Pin to Main Clock"}</span>
                          </button>
                        </div>
                        
                        {/* Cute miniature upcoming checkpoints train */}
                        <div className="pt-2.5 border-t border-dashed border-pink-200/50">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block pb-2">Upcoming Love Checkpoints:</span>
                          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin">
                            {baseMilestones.filter(m => m > togetherDays).slice(0, 5).map((mStep, idx) => {
                              const stepDate = new Date(start.getTime() + mStep * 24 * 60 * 60 * 1000);
                              const stepDateStr = stepDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                              const stepDaysLeft = mStep - togetherDays;
                              const isNextOne = idx === 0;
                              
                              return (
                                <div 
                                  key={mStep} 
                                  className={`px-3 py-1.5 rounded-xl border shrink-0 text-left space-y-0.5 relative ${
                                    isNextOne 
                                      ? "bg-rose-50 border-rose-200 text-rose-700 ring-2 ring-rose-100/35" 
                                      : "bg-white border-slate-100/80 text-slate-600"
                                  }`}
                                >
                                  {isNextOne && (
                                    <div className="absolute top-[-7px] right-2 bg-rose-500 text-white font-black text-[7px] px-1.5 py-0.5 rounded-full scale-90 uppercase tracking-tighter">Next Milestone</div>
                                  )}
                                  <p className="text-[10.5px] font-black">🌟 {mStep} Days</p>
                                  <p className="text-[9px] font-semibold opacity-80 leading-none">{stepDateStr}</p>
                                  <p className="text-[8.5px] font-bold text-slate-405 pt-0.5 font-mono">In {stepDaysLeft} days</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="flex flex-col items-center justify-center text-center py-8 px-4 space-y-4 max-w-lg mx-auto">
                    <div className="bg-rose-50 border border-rose-100 text-rose-500 p-4 rounded-3xl text-2xl shadow-3xs animate-bounce" style={{ animationDuration: '3s' }}>
                      💖
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="font-display font-extrabold text-base text-slate-800">Days Together Milestone Checkpoints</h4>
                      <p className="text-slate-500 text-xs leading-relaxed font-semibold">
                        To construct your automatically calculated love journey landmarks (Started Day, 50 Days, 100 Days, etc.), please select your romantic start date below!
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full pt-1.5 justify-center">
                      <input 
                        type="date"
                        className="w-full sm:w-56 px-4 py-3 bg-white border border-rose-200 text-[12px] rounded-xl outline-none text-slate-800 font-bold shadow-3xs cursor-pointer focus:border-rose-300 focus:ring-1 focus:ring-rose-200"
                        value={profAnniversary}
                        onChange={(e) => setProfAnniversary(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!profAnniversary) {
                            showNotification("error", "Please pick a valid start date from the calendar!");
                            return;
                          }
                          try {
                            const userRef = doc(db, "users", user.uid);
                            const updateData = {
                              name: profName || user.displayName || "Cozy Partner",
                              partnerName: profPartnerName || "",
                              partnerEmail: profPartnerEmail || "",
                              anniversaryDate: profAnniversary,
                            };
                            await updateDoc(userRef, updateData).catch(async (err) => {
                              if (err.code === "not-found") {
                                const randomCode = "FN-" + Math.random().toString(36).substring(2, 8).toUpperCase();
                                await setDoc(userRef, {
                                  ...updateData,
                                  email: user.email || "",
                                  inviteCode: profile?.inviteCode || randomCode,
                                  partnerInviteCode: profile?.partnerInviteCode || "",
                                  connectedPartnerId: profile?.connectedPartnerId || "",
                                  createdAt: serverTimestamp(),
                                });
                              } else {
                                throw err;
                              }
                            });
                            showNotification("success", "Anniversary date saved! Your milestones are loaded and ready! 💖");
                          } catch (error: any) {
                            showNotification("error", "Failed to save: " + error.message);
                          }
                        }}
                        className="w-full sm:w-auto shrink-0 px-5 py-3 bg-[#111111] hover:bg-stone-800 active:bg-black text-white text-[11px] font-black rounded-xl cursor-pointer transition shadow-3xs hover:shadow-xs"
                      >
                        Save &amp; Unlock Milestones ✨
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Add a new day form Card widget */}
              <div className="bg-[#FFFDF9]/90 border border-[#F1E9DC]/75 rounded-3xl p-6 md:p-8 shadow-2xs max-w-4xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="font-display font-extrabold text-[13px] uppercase tracking-wider text-[#7F1D1D] flex items-center gap-1.5 font-mono">
                    <span>Add a new day</span>
                  </h3>
                  
                  {/* Mode Toggles */}
                  <div className="flex items-center bg-[#F1E9DC]/40 p-0.5 rounded-xl border border-[#F1E9DC]/60 self-start">
                    <button
                      type="button"
                      onClick={() => setNewSpecialMode("date")}
                      className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${
                        newSpecialMode === "date"
                          ? "bg-white text-[#7F1D1D] shadow-3xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      📅 Calendar Date
                    </button>
                    <button
                      type="button"
                      disabled={!effectiveAnniversaryDate}
                      onClick={() => setNewSpecialMode("days")}
                      className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all flex items-center gap-1 ${
                        !effectiveAnniversaryDate ? "opacity-50 cursor-not-allowed" : ""
                      } ${
                        newSpecialMode === "days"
                          ? "bg-white text-[#7F1D1D] shadow-3xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                      title={!effectiveAnniversaryDate ? "Please save Relationship Anniversary in settings first" : "Specify in number of days from start date"}
                    >
                      💞 Love Journey Day
                    </button>
                  </div>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await handleSaveSpecialDay(e);
                  }}
                  className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full"
                >
                  <div className="flex-grow">
                    <input
                      type="text"
                      required
                      placeholder="e.g. First Hug Day"
                      className="w-full px-4 py-3 bg-white border border-slate-200/90 text-[12px] rounded-xl focus:border-rose-300 focus:ring-1 focus:ring-rose-200 outline-none text-slate-800 placeholder-slate-400 font-bold shadow-3xs"
                      value={newSpecialTitle}
                      onChange={(e) => setNewSpecialTitle(e.target.value)}
                    />
                  </div>
                  
                  {newSpecialMode === "date" ? (
                    <div className="w-full md:w-52">
                      <input
                        type="date"
                        required
                        className="w-full px-4 py-3 bg-white border border-slate-200/90 text-[12px] rounded-xl focus:border-rose-300 focus:ring-1 focus:ring-rose-200 outline-none text-slate-800 font-bold shadow-3xs cursor-pointer"
                        value={newSpecialDate}
                        onChange={(e) => setNewSpecialDate(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="w-full md:w-52 relative">
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="e.g. 150 (days)"
                        className="w-full px-4 py-3 pr-10 bg-white border border-slate-200/90 text-[12px] rounded-xl focus:border-rose-300 focus:ring-1 focus:ring-rose-200 outline-none text-slate-800 font-bold shadow-3xs"
                        value={newSpecialDaysValue}
                        onChange={(e) => setNewSpecialDaysValue(e.target.value)}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-slate-400 font-mono select-none">Days</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={specialSaving}
                    className="px-6 py-3 bg-[#111111] hover:bg-stone-800 active:bg-black text-white font-bold text-[11px] rounded-full flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs transition shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{specialSaving ? "Adding..." : "+ Add reminder"}</span>
                  </button>
                </form>

                {/* Extra Options */}
                {newSpecialMode === "date" && (
                  <div className="flex items-center gap-2 pl-1 select-none">
                    <input
                      type="checkbox"
                      id="remTabIsOneTime"
                      className="rounded border-slate-200 text-rose-500 focus:ring-rose-400"
                      checked={newSpecialIsOneTime}
                      onChange={(e) => setNewSpecialIsOneTime(e.target.checked)}
                    />
                    <label htmlFor="remTabIsOneTime" className="text-[10.5px] text-slate-500 font-black cursor-pointer font-mono">
                      Treat as a one-time countdown event (unchecked means annual repeating anniversary)
                    </label>
                  </div>
                )}
                {newSpecialMode === "days" && effectiveAnniversaryDate && (
                  <p className="text-[10px] text-slate-400 font-semibold pl-1">
                    Will calculate date based on start date ({effectiveAnniversaryDate}). Entered milestone will count down as a single-occurrence landmark.
                  </p>
                )}
              </div>

              {/* Custom special date grid cards section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl pt-2 pb-6">
                {(() => {
                  const specialItems = activeMilestones.filter(m => m.description?.startsWith("[SPECIAL-COUNTDOWN]"));
                  
                  const addDaysStr = (dateStr: string, days: number): string => {
                    try {
                      const d = new Date(dateStr);
                      d.setDate(d.getDate() + days);
                      const y = d.getFullYear();
                      const m = String(d.getMonth() + 1).padStart(2, '0');
                      const sDay = String(d.getDate()).padStart(2, '0');
                      return `${y}-${m}-${sDay}`;
                    } catch {
                      return dateStr;
                    }
                  };

                  const virtualItems: any[] = [];
                  if (effectiveAnniversaryDate) {
                    // Started Day
                    virtualItems.push({
                      id: "virtual_started_day",
                      title: "Our Love Journey Started Day 💖",
                      date: effectiveAnniversaryDate,
                      description: "[SPECIAL-COUNTDOWN] [VIRTUAL]",
                      isVirtual: true
                    });
                    
                    // Comprehensive landmarks (given days and mentioned days)
                    const milestones = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000];
                    milestones.forEach(days => {
                      let emoji = "✨";
                      if (days === 50) emoji = "🧸";
                      else if (days === 100) emoji = "🥂";
                      else if (days === 150) emoji = "💘";
                      else if (days === 200) emoji = "🎈";
                      else if (days === 250) emoji = "🌹";
                      else if (days === 300) emoji = "🍫";
                      else if (days === 350) emoji = "💍";
                      else if (days === 400) emoji = "🏰";
                      else if (days === 450) emoji = "💌";
                      else if (days === 500) emoji = "💝";
                      else if (days === 600) emoji = "🌟";
                      else if (days === 700) emoji = "💎";
                      else if (days === 800) emoji = "🌸";
                      else if (days === 900) emoji = "🍁";
                      else if (days === 1000) emoji = "👑";

                      virtualItems.push({
                        id: `virtual_${days}_days`,
                        title: `${days} Days Together Landmark ${emoji}`,
                        date: addDaysStr(effectiveAnniversaryDate, days),
                        description: "[SPECIAL-COUNTDOWN] [ONE-TIME] [VIRTUAL]",
                        isVirtual: true
                      });
                    });
                  }

                  const combinedItems = [...specialItems, ...virtualItems];
                  
                  // Sort: closest upcoming first
                  const sortedItems = combinedItems.map((item) => {
                    const isOneTime = (item.description || "").includes("[ONE-TIME]");
                    const daysLeft = getDaysLeft(item.date, isOneTime);
                    return { item, daysLeft, isOneTime };
                  }).sort((a, b) => {
                    const dA = a.daysLeft;
                    const dB = b.daysLeft;
                    
                    if (dA >= 0 && dB >= 0) return dA - dB;
                    if (dA < 0 && dB < 0) return dA - dB;
                    if (dA >= 0) return -1;
                    return 1;
                  });

                  const nextUpcoming = sortedItems.find(x => x.daysLeft >= 0);
                  const nextUpcomingId = nextUpcoming ? nextUpcoming.item.id : null;

                  if (sortedItems.length === 0) {
                    return (
                      <div className="md:col-span-2 py-12 text-center text-slate-400 text-xs font-semibold bg-white rounded-3xl border border-dashed border-slate-200">
                        No reminders on custom calendar yet. Type and add some love countdown reminders above!
                      </div>
                    );
                  }

                  const fmtDisplayDate = (dStr: string) => {
                    try {
                      if (!dStr) return "";
                      const parts = dStr.split("-");
                      if (parts.length === 3) {
                        const year = parts[0];
                        const monthIdx = parseInt(parts[1], 10) - 1;
                        const day = parts[2];
                        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                        return `${months[monthIdx]} ${String(parseInt(day, 10)).padStart(2, '0')}, ${year}`;
                      }
                      const dateObj = new Date(dStr);
                      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                      return `${months[dateObj.getMonth()]} ${String(dateObj.getDate()).padStart(2, '0')}, ${dateObj.getFullYear()}`;
                    } catch {
                      return dStr;
                    }
                  };

                  const getCardThumbnail = (titleStr: string) => {
                    const lower = titleStr.toLowerCase();
                    if (lower.includes("started day") || lower.includes("love journey")) {
                      return (
                        <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-2xl shadow-3xs flex items-center justify-center w-12 h-12 text-xl shrink-0 select-none">
                          💝
                        </div>
                      );
                    }
                    if (lower.includes("50 days")) {
                      return (
                        <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-2xl shadow-3xs flex items-center justify-center w-12 h-12 text-xl shrink-0 select-none">
                          🧸
                        </div>
                      );
                    }
                    if (lower.includes("100 days")) {
                      return (
                        <div className="bg-indigo-50 border border-indigo-200 p-2.5 rounded-2xl shadow-3xs flex items-center justify-center w-12 h-12 text-xl shrink-0 select-none">
                          🥂
                        </div>
                      );
                    }
                    if (lower.includes("150 days")) {
                      return (
                        <div className="bg-pink-50 border border-pink-200 p-2.5 rounded-2xl shadow-3xs flex items-center justify-center w-12 h-12 text-xl shrink-0 select-none">
                          💘
                        </div>
                      );
                    }
                    if (lower.includes("200 days")) {
                      return (
                        <div className="bg-red-50 border border-red-200 p-2.5 rounded-2xl shadow-3xs flex items-center justify-center w-12 h-12 text-xl shrink-0 select-none">
                          🎈
                        </div>
                      );
                    }
                    if (lower.includes("250 days")) {
                      return (
                        <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-2xl shadow-3xs flex items-center justify-center w-12 h-12 text-xl shrink-0 select-none">
                          🌹
                        </div>
                      );
                    }
                    if (lower.includes("300 days")) {
                      return (
                        <div className="bg-[#FFFBEB] border border-amber-200 p-2.5 rounded-2xl shadow-3xs flex items-center justify-center w-12 h-12 text-xl shrink-0 select-none">
                          🍫
                        </div>
                      );
                    }
                    if (lower.includes("350 days")) {
                      return (
                        <div className="bg-sky-50 border border-sky-200 p-2.5 rounded-2xl shadow-3xs flex items-center justify-center w-12 h-12 text-xl shrink-0 select-none">
                          💍
                        </div>
                      );
                    }
                    if (lower.includes("400 days")) {
                      return (
                        <div className="bg-violet-50 border border-violet-200 p-2.5 rounded-2xl shadow-3xs flex items-center justify-center w-12 h-12 text-xl shrink-0 select-none">
                          🏰
                        </div>
                      );
                    }
                    if (lower.includes("450 days")) {
                      return (
                        <div className="bg-fuchsia-50 border border-fuchsia-200 p-2.5 rounded-2xl shadow-3xs flex items-center justify-center w-12 h-12 text-xl shrink-0 select-none">
                          💌
                        </div>
                      );
                    }
                    if (lower.includes("500 days")) {
                      return (
                        <div className="bg-rose-50 border border-rose-300 p-2.5 rounded-2xl shadow-3xs flex items-center justify-center w-12 h-12 text-xl shrink-0 select-none">
                          💝
                        </div>
                      );
                    }
                    if (lower.includes("600 days")) {
                      return (
                        <div className="bg-amber-50 border border-yellow-200 p-2.5 rounded-2xl shadow-3xs flex items-center justify-center w-12 h-12 text-xl shrink-0 select-none">
                          🌟
                        </div>
                      );
                    }
                    if (lower.includes("700 days")) {
                      return (
                        <div className="bg-teal-50 border border-teal-200 p-2.5 rounded-2xl shadow-3xs flex items-center justify-center w-12 h-12 text-xl shrink-0 select-none">
                          💎
                        </div>
                      );
                    }
                    if (lower.includes("800 days")) {
                      return (
                        <div className="bg-pink-50 border border-pink-100 p-2.5 rounded-2xl shadow-3xs flex items-center justify-center w-12 h-12 text-xl shrink-0 select-none">
                          🌸
                        </div>
                      );
                    }
                    if (lower.includes("900 days")) {
                      return (
                        <div className="bg-orange-50 border border-orange-250 p-2.5 rounded-2xl shadow-3xs flex items-center justify-center w-12 h-12 text-xl shrink-0 select-none">
                          🍁
                        </div>
                      );
                    }
                    if (lower.includes("1000 days")) {
                      return (
                        <div className="bg-[#FEF3C7] border border-amber-300 p-2.5 rounded-2xl shadow-3xs flex items-center justify-center w-12 h-12 text-xl shrink-0 select-none font-bold">
                          👑
                        </div>
                      );
                    }
                    if (lower.includes("marriage") || lower.includes("wedding")) {
                      return (
                        <div className="bg-white border border-slate-100 p-2.5 rounded-2xl shadow-3xs flex items-center justify-center w-12 h-12 text-xl shrink-0">
                          {/* Blank soft rounded square as depicted in the mockup */}
                        </div>
                      );
                    }
                    if (lower.includes("proposal")) {
                      return (
                        <div className="bg-white border border-[#E2E8F0] p-2.5 rounded-2xl shadow-3xs flex items-center justify-center w-12 h-12 text-xl shrink-0">
                          💍
                        </div>
                      );
                    }
                    if (lower.includes("love")) {
                      return (
                        <div className="bg-white border border-rose-100 p-2.5 rounded-2xl shadow-3xs flex items-center justify-center w-12 h-12 text-xl shrink-0">
                          ❤️
                        </div>
                      );
                    }
                    if (lower.includes("meet") || lower.includes("first meet")) {
                      return (
                        <div className="bg-white border border-slate-100 p-2.5 rounded-2xl shadow-3xs flex items-center justify-center w-12 h-12 text-xl shrink-0">
                          {/* Blank soft rounded square as depicted in the mockup */}
                        </div>
                      );
                    }
                    if (lower.includes("friendship") || lower.includes("friend")) {
                      return (
                        <div className="bg-white border border-[#E2E8F0] p-2.5 rounded-2xl shadow-3xs flex items-center justify-center w-12 h-12 text-xl shrink-0">
                          💫
                        </div>
                      );
                    }
                    if (lower.includes("birthday") || lower.includes("cake")) {
                      return (
                        <div className="bg-white border border-[#FDE68A] p-2.5 rounded-2xl shadow-3xs flex items-center justify-center w-12 h-12 text-xl shrink-0">
                          🎂
                        </div>
                      );
                    }
                    return (
                      <div className="bg-white border border-slate-100 p-2.5 rounded-2xl text-slate-450 shadow-3xs flex items-center justify-center w-12 h-12 shrink-0">
                        <Calendar className="w-5 h-5 text-pink-500" />
                      </div>
                    );
                  };

                  return sortedItems.map(({ item, daysLeft, isOneTime }) => {
                    const isNext = item.id === nextUpcomingId;
                    
                    return (
                      <div 
                        key={item.id} 
                        className={`rounded-3xl p-5 border flex items-center justify-between transition-all relative ${
                          isNext 
                            ? 'bg-gradient-to-r from-[#FFF5F6] to-[#FFEBEF] border-rose-200/90 shadow-md ring-1 ring-rose-100/30' 
                            : 'bg-white border-[#F1E9DC]/65 shadow-xs'
                        }`}
                      >
                        {/* Left Side Info */}
                        <div className="flex items-center gap-4 px-1 pr-2">
                          {getCardThumbnail(item.title)}
                          
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-display font-extrabold text-[#1E293B] text-sm md:text-[15px] leading-tight block">
                                {item.title}
                              </span>
                              {isNext && (
                                <span className="bg-[#7F1D1D] text-white font-sans text-[8px] md:text-[9px] font-black uppercase rounded-md tracking-wider px-2 py-0.5 ml-1 leading-none select-none animate-bounce" style={{ animationDuration: '2s' }}>
                                  NEXT
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-semibold tracking-wide block">
                              {fmtDisplayDate(item.date)}
                            </span>
                            {effectiveAnniversaryDate && (() => {
                              try {
                                const startObj = new Date(effectiveAnniversaryDate);
                                startObj.setHours(0,0,0,0);
                                const eventObj = new Date(item.date);
                                eventObj.setHours(0,0,0,0);
                                const diffMs = eventObj.getTime() - startObj.getTime();
                                const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
                                
                                if (diffDays === 0) {
                                  return (
                                    <span className="inline-block text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-200/50 font-mono px-1.5 py-0.5 rounded-md uppercase tracking-wider mt-1 select-none">
                                      🌱 Day 0 (Start)
                                    </span>
                                  );
                                } else if (diffDays > 0) {
                                  return (
                                    <span className="inline-block text-[9px] font-black text-pink-600 bg-pink-50/70 border border-pink-200/50 font-mono px-1.5 py-0.5 rounded-md uppercase tracking-wider mt-1 select-none">
                                      💞 Day {diffDays} Landmark
                                    </span>
                                  );
                                } else {
                                  return (
                                    <span className="inline-block text-[9px] font-black text-slate-500 bg-stone-100 border border-stone-200/50 font-mono px-1.5 py-0.5 rounded-md uppercase tracking-wider mt-1 select-none">
                                      ⏳ Day {diffDays}
                                    </span>
                                  );
                                }
                              } catch {
                                return null;
                              }
                            })()}
                          </div>
                        </div>

                        {/* Right Countdown details */}
                        <div className="flex items-center gap-x-3 shrink-0">
                          <div className="text-right pr-6">
                            {daysLeft < 0 ? (
                              <div className="space-y-1">
                                <span className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 rounded-full uppercase tracking-wider block font-sans">
                                  COMPLETED 🎉
                                </span>
                                <span className="text-[9px] font-black text-slate-400 block font-mono">
                                  {Math.abs(daysLeft)} days ago
                                </span>
                              </div>
                            ) : (
                              <>
                                <span className="font-display font-black text-3xl md:text-4xl text-[#7F1D1D] block leading-none">
                                  {daysLeft}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block pt-1 select-none font-mono">
                                  DAYS
                                </span>
                              </>
                            )}
                          </div>

                          {/* Delete Button / Lock Indicator */}
                          {(!item.isVirtual) ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to remove the reminder: "${item.title}"?`)) {
                                  handleDeleteMilestone(item.id);
                                }
                              }}
                              className="absolute top-3 right-3 text-slate-350 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all duration-150 cursor-pointer"
                              title="Delete Countdown Reminder"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <div 
                              className="absolute top-3 right-3 text-pink-400 p-1 bg-pink-50/50 rounded-lg"
                              title="Calculated Landmark (Permanent)"
                            >
                              <span className="text-xs select-none">🔒</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </motion.div>
          )}

          {/* TAB 7: COZY COLLAGE GALLERY */}
          {activeTab === 'gallery' && (
            <motion.div
              key="gallery-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <GalleryView 
                user={user} 
                profile={profile} 
                showNotification={showNotification}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* LOVE COUNTDOWN SPECIAL DAYS POPUP MODAL */}
      <AnimatePresence>
        {specialDaysOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setSpecialDaysOpen(false)}
            />

            <motion.div
              initial={{ y: 20, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20, scale: 0.95 }}
              className="relative bg-white rounded-3xl p-6 md:p-8 border border-slate-200/50 shadow-2xl max-w-2xl w-full z-10 flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setSpecialDaysOpen(false)}
                className="absolute top-5 right-5 p-2 hover:bg-stone-50 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>

              {/* Header Title */}
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-pink-100 text-pink-600 p-2 rounded-xl">
                  <Timer className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-xl text-gray-900 leading-none">Love Countdown Special Days</h3>
                  <p className="text-gray-500 text-[10px]">Select any romantic highlight to pin on your main clock ticker, or register new celebrations!</p>
                </div>
              </div>

              {/* Tabs selector */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl mb-4 text-center">
                <button
                  type="button"
                  onClick={() => setSpecialDaysTab('list')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    specialDaysTab === 'list' ? 'bg-white text-pink-600 shadow-xs' : 'text-slate-500 hover:text-slate-800 animate-none'
                  }`}
                >
                  📋 Countdowns List ({6 + activeMilestones.filter(m => (m.description || "").startsWith("[SPECIAL-COUNTDOWN]")).length})
                </button>
                <button
                  type="button"
                  onClick={() => setSpecialDaysTab('add')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    specialDaysTab === 'add' ? 'bg-white text-pink-600 shadow-xs' : 'text-slate-500 hover:text-slate-800 animate-none'
                  }`}
                >
                  ➕ Add Custom Countdown Day
                </button>
              </div>

              {/* Tab: List View */}
              {specialDaysTab === 'list' && (
                <div className="space-y-4 overflow-y-auto pr-1 flex-1 min-h-0">
                  {/* Smart auto proximity */}
                  <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    (profile?.activeCountdownId || localPinnedId) === 'auto'
                      ? 'bg-pink-50/40 border-pink-200 shadow-xs'
                      : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-800">⏱️ Auto proximity target</span>
                        {(profile?.activeCountdownId || localPinnedId) === 'auto' && (
                          <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-[8px] font-black uppercase rounded-full">Active</span>
                        )}
                      </div>
                      <p className="text-slate-500 text-[10px] leading-relaxed">
                        Intelligent mode. Always automatically ticks down to the next closest romantic holiday or scrapbook event!
                      </p>
                    </div>
                    {(profile?.activeCountdownId || localPinnedId) !== 'auto' && (
                      <button
                        onClick={() => handlePinCountdown('auto')}
                        className="py-1 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-black text-slate-700 rounded-lg transition cursor-pointer"
                      >
                        Pin &amp; Sync ✨
                      </button>
                    )}
                  </div>

                  {/* Relationship Anniversary */}
                  {effectiveAnniversaryDate && (
                    <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                      (profile?.activeCountdownId || localPinnedId) === 'relationship_anniversary'
                        ? 'bg-pink-50/40 border-pink-200 shadow-xs'
                        : 'bg-stone-50/35 border-slate-200 hover:border-slate-300'
                    }`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-800">💞 Our Relationship Milestone</span>
                          {(profile?.activeCountdownId || localPinnedId) === 'relationship_anniversary' && (
                            <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-[8px] font-black uppercase rounded-full font-mono">Pinned</span>
                          )}
                        </div>
                        <p className="text-slate-500 text-[10px] leading-none">
                          Started on: {effectiveAnniversaryDate} ({formatDaysLeft(getDaysLeft(effectiveAnniversaryDate))})
                        </p>
                      </div>
                      {(profile?.activeCountdownId || localPinnedId) !== 'relationship_anniversary' && (
                        <button
                          onClick={() => handlePinCountdown('relationship_anniversary')}
                          className="py-1 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-black text-slate-700 rounded-lg transition cursor-pointer"
                        >
                          Pin &amp; Sync ✨
                        </button>
                      )}
                    </div>
                  )}

                  {/* Days Together Milestone Tracker Option in Popup */}
                  {effectiveAnniversaryDate && (() => {
                    const start = new Date(effectiveAnniversaryDate);
                    start.setHours(0, 0, 0, 0);
                    const todayClean = new Date();
                    todayClean.setHours(0, 0, 0, 0);
                    const diffMs = todayClean.getTime() - start.getTime();
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                    const togetherDays = Math.max(0, diffDays);

                    const baseMilestones = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000];
                    const nextMilestone = baseMilestones.find(m => m > togetherDays) || ((Math.floor(togetherDays / 100) + 1) * 100);
                    const daysToNext = nextMilestone - togetherDays;

                    const isPinned = (profile?.activeCountdownId || localPinnedId) === 'days_together_milestone';

                    return (
                      <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        isPinned
                          ? 'bg-gradient-to-r from-[#FFF5F6] to-[#FFEBEF] border-pink-200 shadow-xs'
                          : 'bg-stone-50/35 border-slate-200 hover:border-slate-300'
                      }`}>
                        <div className="space-y-1 text-left">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-slate-150 text-slate-800">🌈 Days Together Landmark Tracker</span>
                            {isPinned && (
                              <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-[8px] font-black uppercase rounded-full font-mono">Pinned</span>
                            )}
                          </div>
                          <p className="text-slate-500 text-[10px] leading-relaxed">
                            Spent Together: <strong className="text-[#7F1D1D]">{togetherDays} Days</strong>. Up next: <strong>{nextMilestone} Days</strong> (in {daysToNext} days)
                          </p>
                        </div>
                        {!isPinned ? (
                          <button
                            type="button"
                            onClick={() => handlePinCountdown('days_together_milestone')}
                            className="py-1 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-black text-slate-700 rounded-lg transition cursor-pointer shrink-0 ml-2 animate-none"
                          >
                            Pin &amp; Sync ✨
                          </button>
                        ) : (
                          <span className="text-[10px] font-black text-pink-600 font-mono shrink-0 pr-1 select-none">Pinned Active</span>
                        )}
                      </div>
                    );
                  })()}

                  {/* Global holidays section */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sweet Romantic Global Countdowns</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {GLOBAL_SPECIAL_DAYS.map((g) => {
                        const daysRemaining = getDaysLeft(`${new Date().getFullYear()}-${String(g.month + 1).padStart(2, '0')}-${String(g.day).padStart(2, '0')}`);
                        const isPinned = (profile?.activeCountdownId || localPinnedId) === g.id;

                        return (
                          <div key={g.id} className={`p-3 rounded-2xl border flex flex-col justify-between gap-2.5 transition-all ${
                            isPinned ? 'bg-pink-50/40 border-pink-200 shadow-xs' : 'bg-slate-50/30 border-slate-200'
                          }`}>
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-800 leading-tight">{g.title}</p>
                              <p className="text-[9.5px] font-semibold text-slate-400">
                                {formatDaysLeft(daysRemaining)}
                              </p>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                              <span className="text-[8px] font-mono font-black text-slate-400 uppercase">Universal</span>
                              {!isPinned ? (
                                <button
                                  onClick={() => handlePinCountdown(g.id)}
                                  className="py-0.5 px-2 bg-white border border-slate-200 hover:bg-slate-50 text-[9px] font-black text-slate-700 rounded-md transition cursor-pointer"
                                >
                                  Pin
                                </button>
                              ) : (
                                <span className="text-[9px] font-black text-pink-600 font-mono">Pin Active</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom created countdowns */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Our Custom Countdown Holidays</h4>
                    {activeMilestones.filter(m => (m.description || "").startsWith("[SPECIAL-COUNTDOWN]")).length === 0 ? (
                      <p className="text-center text-slate-400 text-xs py-4 bg-slate-50/30 border border-dashed border-slate-200 rounded-2xl">
                        No custom countdown holidays added yet. Switch to the next tab to create one! 💖
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {activeMilestones.filter(m => (m.description || "").startsWith("[SPECIAL-COUNTDOWN]")).map((m) => {
                          const isOneTime = (m.description || "").includes("[ONE-TIME]");
                          const daysLeft = getDaysLeft(m.date, isOneTime);
                          const isPinned = (profile?.activeCountdownId || localPinnedId) === m.id;

                          return (
                            <div key={m.id} className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                              isPinned ? 'bg-pink-50/45 border-pink-200 shadow-xs' : 'bg-slate-50/15 border-slate-200 hover:border-slate-300'
                            }`}>
                              <div className="space-y-1.5 max-w-[70%]">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-black text-slate-800 leading-tight block">{m.title}</span>
                                  {isPinned && (
                                    <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-[8px] font-black uppercase rounded-full">Pinned</span>
                                  )}
                                  <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600">
                                    {isOneTime ? "One-time" : "Annual"}
                                  </span>
                                </div>
                                <p className="text-slate-500 text-[9.5px] font-medium leading-relaxed block">
                                  Target: {m.date} ({formatDaysLeft(daysLeft)})
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {!isPinned ? (
                                  <button
                                    onClick={() => handlePinCountdown(m.id)}
                                    className="py-1 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-black text-slate-700 rounded-lg transition cursor-pointer"
                                  >
                                    Pin &amp; Sync
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-bold text-pink-600 pr-1">Active</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMilestone(m.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer border-none bg-transparent"
                                  title="Bury dynamic countdown"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Standard scrapbook diary milestones */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pin Standard Scrapbook Milestones</h4>
                    {activeMilestones.filter(m => !(m.description || "").startsWith("[VAULT-ITEM-") && !(m.description || "").startsWith("[SPECIAL-COUNTDOWN]")).length === 0 ? (
                      <p className="text-center text-slate-400 text-xs py-4 bg-slate-50/30 border border-dashed border-slate-200 rounded-2xl">
                        Log romantic timeline milestones first to pin them here!
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {activeMilestones.filter(m => !(m.description || "").startsWith("[VAULT-ITEM-") && !(m.description || "").startsWith("[SPECIAL-COUNTDOWN]")).map((m) => {
                          const daysLeft = getDaysLeft(m.date, false);
                          const isPinned = (profile?.activeCountdownId || localPinnedId) === m.id;

                          return (
                            <div key={m.id} className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                              isPinned ? 'bg-pink-50/45 border-pink-200 shadow-xs' : 'bg-slate-50/15 border-slate-200 hover:border-slate-300'
                            }`}>
                              <div className="space-y-1 max-w-[70%]">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-slate-800 leading-tight block">{m.title}</span>
                                  {isPinned && (
                                    <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-[8px] font-black uppercase rounded-full">Pinned</span>
                                  )}
                                </div>
                                <p className="text-slate-500 text-[9.5px] font-medium leading-relaxed block">
                                  Anniversary event: {m.date} ({formatDaysLeft(daysLeft)})
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {!isPinned ? (
                                  <button
                                    onClick={() => handlePinCountdown(m.id)}
                                    className="py-1 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-black text-slate-700 rounded-lg transition cursor-pointer"
                                  >
                                    Pin &amp; Sync
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-bold text-pink-600">Active</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: Add View */}
              {specialDaysTab === 'add' && (
                <form onSubmit={handleSaveSpecialDay} className="space-y-5 flex-1 min-h-0 overflow-y-auto">
                  <div className="p-4 bg-pink-50/30 border border-pink-100 rounded-2xl space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-pink-600 tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Synchronized Countdowns
                    </span>
                    <p className="text-slate-600 text-xs leading-relaxed font-semibold">
                      Register customized countdowns! These events are synchronized securely across both connected devices instantly.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block pb-0.5">Countdown Event Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Next Honeymoon, My Love's Birthday 🎂"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-hidden text-slate-800 placeholder-slate-400 font-medium"
                        value={newSpecialTitle}
                        onChange={(e) => setNewSpecialTitle(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block pb-0.5">Event Date</label>
                      <input
                        type="date"
                        required
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-hidden text-slate-800 font-medium"
                        value={newSpecialDate}
                        onChange={(e) => setNewSpecialDate(e.target.value)}
                      />
                    </div>

                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block pb-0.5">Countdown Nature Mode</label>
                      
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 accent-pink-600 cursor-pointer"
                          id="isOneTimeSpecial"
                          checked={newSpecialIsOneTime}
                          onChange={(e) => setNewSpecialIsOneTime(e.target.checked)}
                        />
                        <label htmlFor="isOneTimeSpecial" className="space-y-0.5 cursor-pointer">
                          <span className="text-xs font-bold text-slate-800 block">One-time target destination</span>
                          <span className="text-slate-400 text-[9.5px] font-medium leading-tight block">
                            When checked, it counts down to the exact absolute target date in the future (once). When unchecked, it treats it as an annual repeating anniversary countdown!
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSpecialDaysTab('list')}
                      className="w-1/2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 rounded-xl transition cursor-pointer"
                    >
                      Return to List
                    </button>
                    <button
                      type="submit"
                      disabled={specialSaving}
                      className="w-1/2 py-2.5 px-4 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-xs font-bold text-white rounded-xl transition cursor-pointer shadow-sm shadow-pink-900/10 flex items-center justify-center gap-2"
                    >
                      {specialSaving ? "Registering..." : "Save & Pin Ticker ✨"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DASHBOARD SETTINGS & PAIRING CONTROL POPUP MODAL */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setIsSettingsOpen(false)}
            />

            <motion.div
              initial={{ y: 20, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20, scale: 0.95 }}
              className="relative bg-white rounded-3xl p-6 md:p-8 border border-slate-200/50 shadow-2xl max-w-md w-full z-10 space-y-6 max-h-[88vh] overflow-y-auto"
            >
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="absolute top-5 right-5 p-2 hover:bg-stone-50 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>

              <div className="flex items-center gap-2">
                <div className="bg-purple-100 text-purple-600 p-2 rounded-xl">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-xl text-gray-900 leading-none">Configuration Panel</h3>
                  <p className="text-gray-500 text-[10px]">Invite codes, pairing status &amp; display profiles</p>
                </div>
              </div>

              {/* Connected and Visited Status Center */}
              <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Your Active Session Details</h4>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-semibold">Your Display Name</span>
                    <strong className="text-slate-800 text-xs truncate block">{profile?.name || user.displayName || "Cozy Partner"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-semibold">Your Session Activity</span>
                    <span className="text-slate-800 text-xs font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Active (Just Now)
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile setup fields */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                {profileError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl">
                    <span>{profileError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block pb-0.5">Your Display Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-hidden"
                    value={profName}
                    onChange={(e) => setProfName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block pb-0.5">
                    {editFriendshipMode ? "Bestie / Friend Name" : "Partner Name"}
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-hidden"
                    value={profPartnerName}
                    onChange={(e) => setProfPartnerName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block pb-0.5">
                    {editFriendshipMode ? "Bestie / Friend Email" : "Partner Email"}
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-hidden"
                    value={profPartnerEmail}
                    onChange={(e) => setProfPartnerEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block pb-0.5">
                    {editFriendshipMode ? "Friendship Anniversary Date" : "Relationship Anniversary Date"}
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-hidden cursor-pointer"
                    value={profAnniversary}
                    onChange={(e) => setProfAnniversary(e.target.value)}
                  />
                </div>

                {/* Vibe Mode Selection */}
                <div className="space-y-1.5 bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Board Vibe Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditFriendshipMode(false)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        !editFriendshipMode
                          ? "bg-pink-600 text-white shadow-3xs"
                          : "bg-white border border-slate-250 text-slate-600 hover:text-slate-800"
                      }`}
                    >
                      <Heart className="w-3.5 h-3.5 fill-current" />
                      <span>Couple Space</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditFriendshipMode(true)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        editFriendshipMode
                          ? "bg-slate-800 text-white shadow-3xs"
                          : "bg-white border border-slate-250 text-slate-600 hover:text-slate-800"
                      }`}
                    >
                      <Smile className="w-3.5 h-3.5 fill-current" />
                      <span>Besties Space</span>
                    </button>
                  </div>
                  <span className="text-[9.5px] text-slate-400 block leading-snug">
                    Toggles indicators between romance and companionship modes!
                  </span>
                </div>

                {/* Appearance Theme Selector */}
                <div className="space-y-1.5 bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Board Appearance Theme</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "rose", name: "Romantic Rose", bg: "bg-pink-500" },
                      { id: "slate", name: "Modern Slate", bg: "bg-slate-800" },
                      { id: "amber", name: "Sunlit Amber", bg: "bg-amber-500" },
                      { id: "lavender", name: "Cozy Lavender", bg: "bg-violet-500" },
                      { id: "emerald", name: "Emerald Forest", bg: "bg-emerald-500" },
                      { id: "midnight", name: "Celestial Midnight", bg: "bg-indigo-950" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setEditAppearanceTheme(t.id)}
                        className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                          editAppearanceTheme === t.id
                            ? "bg-white border-slate-800 shadow-3xs ring-2 ring-slate-800/10"
                            : "bg-white border-slate-200 hover:border-slate-300 text-slate-500"
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full ${t.bg} block shrink-0`}></span>
                        <span className="truncate max-w-full text-center leading-none">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-between gap-2.5">
                  <span className="text-[10px] text-slate-400 block leading-tight">Generate custom countdowns dynamically.</span>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition shadow-xs cursor-pointer"
                  >
                    {profileSaving ? "Saving..." : "Save Settings"}
                  </button>
                </div>
              </form>

              {/* Dynamic invite codes panel in Settings too */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-[10px] uppercase font-bold text-slate-400">Invite Code Center</h4>
                
                <div className="p-3.5 bg-pink-50/50 rounded-2xl border border-pink-100 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">Your Code: <strong className="text-pink-600 bg-white border border-pink-100 px-2 py-0.5 rounded-md ml-1 font-black shadow-3xs">{profile?.inviteCode}</strong></span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(profile?.inviteCode || "");
                        showNotification("success", "Invitation connection code copied! Send to your loved one. ❤️");
                      }} 
                      className="py-2.5 bg-white hover:bg-slate-50 text-pink-600 text-[10px] font-bold rounded-xl transition border border-pink-200 cursor-pointer shadow-3xs text-center"
                    >
                      Copy Code
                    </button>
                    <button 
                      onClick={() => {
                        const defaultSub = encodeURIComponent("Join our private space on ForeverNote 💖");
                        const defaultMsg = encodeURIComponent(
                          `Hey there! I've created a private space for just the two of us on ForeverNote to preserve our cozy memories, share secret messages, keep countdowns for our special days, and build our shared scrapbook.\n\nDirect Link to Join & Pair Instantly:\n👉 ${getShareableUrl(profile?.inviteCode || "FN-PENDING")}\n\nMy invitation code:\n👉 ${profile?.inviteCode || "FN-PENDING"}\n\nCan't wait! 💖`
                        );
                        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${profile?.partnerEmail || ""}&su=${defaultSub}&body=${defaultMsg}`;
                        window.open(gmailUrl, "_blank");
                        showNotification("success", "Opening Gmail Web draft editor! 📬");
                      }} 
                      className="py-2.5 bg-red-650 hover:bg-red-750 text-white text-[10px] font-bold rounded-xl transition cursor-pointer shadow-3xs flex items-center justify-center gap-1 text-center"
                    >
                      Gmail Draft
                    </button>
                    <button 
                      onClick={() => {
                        const defaultSub = encodeURIComponent("Join our private space on ForeverNote 💖");
                        const defaultMsg = encodeURIComponent(
                          `Hey there! I've created a private space for just the two of us on ForeverNote to preserve our cozy memories, share secret messages, keep countdowns for our special days, and build our shared scrapbook.\n\nDirect Link to Join & Pair Instantly:\n👉 ${getShareableUrl(profile?.inviteCode || "FN-PENDING")}\n\nMy invitation code:\n👉 ${profile?.inviteCode || "FN-PENDING"}\n\nCan't wait! 💖`
                        );
                        window.location.href = `mailto:${profile?.partnerEmail || ""}?subject=${defaultSub}&body=${defaultMsg}`;
                        showNotification("success", "Opened local email launcher with your connection code. 💌");
                      }} 
                      className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-xl transition cursor-pointer shadow-3xs flex items-center justify-center gap-1 text-center"
                    >
                      Mail Draft
                    </button>
                  </div>
                </div>

                {!profile?.connectedPartnerId ? (
                  <form onSubmit={handleConnectWithPartnerCode} className="space-y-2">
                    <label className="text-[9px] uppercase font-bold text-slate-400 block">Or Pair with invitation code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="bg-slate-50 border border-slate-200 text-[11px] rounded-lg px-2.5 py-1.5 w-full uppercase"
                        placeholder="e.g. FN-XYZ456"
                        value={connectCodeInput}
                        onChange={(e) => setConnectCodeInput(e.target.value)}
                      />
                      <button type="submit" className="px-3 py-1.5 bg-pink-500 text-white font-bold rounded-lg text-xs">Pair</button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 bg-emerald-50/75 rounded-2xl border border-emerald-100/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="block text-emerald-600 text-[9px] uppercase font-bold tracking-wider">Connected Partner</span>
                          <strong className="text-sm text-slate-800">{profile?.partnerName || "Your Partner"}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={handleDisconnectPartner}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 font-extrabold rounded-xl text-[10px] transition cursor-pointer"
                          title="Unlink and disconnect from partner"
                        >
                          Disconnect
                        </button>
                      </div>
                      
                      {/* Detailed Connection and visited info */}
                      <div className="pt-2 border-t border-emerald-100/60 grid grid-cols-2 gap-2 text-[10.5px]">
                        <div>
                          <span className="text-slate-400 block font-bold uppercase text-[8px] tracking-wider">Email Address</span>
                          <span className="text-slate-700 font-semibold truncate block" title={profile?.partnerEmail || "No Email"}>
                            {profile?.partnerEmail || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold uppercase text-[8px] tracking-wider">Last Visited</span>
                          <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            {formatFriendlyActiveStatus(partnerProfile?.lastVisitedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* India DPDP Act, 2023 Compliance Center */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-pink-600" />
                    <h4 className="text-[11px] uppercase font-bold text-slate-800 tracking-wider">DPDP Privacy &amp; Compliance Center</h4>
                  </div>
                  {/* Language Tab */}
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setDpdpLanguage('en')}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition ${dpdpLanguage === 'en' ? 'bg-white text-slate-800 shadow-3xs' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => setDpdpLanguage('hi')}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition ${dpdpLanguage === 'hi' ? 'bg-white text-slate-800 shadow-3xs' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      हिन्दी
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3.5">
                  {dpdpLanguage === 'en' ? (
                    <div className="space-y-3 text-[11px] leading-relaxed text-slate-650">
                      <div className="flex items-center justify-between bg-white border border-slate-100 rounded-xl p-2.5 shadow-3xs">
                        <span className="font-semibold text-slate-700">Active Consent (Section 6)</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${privacyConsent ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800 animate-pulse'}`}>
                            {privacyConsent ? 'Granted' : 'Withdrawn'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleConsent(!privacyConsent)}
                            className="text-[9.5px] text-pink-600 hover:text-pink-700 font-extrabold cursor-pointer text-center"
                          >
                            {privacyConsent ? 'Withdraw' : 'Re-enable'}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Your Digital Personal Rights</span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={handleExportAllUserData}
                            className="p-2.5 bg-white hover:bg-slate-50 rounded-xl border border-slate-200/60 text-left cursor-pointer transition shadow-3xs hover:scale-[1.01] flex flex-col justify-between h-full"
                          >
                            <span className="text-slate-700 font-bold block">Right to Portability</span>
                            <span className="text-[9.5px] text-slate-450 font-semibold block pt-0.5">Download full memories scrapbook data in raw JSON format instantly.</span>
                          </button>
                          <button
                            type="button"
                            disabled={isEraseProcessing}
                            onClick={handleEraseAllUserData}
                            className="p-2.5 bg-rose-50/70 hover:bg-rose-100/70 rounded-xl border border-rose-150 text-left cursor-pointer transition shadow-3xs hover:scale-[1.01] flex flex-col justify-between h-full"
                          >
                            <span className="text-rose-700 font-bold block">Right to Erasure</span>
                            <span className="text-[9.5px] text-rose-550 font-semibold block pt-0.5">Request immediate, complete, permanent purge of your whole account.</span>
                          </button>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-100 rounded-xl p-3 space-y-2 text-[10px]">
                        <div className="flex items-center gap-1.5 text-slate-700 font-bold border-b border-slate-100 pb-1.5">
                          <Info className="w-3.5 h-3.5 text-slate-500" />
                          <span>GCP India Region Statement</span>
                        </div>
                        <p className="text-slate-500 leading-relaxed">
                          All personal relationship scrapbooks, letters, images, and logs are hosted on Google Cloud Platform (Firebase) inside sovereign Indian borders: <strong>Mumbai, India (asia-south1)</strong>, complying strictly with data localization guidelines.
                        </p>
                      </div>

                      <div className="bg-white border border-slate-100 rounded-xl p-3 space-y-1 text-[9.5px] text-slate-500 font-medium">
                        <div className="font-bold text-slate-700 text-[10px] pb-1">Grievance Redressal (Section 11)</div>
                        <div><strong>Grievance Officer:</strong> Mr. Amit Sharma</div>
                        <div><strong>Email Address:</strong> privacy@forevernote.in</div>
                        <div className="leading-snug pt-0.5"><strong>Procedure:</strong> Send a brief notice of your grievance. We will address and resolve all data concerns within 7 days.</div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-[11px] leading-relaxed text-slate-650">
                      <div className="flex items-center justify-between bg-white border border-slate-100 rounded-xl p-2.5 shadow-3xs">
                        <span className="font-semibold text-slate-700">सक्रिय सहमति (धारा 6)</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${privacyConsent ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800 animate-pulse'}`}>
                            {privacyConsent ? 'स्वीकृत' : 'वापस ली गई'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleConsent(!privacyConsent)}
                            className="text-[9.5px] text-pink-600 hover:text-pink-700 font-extrabold cursor-pointer text-center"
                          >
                            {privacyConsent ? 'वापस लें' : 'स्वीकारें'}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">आपके डिजिटल व्यक्तिगत अधिकार</span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={handleExportAllUserData}
                            className="p-2.5 bg-white hover:bg-slate-50 rounded-xl border border-slate-200/60 text-left cursor-pointer transition shadow-3xs hover:scale-[1.01] flex flex-col justify-between h-full"
                          >
                            <span className="text-slate-700 font-bold block">पोर्टेबिलिटी का अधिकार</span>
                            <span className="text-[9.5px] text-slate-450 font-semibold block pt-0.5">सभी यादों का पूरा डेटा तुरंत JSON प्रारूप में सुरक्षित डाउनलोड करें।</span>
                          </button>
                          <button
                            type="button"
                            disabled={isEraseProcessing}
                            onClick={handleEraseAllUserData}
                            className="p-2.5 bg-rose-50/70 hover:bg-rose-100/70 rounded-xl border border-rose-150 text-left cursor-pointer transition shadow-3xs hover:scale-[1.01] flex flex-col justify-between h-full"
                          >
                            <span className="text-rose-700 font-bold block">मिटाने का अधिकार</span>
                            <span className="text-[9.5px] text-rose-550 font-semibold block pt-0.5">अपने खाते और सभी व्यक्तिगत यादों को स्थायी रूप से मिटाने का अनुरोध करें।</span>
                          </button>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-100 rounded-xl p-3 space-y-2 text-[10px]">
                        <div className="flex items-center gap-1.5 text-slate-700 font-bold border-b border-slate-100 pb-1.5">
                          <Info className="w-3.5 h-3.5 text-slate-500" />
                          <span>GCP भारत क्षेत्र विवरण</span>
                        </div>
                        <p className="text-slate-500 leading-relaxed">
                          सभी व्यक्तिगत रिलेशनशिप स्क्रैपबुक, पत्र, चित्र और लॉग भारत की संप्रभु सीमाओं के भीतर <strong>मुंबई, भारत (asia-south1)</strong> में Google क्लाउड प्लेटफ़ॉर्म (Firebase) पर सुरक्षित रूप से संग्रहीत हैं।
                        </p>
                      </div>

                      <div className="bg-white border border-slate-100 rounded-xl p-3 space-y-1 text-[9.5px] text-slate-500 font-medium">
                        <div className="font-bold text-slate-700 text-[10px] pb-1">शिकायत निवारण तंत्र (धारा 11)</div>
                        <div><strong>शिकायत अधिकारी:</strong> श्री अमित शर्मा</div>
                        <div><strong>ईमेल पता:</strong> privacy@forevernote.in</div>
                        <div className="leading-snug pt-0.5"><strong>प्रक्रिया:</strong> अपनी शिकायत का संक्षिप्त विवरण भेजें। हम 7 दिनों के भीतर सभी चिंताओं का निवारण करेंगे।</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Secure prominently placed Sign Out Option inside Configuration Panel */}
              <div className="pt-4 border-t border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[10px] text-slate-400 font-bold self-start sm:self-center">Logged as: {user?.email}</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    onSignOut();
                  }}
                  className="w-full sm:w-auto px-4 py-2 border-2 border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 font-black rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-3xs"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Sign Out of Account</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL MILESTONE GRAPH LOG FORM */}
      <MilestoneForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveMilestone}
        initialMilestone={editingMilestone}
        initialReminder={editingMilestone ? getMilestoneReminder(editingMilestone.id) : null}
      />

      {/* INTERACTIVE AI LETTER VIEWER */}
      {activeLetterMilestone && (
        <LetterViewer
          isOpen={isLetterOpen}
          onClose={() => setIsLetterOpen(false)}
          milestone={activeLetterMilestone}
          profile={profile}
          onSaveGeneratedLetter={handleSaveLetterText}
        />
      )}


    </div>
  );
}
