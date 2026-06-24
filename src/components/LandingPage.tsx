import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Heart, Sparkles, Calendar, Mail, ArrowRight, Shield, 
  MessageSquare, Bell, Users, Eye, HelpCircle, ArrowLeft, 
  Lock, CheckCircle, FileText, Camera, Mic, Film, Globe, Info,
  ChevronLeft, ChevronRight
} from "lucide-react";
const coupleMountainSunset = new URL("../assets/images/couple_mountain_sunset_1780158680001.png", import.meta.url).href;
const coupleParkWalk = new URL("../assets/images/couple_park_walk_1780158734763.png", import.meta.url).href;
const coupleTrainSunset = new URL("../assets/images/couple_train_sunset_1780158700135.png", import.meta.url).href;
const coupleVideoCall = new URL("../assets/images/couple_video_call_1780158717979.png", import.meta.url).href;

const memoriedSlides = [
  {
    src: coupleMountainSunset,
    alt: "Couple on Mountain Sunset",
    title: "Mountain Golden Hour ⛰️",
    description: "Every mountain peak holds another memory of us."
  },
  {
    src: coupleTrainSunset,
    alt: "Couple in Train Sunset",
    title: "The Sunset Train Voyage 🚂",
    description: "Sitting side-by-side, enjoying the rhythm of the rails."
  },
  {
    src: coupleVideoCall,
    alt: "Couple Video Call",
    title: "Late Night Heartbeats 💖",
    description: "Miles apart, but always talking until we fall asleep."
  },
  {
    src: coupleParkWalk,
    alt: "Couple Cherry Blossom Park Walk",
    title: "Cherry Blossom Walk 🌸",
    description: "Strolling together under glowing lanterns and starry nights."
  }
];

