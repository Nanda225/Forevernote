import { motion } from "motion/react";
import { Heart, Calendar, Sparkles, Award } from "lucide-react";
import { UserProfile, Milestone } from "../types";

interface StatsCounterProps {
  profile: UserProfile | null;
  milestones: Milestone[];
  remindersCount: number;
}

export default function ReusableStatsCounter({ profile, milestones, remindersCount }: StatsCounterProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Primary Days Count (or Call to action) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-gradient-to-br from-pink-500 to-rose-400 text-white p-6 rounded-2xl shadow-md overflow-hidden flex flex-col justify-between min-h-[140px] md:col-span-1"
      >
        {/* Sparkles / Background overlay */}
        <div className="absolute top-[-20%] right-[-10%] opacity-20 pointer-events-none">
          <Heart className="w-40 h-40 fill-white" />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-5 h-5 fill-pink-100 text-pink-100" />
            <span className="text-xs uppercase font-bold tracking-wider text-pink-100">
              Days of Love
            </span>
          </div>
          {daysTogether !== null ? (
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-extrabold text-4xl">{daysTogether}</span>
              <span className="text-sm font-medium text-pink-100">days together</span>
            </div>
          ) : (
            <span className="text-sm">Set your anniversary date in Settings!</span>
          )}
        </div>

        <p className="text-xs text-rose-100 font-sans mt-3">
          {profile?.partnerName 
            ? `Walking the path of life with ${profile.partnerName}`
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
              Recorded Milestones
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-extrabold text-4xl text-gray-800">
                {milestones.length}
              </span>
              <span className="text-sm text-gray-500 font-medium">recorded</span>
            </div>
          </div>
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <p className="text-xs text-gray-500">
          {milestones.length > 0 
            ? `Latest milestone: "${milestones[0].title}"`
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
              Active Reminders
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-extrabold text-4xl text-gray-800">
                {remindersCount}
              </span>
              <span className="text-sm text-gray-500 font-medium">scheduled</span>
            </div>
          </div>
          <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Email & In-App delivery scheduled</span>
        </p>
      </motion.div>
    </div>
  );
}
