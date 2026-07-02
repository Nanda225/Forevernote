import { motion } from "motion/react";
import { Heart, Calendar, Sparkles, Award, Users, Smile } from "lucide-react";
import { UserProfile, Milestone } from "../types";

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

  // Calculate days together if anniversary is recorded
  const getDaysTogether = () => {
    if (!profile?.anniversaryDate) return null;
    try {
      const anniversary = new Date(profile.anniversaryDate);
      const today = new Date();
      // Calculate difference in ms
      const diffMs = today.getTime() - anniversary.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return diffDays >= 0 ? diffDays : 0;
    } catch {
      return null;
    }
  };

  const daysTogether = getDaysTogether();

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
          className="bg-slate-900 text-white p-6 rounded-2xl shadow-xs border border-slate-800 flex flex-col justify-between min-h-[140px] relative overflow-hidden"
        >
          {/* subtle background pattern */}
          <div className="absolute top-[-20%] right-[-10%] opacity-10 pointer-events-none">
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
            <div className="w-10 h-10 bg-slate-800 text-pink-400 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <p className="text-xs text-slate-400 z-10 flex items-center gap-1 mt-3">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>You visited this app <strong className="text-pink-300">{myGuestVisits || 0}</strong> {myGuestVisits === 1 ? 'time' : 'times'}</span>
          </p>
        </motion.div>
      )}
    </div>
  );
}
