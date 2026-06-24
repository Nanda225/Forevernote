import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, Calendar, Trash2, Edit3, Heart, Mail, BellOff, Sparkles, Bell, Check, X } from "lucide-react";
import { Milestone, Reminder, ReminderType } from "../types";

interface MilestoneCardProps {
  key?: string;
  milestone: Milestone;
  reminder: Reminder | null;
  onEdit: (milestone: Milestone) => void;
  onDelete: (id: string) => void;
  onViewLetter: (milestone: Milestone) => void;
  onSaveReminder: (
    milestoneId: string,
    deliveryType: ReminderType,
    scheduledDate: string,
    isDelete?: boolean
  ) => Promise<void>;
}

export default function MilestoneCard({ milestone, reminder, onEdit, onDelete, onViewLetter, onSaveReminder }: MilestoneCardProps) {
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [deliveryType, setDeliveryType] = useState<ReminderType>("Email");

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

  // Translate milestone type to beautiful emojis/colors
  const getTypeMeta = (type: string) => {
    switch (type) {
      case "First Meet":
        return { emoji: "👋", bg: "bg-purple-100 text-purple-700 border-purple-200" };
      case "First Date":
        return { emoji: "☕", bg: "bg-pink-100 text-pink-700 border-pink-200" };
      case "First Talk":
        return { emoji: "📞", bg: "bg-sky-100 text-sky-700 border-sky-200" };
      case "First Trip":
        return { emoji: "✈️", bg: "bg-teal-100 text-teal-700 border-teal-200" };
      case "Proposal":
        return { emoji: "💍", bg: "bg-rose-100 text-rose-700 border-rose-200" };
      case "Anniversary":
        return { emoji: "❤️", bg: "bg-red-100 text-red-700 border-red-200" };
      default:
        return { emoji: "✨", bg: "bg-stone-100 text-stone-700 border-stone-200" };
    }
  };

  const meta = getTypeMeta(milestone.type);

  // Format YYYY-MM-DD into more human readable format, e.g. "January 14, 2024"
  const formatDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <motion.div
      layout
      transition={{ duration: 0.3 }}
      className="group relative bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden"
    >
      {/* Decorative colored line on hover */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-pink-400 via-purple-400 to-sky-400 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div>
        {/* Header containing meta and action buttons */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">{meta.emoji}</span>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border tracking-wide uppercase ${meta.bg}`}>
              {milestone.type}
            </span>
          </div>

          <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(milestone)}
              className="p-1.5 bg-stone-55 hover:bg-purple-50 text-stone-600 hover:text-purple-600 rounded-lg transition duration-200"
              title="Edit Milestone"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(milestone.id)}
              className="p-1.5 bg-stone-55 hover:bg-rose-50 text-stone-600 hover:text-rose-600 rounded-lg transition duration-200"
              title="Delete Milestone"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Milestone Main Content */}
        <div className="space-y-2">
          <h3 className="font-display font-semibold text-lg text-gray-800 tracking-tight leading-snug group-hover:text-purple-800 transition-colors">
            {milestone.title}
          </h3>

          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
            <span>{formatDate(milestone.date)}</span>
          </div>

          <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
            {milestone.description}
          </p>

          {milestone.imageUrl && (
            <div className="mt-3.5 aspect-video w-full rounded-xl overflow-hidden border border-stone-200/65 relative bg-slate-50 shadow-3xs group/img">
              <img
                src={milestone.imageUrl}
                alt={milestone.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover/img:scale-[1.03] transition-transform duration-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Embedded interactive scheduler sliding form */}
      <AnimatePresence>
        {isSchedulerOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-rose-100 bg-pink-50/10 p-3 rounded-2xl border border-pink-100/30 space-y-3 shrink-0"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider flex items-center gap-1">
                <span className="animate-pulse">🔔</span> Configure Milestone Reminder
              </span>
              <button
                onClick={() => setIsSchedulerOpen(false)}
                className="p-1 hover:bg-rose-50 rounded-lg text-slate-505 hover:text-red-500 transition cursor-pointer"
                type="button"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Channel</label>
                <select
                  value={deliveryType}
                  onChange={(e) => setDeliveryType(e.target.value as ReminderType)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="Email">📧 Email</option>
                  <option value="In-App">📱 In-App Alert</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Alert Date</label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-800 outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setIsSchedulerOpen(false)}
                className="px-3 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!scheduledDate) return;
                  await onSaveReminder(milestone.id, deliveryType, scheduledDate);
                  setIsSchedulerOpen(false);
                }}
                className="px-3 py-1 text-[10px] font-bold bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition shadow-3xs cursor-pointer"
                type="button"
              >
                Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer block containing reminders state and AI Letter launcher */}
      <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between gap-2">
        {/* Reminder Pill Info */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {reminder ? (
            <div className="flex items-center gap-1 flex-wrap">
              <div
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase cursor-pointer transition ${
                  reminder.deliveryType === 'Email'
                    ? 'bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100'
                    : 'bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100'
                }`}
                onClick={() => {
                  setScheduledDate(reminder.scheduledDate);
                  setDeliveryType(reminder.deliveryType);
                  setIsSchedulerOpen(true);
                }}
                title="Click to edit reminder parameters"
              >
                <Mail className="w-3 h-3" />
                <span>{reminder.deliveryType} Scheduled ({formatDate(reminder.scheduledDate)})</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Do you want to cancel the scheduled reminder for this milestone?")) {
                    onSaveReminder(milestone.id, reminder.deliveryType, reminder.scheduledDate, true);
                  }
                }}
                className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition cursor-pointer"
                title="Cancel Reminder"
              >
                <Trash2 className="w-3 h-3 text-red-500" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setScheduledDate(getSensibleDefaultDate(milestone.date));
                setDeliveryType("Email");
                setIsSchedulerOpen(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold text-pink-600 hover:bg-pink-50 border border-pink-200/50 bg-pink-55 transition cursor-pointer"
              title="Add Scheduled Reminder"
            >
              <Bell className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
              <span>+ Add Reminder</span>
            </button>
          )}
        </div>

        {/* Open AI Letter / Create Letter Button */}
        <button
          onClick={() => onViewLetter(milestone)}
          className="px-3.5 py-1.5 bg-linear-to-r from-purple-600 to-pink-500 hover:from-purple-75 hover:to-pink-65 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 shadow-sm hover:shadow-md transition duration-200 cursor-pointer shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Greetings Letter</span>
        </button>
      </div>
    </motion.div>
  );
}
