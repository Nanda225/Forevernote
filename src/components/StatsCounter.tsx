import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Heart, Calendar, Sparkles, Award, Users, Smile, X, 
  Search, Trash2, Globe, Monitor, Clock, Filter
} from "lucide-react";
import { UserProfile, Milestone } from "../types";
import { db, collection, onSnapshot, doc, deleteDoc } from "../firebase";

interface StatsCounterProps {
  profile: UserProfile | null;
  milestones: Milestone[];
  remindersCount: number;
  globalGuestVisits?: number;
  myGuestVisits?: number;
}

export default function ReusableStatsCounter({ 
  profile, 
  milestones, 
  remindersCount,
  globalGuestVisits,
  myGuestVisits
}: StatsCounterProps) {
  const isFriendshipMode = profile?.friendshipMode || false;
  
  // Modal, Log & User States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'visitors' | 'users'>('visitors');
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  // Parse User Agent into friendly format
  const parseUserAgent = (ua: string) => {
    if (!ua) return "Unknown Browser";
    let os = "Unknown OS";
    let browser = "Unknown Browser";

    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Macintosh") || ua.includes("Mac OS")) os = "macOS";
    else if (ua.includes("iPhone")) os = "iPhone";
    else if (ua.includes("iPad")) os = "iPad";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("Linux")) os = "Linux";

    if (ua.includes("Edg")) browser = "Edge";
    else if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("MSIE") || ua.includes("Trident")) browser = "IE";

    return `${browser} on ${os}`;
  };

  // Subscribe to visitor logs when modal opens
  useEffect(() => {
    if (!isModalOpen) return;

    setIsLoading(true);
    const logsRef = collection(db, "visitor_logs");
    
    const unsub = onSnapshot(logsRef, (snapshot: any) => {
      const list: any[] = [];
      snapshot.forEach((docSnap: any) => {
        list.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      
      // Sort client-side descending by timestamp to keep layout lightning fast and avoid composite index requirements
      list.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });

      setLogs(list);
      setIsLoading(false);
    }, (err: any) => {
      console.warn("Failed to subscribe to visitor logs:", err);
      setIsLoading(false);
    });

    return () => {
      unsub();
    };
  }, [isModalOpen]);

  // Subscribe to registered users when modal opens
  useEffect(() => {
    if (!isModalOpen) return;

    setIsUsersLoading(true);
    const usersRef = collection(db, "users");

    const unsub = onSnapshot(usersRef, (snapshot: any) => {
      const list: any[] = [];
      snapshot.forEach((docSnap: any) => {
        list.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      // Sort client-side descending by createdAt timestamp
      list.sort((a, b) => {
        const timeA = a.createdAt ? (a.createdAt.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime()) : 0;
        const timeB = b.createdAt ? (b.createdAt.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime()) : 0;
        return timeB - timeA;
      });

      setRegisteredUsers(list);
      setIsUsersLoading(false);
    }, (err: any) => {
      console.warn("Failed to subscribe to registered users:", err);
      setIsUsersLoading(false);
    });

    return () => {
      unsub();
    };
  }, [isModalOpen]);

  // Handle deleting a log entry
  const handleDeleteLog = async (logId: string) => {
    try {
      await deleteDoc(doc(db, "visitor_logs", logId));
    } catch (err) {
      console.error("Failed to delete log entry:", err);
    }
  };

  // Calculate days together if anniversary is recorded
  const getDaysTogether = () => {
    if (!profile?.anniversaryDate) return null;
    try {
      const anniversary = new Date(profile.anniversaryDate);
      const today = new Date();
      const diffMs = today.getTime() - anniversary.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return diffDays >= 0 ? diffDays : 0;
    } catch {
      return null;
    }
  };

  const daysTogether = getDaysTogether();

  // Filtered visitor logs
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const lower = searchQuery.toLowerCase();
    return logs.filter(log => {
      const name = (log.name || "").toLowerCase();
      const uaFriendly = parseUserAgent(log.userAgent).toLowerCase();
      const referrer = (log.referrer || "").toLowerCase();
      const platform = (log.platform || "").toLowerCase();
      const rawUa = (log.userAgent || "").toLowerCase();
      return name.includes(lower) || uaFriendly.includes(lower) || referrer.includes(lower) || platform.includes(lower) || rawUa.includes(lower);
    });
  }, [logs, searchQuery]);

  // Filtered registered users
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return registeredUsers;
    const lower = searchQuery.toLowerCase();
    return registeredUsers.filter(u => {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const partnerName = (u.partnerName || "").toLowerCase();
      const partnerEmail = (u.partnerEmail || "").toLowerCase();
      return name.includes(lower) || email.includes(lower) || partnerName.includes(lower) || partnerEmail.includes(lower);
    });
  }, [registeredUsers, searchQuery]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Primary Days Count (or Call to action) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative bg-gradient-to-br ${
          isFriendshipMode ? "from-teal-500 via-cyan-500 to-emerald-450" : "from-pink-500 to-rose-400"
        } text-white p-6 rounded-2xl shadow-md overflow-hidden flex flex-col justify-between min-h-[140px] md:col-span-1`}
      >
        {/* Sparkles / Background overlay */}
        <div className="absolute top-[-20%] right-[-10%] opacity-20 pointer-events-none">
          {isFriendshipMode ? (
            <Smile className="w-40 h-40 text-white" />
          ) : (
            <Heart className="w-40 h-40 fill-white" />
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            {isFriendshipMode ? (
              <Smile className="w-5 h-5 text-teal-100" />
            ) : (
              <Heart className="w-5 h-5 fill-pink-100 text-pink-100" />
            )}
            <span className={`text-xs uppercase font-bold tracking-wider ${isFriendshipMode ? "text-teal-50" : "text-pink-100"}`}>
              {isFriendshipMode ? "BFF Bond Journey" : "Days of Love"}
            </span>
          </div>
          {daysTogether !== null ? (
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-extrabold text-4xl">{daysTogether}</span>
              <span className={`text-sm font-medium ${isFriendshipMode ? "text-teal-50" : "text-pink-100"}`}>
                {isFriendshipMode ? "days of laughter" : "days together"}
              </span>
            </div>
          ) : (
            <span className="text-sm">
              {isFriendshipMode ? "Set your friendaversary date in Settings!" : "Set your anniversary date in Settings!"}
            </span>
          )}
        </div>

        <p className={`text-xs ${isFriendshipMode ? "text-teal-50" : "text-rose-100"} font-sans mt-3`}>
          {profile?.partnerName 
            ? isFriendshipMode 
              ? `Unstoppable BFF partnership with ${profile.partnerName} ⚡`
              : `Walking the path of life with ${profile.partnerName}`
            : isFriendshipMode 
              ? "No bestie friendship start date set yet"
              : "No relationship start date set yet"}
        </p>
      </motion.div>

      {/* Total Milestones Recordered */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white p-6 rounded-2xl shadow-xs border border-stone-150 flex flex-col justify-between min-h-[140px]"
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold tracking-wider text-gray-400 block">
              {isFriendshipMode ? "Friendship Milestones" : "Recorded Milestones"}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-extrabold text-4xl text-gray-800">
                {milestones.length}
              </span>
              <span className="text-sm text-gray-500 font-medium">{isFriendshipMode ? "stories" : "recorded"}</span>
            </div>
          </div>
          <div className={`w-10 h-10 ${isFriendshipMode ? "bg-teal-50 text-teal-650" : "bg-purple-50 text-purple-600"} rounded-xl flex items-center justify-center`}>
            {isFriendshipMode ? <Sparkles className="w-5 h-5" /> : <Award className="w-5 h-5" />}
          </div>
        </div>

        <p className="text-xs text-gray-500">
          {milestones.length > 0 
            ? `Latest adventure: "${milestones[0].title}"`
            : isFriendshipMode 
              ? "Let's record our silliest bestie adventure today!"
              : "Let's record your very first milestone today!"}
        </p>
      </motion.div>

      {/* Reminder Deliveries */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white p-6 rounded-2xl shadow-xs border border-stone-150 flex flex-col justify-between min-h-[140px]"
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold tracking-wider text-gray-400 block">
              {isFriendshipMode ? "Bestie Reminders" : "Active Reminders"}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-extrabold text-4xl text-gray-800">
                {remindersCount}
              </span>
              <span className="text-sm text-gray-500 font-medium">scheduled</span>
            </div>
          </div>
          <div className={`w-10 h-10 ${isFriendshipMode ? "bg-amber-50 text-amber-600" : "bg-sky-50 text-sky-600"} rounded-xl flex items-center justify-center`}>
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Email & In-App delivery scheduled</span>
        </p>
      </motion.div>

      {/* Secure Platform Visitor Stats (Private Admin view) */}
      {globalGuestVisits !== undefined && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 text-white p-6 rounded-2xl shadow-xs border border-slate-800 flex flex-col justify-between min-h-[140px] relative overflow-hidden cursor-pointer hover:border-pink-500/50 hover:shadow-lg transition-all group"
        >
          {/* subtle background pattern */}
          <div className="absolute top-[-20%] right-[-10%] opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-300">
            <Users className="w-32 h-32 text-white" />
          </div>

          <div className="flex justify-between items-start z-10">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-pink-500 animate-pulse" />
                Private Lounge visits
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display font-extrabold text-4.5xl text-white">
                  {globalGuestVisits}
                </span>
                <span className="text-xs text-slate-400 font-medium">global entries</span>
              </div>
            </div>
            <div className="w-10 h-10 bg-slate-800 text-pink-400 rounded-xl flex items-center justify-center group-hover:bg-pink-500/10 group-hover:text-pink-300 transition-colors">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="flex justify-between items-center z-10 mt-3 border-t border-slate-800/80 pt-2">
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>Your visits: <strong className="text-pink-300">{myGuestVisits || 0}</strong></span>
            </p>
            <span className="text-[10px] text-pink-400 font-semibold uppercase tracking-wider group-hover:translate-x-1 transition-transform">
              View List →
            </span>
          </div>
        </motion.div>
      )}

      {/* Visitor & Registered Users Logs List Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            {/* Backdrop click close */}
            <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-100"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-lg text-slate-900 leading-none">
                      Platform Access & User Registry
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Private Owner View • Real-time stats of registered couples and site traffic
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Subtab Navigation */}
              <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 py-2.5 gap-2.5 shrink-0 overflow-x-auto">
                <button
                  onClick={() => {
                    setActiveSubTab('visitors');
                    setSearchQuery('');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeSubTab === 'visitors'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Visitor Traffic Logs ({logs.length})</span>
                </button>
                <button
                  onClick={() => {
                    setActiveSubTab('users');
                    setSearchQuery('');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeSubTab === 'users'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Registered Accounts ({registeredUsers.length})</span>
                </button>
              </div>

              {/* Filters / Search */}
              <div className="p-4 bg-white border-b border-slate-50 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder={
                      activeSubTab === 'visitors'
                        ? "Search by browser, platform, OS, referrer or raw log details..."
                        : "Search registered users by name, email, partner details..."
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-hidden font-medium"
                  />
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* List Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                {activeSubTab === 'visitors' ? (
                  isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                      <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                      <span className="text-xs font-semibold">Retrieving guest access logs...</span>
                    </div>
                  ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3 bg-white border border-slate-100 rounded-2xl">
                      <Globe className="w-10 h-10 text-slate-300 stroke-1" />
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-700">No logs match your filter</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {logs.length === 0 ? "Logs will automatically populate when users visit the landing page." : "Try expanding your search query."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredLogs.map((log) => {
                        const dateObj = log.timestamp ? new Date(log.timestamp) : new Date();
                        const formattedDate = dateObj.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        });
                        const formattedTime = dateObj.toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        });

                        return (
                          <motion.div
                            key={log.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            {/* Info section */}
                            <div className="space-y-2">
                              {/* Visitor Name & Browser / Date Row */}
                              <div className="flex flex-wrap items-center gap-2">
                                {log.name ? (
                                  <span className="px-2.5 py-1 rounded-xl bg-pink-100 border border-pink-200 text-xs font-black text-pink-700 flex items-center gap-1 shadow-2xs">
                                    <Users className="w-3.5 h-3.5 shrink-0" />
                                    {log.name}
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5 shrink-0" />
                                    Anonymous Guest
                                  </span>
                                )}

                                <span className="font-display font-semibold text-xs text-slate-600">
                                  ({parseUserAgent(log.userAgent)})
                                </span>
                                
                                <span className="px-2 py-0.5 rounded-md bg-slate-50 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                                  {log.platform || "Unknown Web"}
                                </span>

                                {log.language && (
                                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-[10px] font-bold text-indigo-600">
                                    {log.language.toUpperCase()}
                                  </span>
                                )}
                              </div>

                              {/* Details Row */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-slate-500">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{formattedDate} at {formattedTime}</span>
                                </div>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Monitor className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">Referrer: <strong className="text-slate-700">{log.referrer || "Direct Link"}</strong></span>
                                </div>
                              </div>
                            </div>

                            {/* Action / Count Section */}
                            <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-slate-50 pt-2 sm:pt-0 shrink-0">
                              <div className="text-right">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                                  Browser Visits
                                </span>
                                <span className="font-display font-extrabold text-sm text-slate-800">
                                  {log.localVisits || 1} {log.localVisits === 1 ? 'time' : 'times'}
                                </span>
                              </div>

                              <button
                                onClick={() => handleDeleteLog(log.id)}
                                className="w-8 h-8 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors border border-slate-100 hover:border-rose-100"
                                title="Delete log entry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  isUsersLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                      <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                      <span className="text-xs font-semibold">Retrieving registered users...</span>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3 bg-white border border-slate-100 rounded-2xl">
                      <Users className="w-10 h-10 text-slate-300 stroke-1" />
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-700">No users match your filter</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {registeredUsers.length === 0 ? "Registered users will populate when accounts are created." : "Try expanding your search query."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredUsers.map((u) => {
                        const dateObj = u.createdAt ? (u.createdAt.seconds ? new Date(u.createdAt.seconds * 1000) : new Date(u.createdAt)) : new Date();
                        const formattedDate = dateObj.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        });
                        const formattedTime = dateObj.toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit"
                        });

                        const isPaired = !!u.connectedPartnerId;

                        return (
                          <motion.div
                            key={u.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                            <div className="space-y-3 flex-1 min-w-0">
                              {/* Header Row: User Name & Pairing Badge */}
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-display font-black text-sm text-slate-900 truncate">
                                  {u.name || "Unnamed User"}
                                </span>
                                
                                <span className="text-[10px] text-slate-500 font-mono select-all shrink-0">
                                  (ID: {u.id.substring(0, 8)}...)
                                </span>

                                {isPaired ? (
                                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-black text-emerald-700 flex items-center gap-1 shadow-2xs">
                                    <Heart className="w-3 h-3 fill-emerald-500 text-emerald-500 shrink-0" />
                                    <span>Paired / Linked</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700 flex items-center gap-1">
                                    <Heart className="w-3 h-3 text-amber-500 shrink-0" />
                                    <span>Pending Partner</span>
                                  </span>
                                )}

                                {u.friendshipMode && (
                                  <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-150 text-[10px] font-bold text-teal-700">
                                    Besties Mode
                                  </span>
                                )}
                              </div>

                              {/* Contact & Partnership details */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-600">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    User Account
                                  </span>
                                  <p className="font-semibold text-slate-800 truncate">{u.email || "No Email"}</p>
                                  <p className="text-[11px] text-slate-400">Joined: {formattedDate} at {formattedTime}</p>
                                </div>

                                <div className="space-y-1 border-t sm:border-t-0 sm:border-l sm:pl-6 border-slate-100 pt-2 sm:pt-0">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Partner Information
                                  </span>
                                  {isPaired || u.partnerName || u.partnerEmail ? (
                                    <>
                                      <p className="font-bold text-pink-600 truncate">
                                        {u.partnerName || "Unnamed Partner"}
                                      </p>
                                      <p className="text-[11px] text-slate-500 truncate">
                                        {u.partnerEmail || "No partner email"}
                                      </p>
                                    </>
                                  ) : (
                                    <p className="text-slate-400 italic font-medium">No partner paired yet</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>

              {/* Footer / Status */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-500 flex justify-between items-center shrink-0">
                {activeSubTab === 'visitors' ? (
                  <span>Showing <strong>{filteredLogs.length}</strong> of <strong>{logs.length}</strong> recorded access events</span>
                ) : (
                  <span>Showing <strong>{filteredUsers.length}</strong> of <strong>{registeredUsers.length}</strong> registered accounts</span>
                )}
                <span className="font-semibold text-slate-600">Privacy Secure Mode</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