interface LandingPageProps {
  onEmailSignIn: (email: string, pass: string) => Promise<void>;
  onEmailSignUp: (name: string, email: string, pass: string, partnerCode?: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  isLoading: boolean;
  urlInviteCode?: string;
  onDemoSignIn?: () => Promise<void>;
  onResetPassword?: (email: string) => Promise<void>;
}

export default function LandingPage({ 
  onEmailSignIn, 
  onEmailSignUp, 
  onGoogleSignIn, 
  isLoading,
  urlInviteCode,
  onDemoSignIn,
  onResetPassword
}: LandingPageProps) {
  // Auth view toggler: 'none' (main landing), 'login', 'signup', 'forgot'
  const [authView, setAuthView] = useState<'none' | 'login' | 'signup' | 'forgot'>('none');
  
  // Detection for nested iframe restricted environment (AI Studio)
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    let inIframe = false;
    try {
      inIframe = typeof window !== "undefined" && window.self !== window.top;
    } catch (e) {
      inIframe = true;
    }
    setIsInIframe(inIframe);
  }, []);
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  
  // Signup Form States
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPartnerCode, setSignupPartnerCode] = useState("");

  // Auto-prefill partner invite code from URL and transition to signup view
  useEffect(() => {
    if (urlInviteCode) {
      setSignupPartnerCode(urlInviteCode);
      setAuthView('signup');
    }
  }, [urlInviteCode]);

  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Active showcase tab for the interactive visual preview section
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'messages' | 'reminders' | 'wishes' | 'notifications' | 'couple'>('messages');

  // Active slide index for the romantic memory showcase
  const [activeSlide, setActiveSlide] = useState(0);

  // Autoplay effect for the slideshow
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % memoriedSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setFormError("Please enter both email and password.");
      return;
    }
    try {
      setFormLoading(true);
      setFormError("");
      await onEmailSignIn(loginEmail, loginPassword);
    } catch (err: any) {
      setFormError(err?.message || "Failed to log in. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleForgotPasswordClick = () => {
    setFormError("");
    setResetEmail(loginEmail || "");
    setAuthView('forgot');
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setFormError("Please enter your account email address first.");
      return;
    }
    if (onResetPassword) {
      try {
        setFormLoading(true);
        setFormError("");
        await onResetPassword(resetEmail.trim());
        setAuthView('login');
      } catch (err: any) {
        setFormError(err?.message || "Failed to trigger the password login recovery. Double check your email spelling!");
      } finally {
        setFormLoading(false);
      }
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName || !signupEmail || !signupPassword) {
      setFormError("Please fill out Name, Email, and Password.");
      return;
    }
    if (signupPassword.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    try {
      setFormLoading(true);
      setFormError("");
      await onEmailSignUp(signupName, signupEmail, signupPassword, signupPartnerCode);
    } catch (err: any) {
      setFormError(err?.message || "Failed to sign up.");
    } finally {
      setFormLoading(false);
    }
  };

  const renderFormError = (errorText: string) => {
    if (!errorText) return null;

    const isOperationDisabled = errorText.toLowerCase().includes("disabled") || errorText.toLowerCase().includes("operation-not-allowed") || errorText.toLowerCase().includes("operation not allowed");
    const isUnauthorizedDomain = errorText.toLowerCase().includes("unauthorized-domain") || errorText.toLowerCase().includes("unauthorized domain") || errorText.toLowerCase().includes("unauthorized-host");

    return (
      <div className="p-4 bg-rose-50 border border-rose-150 text-rose-800 text-xs rounded-2xl space-y-3.5 shadow-xs animate-fade-in">
        <div className="flex items-center gap-2 font-bold text-rose-950">
          <Info className="w-4.5 h-4.5 text-rose-600 shrink-0 animate-pulse" />
          <span className="uppercase tracking-wider text-[11px]">System Message &amp; Diagnostics</span>
        </div>
        <p className="leading-relaxed text-[11px] font-medium text-rose-700">{errorText}</p>
        
        {isOperationDisabled && (
          <div className="p-3 bg-white border border-rose-100 rounded-xl space-y-2.5 text-slate-700 text-xs leading-relaxed shadow-2xs">
            <p className="font-bold text-slate-900 flex items-center gap-1.5 border-b border-rose-50 pb-1.5">
              <span>🔧 Quick Firebase Solution Steps:</span>
            </p>
            <ol className="list-decimal pl-4.5 space-y-2 text-slate-600 font-medium">
              <li>
                Open the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline font-extrabold inline-flex items-center gap-0.5">Firebase Console ↗</a> in a new browser tab.
              </li>
              <li>
                Under <strong>Build/Authentication</strong> &rarr; go to the <strong>Sign-in method</strong> config tab.
              </li>
              <li>
                Click the <strong>Add new provider</strong> button, select the <strong>Email/Password</strong> provider, toggle it to <strong>Enabled</strong>, and hit <strong>Save</strong>!
              </li>
              <li>
                Repeat this to enable <strong>Google</strong> as an auth provider too for One-Click entry.
              </li>
            </ol>
          </div>
        )}

        {isUnauthorizedDomain && (
          <div className="p-3 bg-white border border-rose-100 rounded-xl space-y-2.5 text-slate-700 text-xs leading-relaxed shadow-2xs">
            <p className="font-bold text-slate-900 flex items-center gap-1.5 border-b border-rose-50 pb-1.5">
              <span>🌐 Authorized Domain Fix:</span>
            </p>
            <ol className="list-decimal pl-4.5 space-y-2 text-slate-600 font-medium">
              <li>
                Open <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline font-extrabold inline-flex items-center gap-0.5">Firebase Console ↗</a> &rarr; <strong>Authentication</strong>.
              </li>
              <li>
                Select the <strong>Settings</strong> sub-tab, then select <strong>Authorized domains</strong> list.
              </li>
              <li>
                Click <strong>Add domain</strong> and copy-paste exactly this hostname:
                <div className="bg-slate-100 px-2 py-1.5 rounded-lg text-slate-800 font-mono text-[10px] select-all break-all border border-slate-200 mt-1">
                  {typeof window !== "undefined" ? window.location.hostname : "ais-dev-zurcbszlpln6mxvjm5ngqx-306030133164.asia-southeast1.run.app"}
                </div>
              </li>
            </ol>
          </div>
        )}
      </div>
    );
  };

  const floatingHearts = Array.from({ length: 8 });

  return (
    <div className="relative min-h-screen bg-linear-to-b from-[#FDFBF7] via-[#FFF5F6] to-[#F3F8FB] text-slate-800 overflow-x-hidden flex flex-col justify-between font-sans">
      
      {/* Immersive Cozy Train Sunset Background Cover */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-[0.06] pointer-events-none mix-blend-multiply z-0" 
        style={{ backgroundImage: `url(${coupleTrainSunset})` }}
      />

      {/* Background Ambient Spheres */}
      <div className="absolute top-[-20%] left-[-10%] w-[35rem] h-[35rem] rounded-full bg-purple-200/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-pink-200/35 blur-3xl pointer-events-none" />
      <div className="absolute top-[40%] right-[10%] w-[25rem] h-[25rem] rounded-full bg-sky-200/30 blur-3xl pointer-events-none" />

      {/* Floating Animated Hearts in Background */}
      {floatingHearts.map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-pink-300/30 hidden md:block"
          style={{
            top: `${12 + i * 11}%`,
            left: `${5 + (i * 13) % 85}%`,
          }}
          animate={{
            y: [0, -20, 0],
            rotate: [0, i % 2 === 0 ? 20 : -20, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 5 + (i % 4),
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.4,
          }}
        >
          <Heart className="w-5 h-5 fill-pink-200/20" />
        </motion.div>
      ))}

      {/* Primary Header Navbar */}
      <header className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 flex justify-between items-center z-20">
        <div 
          onClick={() => setAuthView('none')} 
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="bg-pink-500 p-2 rounded-xl text-white shadow-xs group-hover:scale-105 transition-transform duration-300">
            <Heart className="w-6 h-6 fill-white" />
          </div>
          <span className="font-display font-extrabold text-2xl tracking-tight text-slate-800">
            ForeverNote
          </span>
        </div>

        <div className="flex items-center gap-4">
          {authView === 'none' ? (
            <>
              <button
                onClick={() => { setFormError(""); setAuthView('login'); }}
                className="text-slate-600 hover:text-slate-900 text-sm font-semibold transition"
              >
                Log In
              </button>
              <button
                onClick={() => { setFormError(""); setAuthView('signup'); }}
                className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white text-sm font-bold rounded-xl shadow-xs transition"
              >
                Create Love Space 💖
              </button>
            </>
          ) : (
            <button
              onClick={() => setAuthView('none')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Home
            </button>
          )}
        </div>
      </header>

      {/* Main Dynamic View Area */}
      <AnimatePresence mode="wait">
        {authView === 'none' ? (
          /* ================= LANDING MAIN COMPREHENSIVE VIEW ================= */
          <motion.div
            key="main-landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col"
          >
            {/* Hero Greeting Panel */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-10 sm:pb-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full z-10 flex-grow">
              {/* Left Column Description */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-50 rounded-full text-pink-600 font-bold text-xs tracking-wide shadow-2xs border border-pink-100/50">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Secure &amp; Shared Digital Scrapbook</span>
                </div>

                <h1 className="font-display font-black text-4xl sm:text-5xl md:text-6xl text-slate-900 leading-tight tracking-tight">
                  A beautiful and private <br className="hidden md:block"/>
                  <span className="text-linear-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
                    digital space
                  </span> <br />
                  created for loved ones.
                </h1>

                <p className="text-slate-600 text-base md:text-lg max-w-2xl mx-auto lg:mx-0 font-sans leading-relaxed">
                  A beautiful and private digital space created for couples, best friends, and loved ones to share emotions, memories, and special moments securely. Send secret messages, upload wishes, celebrate anniversaries, and receive reminders for your unforgettable days. Only the two connected people can view the memories, making every moment personal, emotional, and special.
                </p>

                <div className="flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-4 pt-4">
                  <button
                    onClick={() => setAuthView('signup')}
                    className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 group text-base cursor-pointer"
                  >
                    <span>Start Creating Your Space</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                  </button>
                  <button
                    onClick={() => setAuthView('login')}
                    className="w-full sm:w-auto px-6 py-4 bg-white/85 hover:bg-stone-50 text-slate-800 font-bold rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <span>Login to Your Space 💖</span>
                  </button>
                </div>
                
                <div className="flex flex-wrap justify-center lg:justify-start gap-6 pt-2 text-xs text-slate-500 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> End-to-end Private Access
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Safe Family/Friends Encryption
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Automated Smart Reminders
                  </span>
                </div>
              </div>

              {/* Right Column Custom Isometric Teaser Widget */}
              <div className="lg:col-span-5 w-full flex flex-col gap-6 justify-center">
                
                {/* Custom Polaroid Slideshow Widget */}
                <div className="relative w-full max-w-md bg-white rounded-3xl p-4 pb-5 border border-pink-100 shadow-2xl overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-pink-400 to-indigo-400" />
                  
                  {/* Polaroid Main Image Frame */}
                  <div className="relative aspect-4/3 w-full bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={activeSlide}
                        src={memoriedSlides[activeSlide].src}
                        alt={memoriedSlides[activeSlide].alt}
                        className="w-full h-full object-cover"
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                        referrerPolicy="no-referrer"
                      />
                    </AnimatePresence>

                    {/* Navigation Arrows */}
                    <button
                      onClick={() => setActiveSlide((prev) => (prev - 1 + memoriedSlides.length) % memoriedSlides.length)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md hover:scale-105 transition cursor-pointer z-10"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setActiveSlide((prev) => (prev + 1) % memoriedSlides.length)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md hover:scale-105 transition cursor-pointer z-10"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    
                    {/* Badge */}
                    <span className="absolute top-3 right-3 px-2.5 py-1 bg-pink-500/90 backdrop-blur-xs text-white text-[10px] font-bold rounded-full shadow-xs flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-pink-200 animate-pulse" /> Unlocked Memory
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="mt-4 text-center space-y-1.5 px-2">
                    <h3 className="font-display font-extrabold text-base text-slate-800 tracking-tight">
                      {memoriedSlides[activeSlide].title}
                    </h3>
                    <p className="text-slate-500 text-xs italic font-semibold leading-relaxed font-sans">
                      "{memoriedSlides[activeSlide].description}"
                    </p>
                  </div>

                  {/* Indicator Dots */}
                  <div className="flex justify-center gap-1.5 mt-3">
                    {memoriedSlides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveSlide(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${idx === activeSlide ? 'w-5 bg-pink-500' : 'w-1.5 bg-slate-200'}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Love Countdown & Teaser message card */}
                <div className="relative w-full max-w-md bg-white rounded-3xl p-5 border border-pink-100 shadow-xl overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-pink-400 to-indigo-400" />
                  
                  {/* Countdown Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-rose-50 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-500 font-semibold text-sm">
                        ⏳
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs">Love Countdown</h4>
                        <p className="text-[10px] text-pink-500 font-bold">Proposal Anniversary</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-bold rounded-full uppercase">
                      24h Reminders Active
                    </span>
                  </div>

                  <div className="text-center py-3 bg-linear-to-b from-rose-50/55 to-pink-50/20 rounded-2xl border border-pink-100/50 mb-3">
                    <div className="grid grid-cols-4 gap-1">
                      <div>
                        <span className="block font-display font-extrabold text-xl text-slate-800">124</span>
                        <span className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">Days</span>
                      </div>
                      <div>
                        <span className="block font-display font-extrabold text-xl text-slate-800">18</span>
                        <span className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">Hours</span>
                      </div>
                      <div>
                        <span className="block font-display font-extrabold text-xl text-slate-800">42</span>
                        <span className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">Mins</span>
                      </div>
                      <div>
                        <span className="block font-display font-extrabold text-xl text-pink-500 animate-pulse">05</span>
                        <span className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">Secs</span>
                      </div>
                    </div>
                  </div>

                  {/* Secret Chat Teaser Bubble */}
                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] uppercase font-inter font-bold text-slate-400">Secret Love Message</span>
                    <div className="bg-pink-500 text-white p-3 rounded-2xl rounded-tr-none shadow-xs text-[11px] leading-relaxed relative font-medium">
                      "I'm so incredibly lucky to have you. Tomorrow at exactly 8:00 AM, our private anniversary triggers. Cant wait to see what memory we unlock next! 💍"
                      <div className="text-[9px] text-pink-200 mt-1 flex justify-between items-center font-bold">
                        <span>Sender: Chloe</span>
                        <span className="flex items-center gap-1">🔒 Personal Encryption</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </section>

            {/* INTERACTIVE FEATURE SHOWCASE TAB SECTION */}
            <section className="bg-white/80 border-y border-stone-200/50 py-16 backdrop-blur-md z-15">
              <div className="max-w-7xl mx-auto px-6 space-y-12">
                <div className="text-center space-y-2">
                  <h2 className="font-display font-black text-3xl sm:text-4xl text-slate-900 tracking-tight">
                    Explore our private interactions
                  </h2>
                  <p className="text-slate-500 text-sm sm:text-base max-w-2xl mx-auto">
                    ForeverNote is equipped with bespoke relational modules built specifically to honor and organize your bonds.
                  </p>
                </div>

                {/* Tabs selection buttons */}
                <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto bg-slate-100/80 p-1.5 rounded-2xl">
                  <button
                    onClick={() => setActiveShowcaseTab('messages')}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${activeShowcaseTab === 'messages' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                  >
                    <MessageSquare className="w-4 h-4" /> Message Cards
                  </button>
                  <button
                    onClick={() => setActiveShowcaseTab('reminders')}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${activeShowcaseTab === 'reminders' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                  >
                    <Calendar className="w-4 h-4" /> Special Day Reminders
                  </button>
                  <button
                    onClick={() => setActiveShowcaseTab('wishes')}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${activeShowcaseTab === 'wishes' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                  >
                    <FileText className="w-4 h-4" /> Upload Wishes
                  </button>
                  <button
                    onClick={() => setActiveShowcaseTab('notifications')}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${activeShowcaseTab === 'notifications' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                  >
                    <Bell className="w-4 h-4" /> Smart Notifications
                  </button>
                  <button
                    onClick={() => setActiveShowcaseTab('couple')}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${activeShowcaseTab === 'couple' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                  >
                    <Users className="w-4 h-4" /> Couple Space
                  </button>
                </div>

                {/* Tab content screens */}
                <div className="bg-[#FAF9F6]/40 rounded-3xl p-6 sm:p-10 border border-slate-200/60 max-w-5xl mx-auto shadow-xs">
                  <AnimatePresence mode="wait">
                    {activeShowcaseTab === 'messages' && (
                      <motion.div
                        key="showcase-messages"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
                      >
                        <div className="space-y-4">
                          <span className="text-[10px] uppercase font-bold text-pink-600 bg-pink-50 px-2 py-1 rounded-md">
                            Feature Profile
                          </span>
                          <h3 className="font-display font-extrabold text-2xl text-slate-800">
                            Private Love Messages
                          </h3>
                          <p className="text-slate-600 text-sm leading-relaxed">
                            Send secret messages to someone special. Only the sender and receiver can read the messages securely inside the website.
                          </p>
                          <ul className="space-y-2 text-xs font-semibold text-slate-600">
                            <li className="flex items-center gap-2">
                              <span className="w-5 h-5 bg-pink-100 rounded-full flex items-center justify-center text-[10px]">❤️</span>
                              End-to-end private access
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="w-5 h-5 bg-pink-100 rounded-full flex items-center justify-center text-[10px]">✨</span>
                              Hidden emotional notes
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="w-5 h-5 bg-pink-100 rounded-full flex items-center justify-center text-[10px]">🔒</span>
                              Secure memory sharing
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="w-5 h-5 bg-pink-100 rounded-full flex items-center justify-center text-[10px]">💌</span>
                              Personalized message cards
                            </li>
                          </ul>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg space-y-4">
                          <div className="flex justify-between items-center border-b pb-2 text-[10px] font-bold text-slate-400">
                            <span>🔐 ENCRYPTED MEMORY CARD</span>
                            <span>#LOVE-CARD-89</span>
                          </div>
                          <div className="p-4 rounded-xl bg-linear-to-r from-red-500 to-pink-500 text-white space-y-2 shadow-xs">
                            <span className="text-[9px] uppercase font-bold bg-white/25 px-2 py-0.5 rounded-full inline-block">Romantic Rose Theme 🌹</span>
                            <p className="text-sm italic">"The best place in the world is right inside your hugs. Thank you for being my constant source of sunshine. Happy Anniversary!"</p>
                            <div className="text-[10px] text-pink-100 text-right font-medium">To: Special Person</div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeShowcaseTab === 'reminders' && (
                      <motion.div
                        key="showcase-reminders"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
                      >
                        <div className="space-y-4">
                          <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                            Milestone Tracking
                          </span>
                          <h3 className="font-display font-extrabold text-2xl text-slate-800">
                            Special Day Reminders
                          </h3>
                          <p className="text-slate-600 text-sm leading-relaxed">
                            Never forget your important relationship milestones again. Schedule automated notifications to count down and warn you before the big date arrives.
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
                            <div className="flex items-center gap-1.5 p-2 bg-indigo-50/50 rounded-lg border border-indigo-100/40">💍 Marriage Anniversary</div>
                            <div className="flex items-center gap-1.5 p-2 bg-indigo-50/50 rounded-lg border border-indigo-100/40">💖 Love Anniversary</div>
                            <div className="flex items-center gap-1.5 p-2 bg-indigo-50/50 rounded-lg border border-indigo-100/40">💬 First Chat Day</div>
                            <div className="flex items-center gap-1.5 p-2 bg-indigo-50/50 rounded-lg border border-indigo-100/40">🗓️ Proposal Day</div>
                            <div className="flex items-center gap-1.5 p-2 bg-indigo-50/50 rounded-lg border border-indigo-100/40">💫 Friendship Day</div>
                            <div className="flex items-center gap-1.5 p-2 bg-indigo-50/50 rounded-lg border border-indigo-100/40">☕ First Meet Day</div>
                            <div className="flex items-center gap-1.5 p-2 bg-indigo-50/50 rounded-lg border border-indigo-100/40">🎂 Birthday Wishes</div>
                            <div className="flex items-center gap-1.5 p-2 bg-indigo-50/50 rounded-lg border border-indigo-100/40">🪄 Custom Special Days</div>
                          </div>
                          <p className="text-xs text-indigo-500 font-bold">The website sends reminder notifications on the exact day!</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-lg space-y-3">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upcoming Alert Scheduler</h4>
                          <div className="space-y-2.5">
                            <div className="flex justify-between items-center p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                              <span className="font-bold text-xs text-indigo-900">First Meet Day ☕</span>
                              <span className="text-[12px] bg-indigo-600 text-white px-2 py-0.5 rounded font-bold">Starts tomorrow</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-purple-50/60 rounded-xl border border-purple-100">
                              <span className="font-bold text-xs text-purple-900">Love Anniversary ❤️</span>
                              <span className="text-[10px] text-slate-500 font-semibold">Scheduled: June 15</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeShowcaseTab === 'wishes' && (
                      <motion.div
                        key="showcase-wishes"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
                      >
                        <div className="space-y-4">
                          <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                            Dynamic Media Locker
                          </span>
                          <h3 className="font-display font-extrabold text-2xl text-slate-800">
                            Upload Wishes &amp; Memories
                          </h3>
                          <p className="text-slate-600 text-sm leading-relaxed font-sans">
                            Create a digital memory collection filled with genuine emotions. Log relationship items such as letters, voice loops, and media links.
                          </p>
                          <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-amber-900">
                            <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl flex flex-col items-center gap-1">
                              <FileText className="w-4 h-4 text-amber-500" />
                              <span>Love Letters</span>
                            </div>
                            <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl flex flex-col items-center gap-1">
                              <Camera className="w-4 h-4 text-amber-500" />
                              <span>Photos</span>
                            </div>
                            <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl flex flex-col items-center gap-1">
                              <Mic className="w-4 h-4 text-amber-500" />
                              <span>Voice Notes</span>
                            </div>
                            <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl flex flex-col items-center gap-1 col-span-3">
                              <span>Romantic wishes, videos &amp; friendship scrapbooks</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg space-y-4">
                          <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <span>📂 Real-Time Upload Board</span>
                          </div>
                          <div className="border-2 border-dashed border-amber-200 rounded-xl p-6 text-center space-y-2 bg-amber-50/10">
                            <span className="text-2xl block">🎙️</span>
                            <span className="font-bold text-xs block text-slate-700">Voice Note - "Happy Birthday.mp3"</span>
                            <span className="text-[10px] text-slate-400 block">Synthesized successfully &bull; Playback active</span>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden max-w-[150px] mx-auto">
                              <div className="bg-amber-500 h-full w-[80%]" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeShowcaseTab === 'notifications' && (
                      <motion.div
                        key="showcase-notifications"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
                      >
                        <div className="space-y-4">
                          <span className="text-[10px] uppercase font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md">
                            Smart Reminders
                          </span>
                          <h3 className="font-display font-extrabold text-2xl text-slate-800">
                            Smart Notifications
                          </h3>
                          <p className="text-slate-600 text-sm leading-relaxed">
                            Receive beautiful reminder notifications before your special day arrives so you can plan surprises ahead.
                          </p>
                          <div className="space-y-2 text-xs font-semibold text-slate-700">
                            <div className="p-3 bg-red-50/60 rounded-xl border border-red-100 flex items-center gap-3">
                              <span className="text-lg">❤️</span>
                              <span>“Tomorrow is your Love Anniversary ❤️”</span>
                            </div>
                            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center gap-3">
                              <span className="text-lg">💫</span>
                              <span>“Your Friendship Day memory is waiting 💫”</span>
                            </div>
                            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 flex items-center gap-3">
                              <span className="text-lg">🎉</span>
                              <span>“Today is your Proposal Day 🎉”</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-slate-950 p-5 rounded-2xl text-white font-mono text-[10px] shadow-2xl border border-purple-500/20 space-y-2">
                          <div className="text-slate-500 uppercase font-bold flex items-center justify-between border-b border-white/5 pb-2">
                            <span>📟 SYSTEM ALARM TELEMETRY</span>
                            <span className="text-purple-400">ACTIVE</span>
                          </div>
                          <p className="text-emerald-400">&gt; Scanning anniversary timestamps...</p>
                          <p className="text-pink-400">&gt; CRON_MATCH: Triggering June 1st Alert...</p>
                          <div className="p-2.5 bg-white/5 rounded-lg border border-white/10 text-slate-300">
                            <strong>Push Alert Broadcast:</strong> "Wishes locked! System reminder delivered on exact anniversary date."
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeShowcaseTab === 'couple' && (
                      <motion.div
                        key="showcase-couple"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
                      >
                        <div className="space-y-4">
                          <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                            Collaborative Sandbox
                          </span>
                          <h3 className="font-display font-extrabold text-2xl text-slate-800">
                            Couple Space
                          </h3>
                          <p className="text-slate-600 text-sm leading-relaxed">
                            Every couple gets their own private mini-space in which they can build and update interactive scrapbooks.
                          </p>
                          <div className="space-y-1.5 text-xs font-semibold text-slate-700">
                            <p className="flex items-center gap-2">🟢 <strong>Shared timeline:</strong> Consolidated memory logging in perfect sequence</p>
                            <p className="flex items-center gap-2">🟢 <strong>Memory gallery &amp; Wish board:</strong> Interactive catalog of romantic letters</p>
                            <p className="flex items-center gap-2">🟢 <strong>Secret chats:</strong> Double-blind private discussions</p>
                            <p className="flex items-center gap-2">🟢 <strong>Countdown timer:</strong> Live seconds countdown ticker</p>
                          </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-lg relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100 rounded-full blur-xl opacity-50" />
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">My Connected Space</h4>
                          <div className="flex gap-2 items-center p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                            <span className="text-lg">💑</span>
                            <div>
                              <span className="font-bold text-xs text-slate-800 block">Connected Partners: Alex &amp; Taylor</span>
                              <span className="text-[10px] text-emerald-600 font-semibold inline-block">🔒 Shared Sandbox Unlocked</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </section>

            {/* HOW IT WORKS HOW TO JOIN (STEPS 1-5) */}
            <section className="bg-linear-to-b from-white via-pink-50/10 to-[#FAF9F6] py-20">
              <div className="max-w-7xl mx-auto px-6 space-y-12">
                <div className="text-center space-y-2">
                  <h2 className="font-display font-black text-3xl sm:text-4xl text-slate-900 tracking-tight">
                    How ForeverNote Works
                  </h2>
                  <p className="text-slate-500 text-sm max-w-xl mx-auto font-sans">
                    Unlocking your digital sanctuary is simple. Relive your emotional benchmarks in 5 simple strides.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  {/* Step 1 */}
                  <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm relative space-y-3">
                    <span className="absolute -top-3 -left-3 w-8 h-8 bg-pink-500 text-white rounded-full flex items-center justify-center text-sm font-black shadow-xs">
                      1
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm pt-2">Step 1</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Create your private, securely encrypted personal account.
                    </p>
                  </div>
                  {/* Step 2 */}
                  <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm relative space-y-3">
                    <span className="absolute -top-3 -left-3 w-8 h-8 bg-pink-500 text-white rounded-full flex items-center justify-center text-sm font-black shadow-xs">
                      2
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm pt-2">Step 2</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Invite your special person using a custom private code or link.
                    </p>
                  </div>
                  {/* Step 3 */}
                  <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm relative space-y-3">
                    <span className="absolute -top-3 -left-3 w-8 h-8 bg-pink-500 text-white rounded-full flex items-center justify-center text-sm font-black shadow-xs">
                      3
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm pt-2">Step 3</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Start sharing secret messages, scrapbook memories, and wishes.
                    </p>
                  </div>
                  {/* Step 4 */}
                  <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm relative space-y-3">
                    <span className="absolute -top-3 -left-3 w-8 h-8 bg-pink-500 text-white rounded-full flex items-center justify-center text-sm font-black shadow-xs">
                      4
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm pt-2">Step 4</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Set your important special dates & countdown reminders.
                    </p>
                  </div>
                  {/* Step 5 */}
                  <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm relative space-y-3">
                    <span className="absolute -top-3 -left-3 w-8 h-8 bg-pink-500 text-white rounded-full flex items-center justify-center text-sm font-black shadow-xs">
                      5
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm pt-2">Step 5</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Receive reminders on the exact day and relive your memories together.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ABOUT US PARAGRAPHS */}
            <section className="bg-pink-50/30 border-t border-rose-100/50 py-16">
              <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-pink-500 mx-auto">
                  <Info className="w-6 h-6" />
                </div>
                <h3 className="font-display font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
                  About Us
                </h3>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-sans font-medium text-center">
                  ForeverNote was created to help people preserve emotions, memories, and relationships in a secure and beautiful way. In today’s busy world, special moments are often forgotten. Our platform helps couples and friends stay emotionally connected through memories, reminders, and heartfelt messages.
                </p>
                <div className="pt-2 text-xs text-pink-400 font-bold tracking-wider uppercase">
                  &bull; Safeguarded by Double-Layer Security &bull;
                </div>
              </div>
            </section>
          </motion.div>
        ) : authView === 'login' ? (
          /* ================= LOGIN VIEW PAGE ================= */
          <motion.div
            key="login-page"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex-grow max-w-md w-full mx-auto px-6 py-12 flex flex-col justify-center"
          >
            <div className="bg-white rounded-3xl p-8 border border-pink-100 shadow-2xl relative overflow-hidden space-y-6">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-pink-400 to-rose-450" />
              
              <div className="text-center space-y-2">
                <span className="text-3xl block">❤️</span>
                <h2 className="font-display font-black text-3xl text-slate-900 tracking-tight">
                  Welcome Back ❤️
                </h2>
                <p className="text-slate-500 text-xs">
                  Log in to continue your beautiful journey of memories and emotions.
                </p>
              </div>

              {renderFormError(formError)}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-pink-300 focus:bg-white rounded-xl text-sm focus:outline-hidden transition"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center whitespace-nowrap">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Password
                    </label>
                    <button
                      type="button"
                      id="forgot-password-trigger-btn"
                      onClick={handleForgotPasswordClick}
                      className="text-[10px] text-pink-600 hover:text-pink-700 font-bold transition hover:underline cursor-pointer"
                    >
                      Forgot / Reset Password?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-pink-300 focus:bg-white rounded-xl text-sm focus:outline-hidden transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-3.5 bg-slate-950 hover:bg-slate-850 text-white font-bold rounded-xl text-sm shadow-md transition cursor-pointer text-center"
                >
                  {formLoading ? "Unlocking Scrapbook..." : "Login"}
                </button>
              </form>

              {/* Google Alternative Entry */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-150"></div>
                <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">or sign in with</span>
                <div className="flex-grow border-t border-slate-150"></div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={isInIframe ? () => window.open(window.location.href, "_blank") : onGoogleSignIn}
                  disabled={isLoading}
                  className={`w-full py-2.5 ${isLoading ? "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200" : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 cursor-pointer"} border font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition duration-200`}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-1.5 animate-pulse">
                      <span>💫 Connecting securely...</span>
                    </span>
                  ) : (
                    <span>Google Account {isInIframe ? "One-Click (New Tab 🌐)" : "One-Click"}</span>
                  )}
                </button>

                {onDemoSignIn && (
                  <button
                    type="button"
                    onClick={onDemoSignIn}
                    className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Instant Guest Connection (Bypass Auth) ⚡</span>
                  </button>
                )}
              </div>

              {/* Iframe restricted notice & Info trigger */}
              {isInIframe && (
                <div id="iframe-login-restriction-card" className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl text-amber-900 text-xs font-medium space-y-3.5 leading-relaxed shadow-xs">
                  <div className="flex items-center gap-2 text-amber-950 font-bold text-[11px] uppercase tracking-wide">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>AI Studio Sandbox Notice</span>
                  </div>
                  <p>
                    Inside the nested iframe sandbox of AI Studio, Google Authentication and external popups may be blocked. Please click below to open the application in a new tab:
                  </p>
                  <button
                    type="button"
                    onClick={() => window.open(window.location.href, "_blank")}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition duration-200 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Open App in New Tab 🌐</span>
                  </button>
                </div>
              )}

              <div className="text-center pt-2">
                <p className="text-xs text-slate-500">
                  New to ForeverNote?{" "}
                  <button
                    onClick={() => { setFormError(""); setAuthView('signup'); }}
                    className="text-pink-600 hover:underline font-bold"
                  >
                    Create a free Love Space
                  </button>
                </p>
              </div>

              {/* Unique bottom quote required */}
              <div className="border-t border-rose-50 pt-4 text-center">
                <p className="text-xs text-rose-500 italic font-medium">
                  “Every memory begins with one message.”
                </p>
              </div>
            </div>
          </motion.div>
        ) : authView === 'signup' ? (
          /* ================= SIGNUP VIEW PAGE ================= */
          <motion.div
            key="signup-page"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex-grow max-w-md w-full mx-auto px-3 sm:px-6 py-6 sm:py-8 flex flex-col justify-center"
          >
            <div className="bg-white rounded-3xl p-8 border border-pink-100 shadow-2xl relative overflow-hidden space-y-6">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-pink-400 to-indigo-400" />

              <div className="text-center space-y-1">
                <span className="text-3xl block">💖</span>
                <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight">
                  Create Your Love Space 💖
                </h2>
                <p className="text-slate-500 text-xs">
                  Join ForeverNote and start creating unforgettable memories.
                </p>
              </div>

              {renderFormError(formError)}

              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="Your Display Name"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-pink-300 focus:bg-white rounded-xl text-xs focus:outline-hidden transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-pink-300 focus:bg-white rounded-xl text-xs focus:outline-hidden transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Create Password
                  </label>
                  <input
                    type="password"
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-pink-300 focus:bg-white rounded-xl text-xs focus:outline-hidden transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex justify-between items-center">
                    <span>Partner Invite Code (Optional)</span>
                    <span className="text-[9px] text-indigo-500 font-bold lowercase">Direct connection code</span>
                  </label>
                  <input
                    type="text"
                    value={signupPartnerCode}
                    onChange={(e) => setSignupPartnerCode(e.target.value)}
                    placeholder="e.g. FN-XYZ456"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-300 focus:bg-white rounded-xl text-xs focus:outline-hidden transition uppercase"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-3 bg-pink-500 hover:bg-pink-600 font-bold text-white rounded-xl text-sm shadow-md transition cursor-pointer text-center"
                >
                  {formLoading ? "Forging Connection..." : "Register & Connect"}
                </button>
              </form>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-150"></div>
                <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">or join with</span>
                <div className="flex-grow border-t border-slate-150"></div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={isInIframe ? () => window.open(window.location.href, "_blank") : onGoogleSignIn}
                  disabled={isLoading}
                  className={`w-full py-2.5 ${isLoading ? "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200" : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 cursor-pointer"} border font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition duration-200`}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-1.5 animate-pulse">
                      <span>💫 Connecting securely...</span>
                    </span>
                  ) : (
                    <span>Google Account {isInIframe ? "Setup (New Tab 🌐)" : "Setup"}</span>
                  )}
                </button>

                {onDemoSignIn && (
                  <button
                    type="button"
                    onClick={onDemoSignIn}
                    className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Instant Guest Connection (Bypass Auth) ⚡</span>
                  </button>
                )}
              </div>

              {/* Iframe restricted notice & Info trigger */}
              {isInIframe && (
                <div id="iframe-signup-restriction-card" className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl text-amber-900 text-xs font-medium space-y-3.5 leading-relaxed shadow-xs">
                  <div className="flex items-center gap-2 text-amber-950 font-bold text-[11px] uppercase tracking-wide">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>AI Studio Sandbox Notice</span>
                  </div>
                  <p>
                    Inside the nested iframe sandbox of AI Studio, Google Authentication and external popups may be blocked. Please click below to open the application in a new tab:
                  </p>
                  <button
                    type="button"
                    onClick={() => window.open(window.location.href, "_blank")}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition duration-200 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Open App in New Tab 🌐</span>
                  </button>
                </div>
              )}

              <div className="text-center pt-1.5">
                <p className="text-xs text-slate-500">
                  Already registered?{" "}
                  <button
                    onClick={() => { setFormError(""); setAuthView('login'); }}
                    className="text-pink-600 hover:underline font-bold"
                  >
                    Sign in with email
                  </button>
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ================= FORGOT / PASSWORD RECOVERY VIEW PAGE ================= */
          <motion.div
            key="forgot-page"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex-grow max-w-md w-full mx-auto px-6 py-12 flex flex-col justify-center animate-fade-in"
          >
            <div className="bg-white rounded-3xl p-8 border border-pink-100 shadow-2xl relative overflow-hidden space-y-6">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-pink-400 to-amber-500" />

              <div className="text-center space-y-2">
                <span className="text-3xl block">🔑</span>
                <h2 className="font-display font-black text-2xl text-slate-950 tracking-tight">
                  Recover / Setup Password Key 🔑
                </h2>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Enter your registered or Google email address below. We will send a secure password recovery / setup link to that email address instantly so you can customize your password! ❤️
                </p>
              </div>

              {renderFormError(formError)}

              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-pink-300 focus:bg-white rounded-xl text-xs focus:outline-hidden transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  {formLoading ? "Sending secure link..." : "Send Password Recovery Link 💌"}
                </button>
              </form>

              <div className="text-center pt-2 border-t border-slate-100 mt-4">
                <button
                  onClick={() => { setFormError(""); setAuthView('login'); }}
                  className="text-pink-600 hover:underline font-bold text-xs cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Landing Footer */}
      <footer className="py-8 text-center text-[11px] text-slate-400 font-sans tracking-wide z-10 max-w-7xl mx-auto w-full border-t border-slate-200/50 mt-12 bg-white/10 space-y-2">
        <p className="mb-1">© 2026 ForeverNote. Created to preserve your core emotions and special moments securely.</p>
        <p className="text-slate-400 font-medium">Equipped with automatic milestone reminders &amp; heart-to-heart expressive composition styles.</p>
        <div className="pt-2 border-t border-slate-200/20 max-w-xs mx-auto text-[10px] text-slate-400 font-mono tracking-widest uppercase">
          Designed &amp; Developed by <span className="text-pink-500 font-extrabold font-sans">KNK</span>
        </div>
      </footer>
    </div>
  );
}
