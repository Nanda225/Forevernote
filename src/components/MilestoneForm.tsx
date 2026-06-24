import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Heart, Calendar, Sparkles, AlertCircle, Bell, Image, Upload, Trash2 } from "lucide-react";
import { Milestone, MilestoneType, LetterStyle, ReminderType, Reminder } from "../types";

interface MilestoneFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    milestone: {
      title: string;
      type: MilestoneType;
      date: string;
      description: string;
      aiLetterStyle: LetterStyle;
      imageUrl?: string;
    },
    reminder: {
      deliveryType: ReminderType;
      scheduledDate: string;
      enableReminder: boolean;
    }
  ) => Promise<void>;
  initialMilestone?: Milestone | null;
  initialReminder?: Reminder | null;
}

const MILESTONE_TYPES: MilestoneType[] = [
  "First Meet",
  "First Date",
  "First Talk",
  "First Trip",
  "Proposal",
  "Anniversary",
  "Custom",
];

const LETTER_STYLES: LetterStyle[] = [
  "Romantic",
  "Playful",
  "Cute",
  "Nostalgic",
  "Sarcastic",
  "GenZ Slang",
];

export default function MilestoneForm({
  isOpen,
  onClose,
  onSave,
  initialMilestone,
  initialReminder,
}: MilestoneFormProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<MilestoneType>("First Meet");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [aiLetterStyle, setAiLetterStyle] = useState<LetterStyle>("Romantic");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Reminder states
  const [enableReminder, setEnableReminder] = useState(false);
  const [deliveryType, setDeliveryType] = useState<ReminderType>("Email");
  const [scheduledDate, setScheduledDate] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if editing
  useEffect(() => {
    if (initialMilestone) {
      setTitle(initialMilestone.title);
      setType(initialMilestone.type);
      setDate(initialMilestone.date);
      setDescription(initialMilestone.description);
      setAiLetterStyle(initialMilestone.aiLetterStyle || "Romantic");
      setImageUrl(initialMilestone.imageUrl || "");
    } else {
      setTitle("");
      setType("First Meet");
      setDate("");
      setDescription("");
      setAiLetterStyle("Romantic");
      setImageUrl("");
    }

    if (initialReminder) {
      setEnableReminder(true);
      setDeliveryType(initialReminder.deliveryType);
      setScheduledDate(initialReminder.scheduledDate);
    } else {
      setEnableReminder(false);
      setDeliveryType("Email");
      setScheduledDate("");
    }
    setError("");
    setIsUploading(false);
    setIsDragOver(false);
  }, [initialMilestone, initialReminder, isOpen]);

  // When date changes, automatically set scheduled reminder to same date of next year, or anniversary date
  useEffect(() => {
    if (date && !scheduledDate && !initialReminder) {
      // Auto forecast scheduled reminder to next occurrence of YYYY-MM-DD
      const dateParts = date.split("-");
      if (dateParts.length === 3) {
        const year = new Date().getFullYear();
        setScheduledDate(`${year}-${dateParts[1]}-${dateParts[2]}`);
      }
    }
  }, [date]);

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, etc.).");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("Memory photobook upload is limited to files smaller than 12MB.");
      return;
    }
    try {
      setIsUploading(true);
      setError("");
      const { compressAndConvertToBase64 } = await import("../utils/imageCompressor");
      const base64 = await compressAndConvertToBase64(file);
      setImageUrl(base64);
    } catch (err: any) {
      console.error(err);
      setError("Could not optimize or process the selected image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      await processImageFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      await processImageFile(files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please write down a memorable title.");
      return;
    }
    if (!type) {
      setError("Please select a milestone type.");
      return;
    }
    if (!date) {
      setError("Please specify the date this precious moment happened.");
      return;
    }
    if (!description.trim()) {
      setError("Please write a small description of what went down!");
      return;
    }
    if (enableReminder && !scheduledDate) {
      setError("Please select a date for your Scheduled Reminder.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      await onSave(
        { title, type, date, description, aiLetterStyle, imageUrl },
        { deliveryType, scheduledDate, enableReminder }
      );
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Oops, couldn't save milestone.");
    } finally {
      setIsSubmitting(false);
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
            className="absolute inset-0 bg-stone-900/45 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Form Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative bg-white max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-3xl p-6 md:p-8 border border-stone-200/50 shadow-2xl z-10"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 hover:bg-stone-50 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-pink-100 p-2 rounded-xl text-pink-600">
                <Heart className="w-5 h-5 fill-pink-50" />
              </div>
              <div>
                <h2 className="font-display font-bold text-2xl text-gray-900 leading-tight">
                  {initialMilestone ? "Edit Milestone" : "Record Milestone"}
                </h2>
                <p className="text-gray-500 text-xs">Preserving cute memories forever</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Callout */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Title input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                  Memorable Milestone Title
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Accidental first coffee chat"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 focus:border-pink-300 focus:bg-white rounded-xl text-sm focus:outline-hidden transition"
                />
              </div>

              {/* Grid 2 Columns: Type & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                    Milestone Category
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as MilestoneType)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 focus:border-pink-300 focus:bg-white rounded-xl text-sm focus:outline-hidden cursor-pointer"
                  >
                    {MILESTONE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                    Precious Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 focus:border-pink-300 focus:bg-white rounded-xl text-sm focus:outline-hidden cursor-pointer"
                  />
                </div>
              </div>

              {/* Description box */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                  Sweet Description & Story
                </label>
                <textarea
                  rows={4}
                  maxLength={2500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what happened: what were you wearing, what joke was said, or why this day holds a special spot in your hearts."
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 focus:border-pink-300 focus:bg-white rounded-xl text-sm focus:outline-hidden resize-none transition"
                />
              </div>

              {/* Optional Scrapbook Photo Upload */}
              <div className="space-y-1.5" id="milestone-photo-upload-section">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                  Optional Memory Photo (Scrapbook Attachment)
                </label>
                
                {imageUrl ? (
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-purple-200 shadow-xs group bg-slate-50">
                    <img
                      src={imageUrl}
                      alt="Memory upload snapshot"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="px-3.5 py-1.5 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer border-none"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Photo</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                      isDragOver
                        ? "border-purple-400 bg-purple-50/55"
                        : "border-stone-200 hover:border-purple-300 hover:bg-stone-50/50 bg-stone-55"
                    }`}
                    onClick={() => document.getElementById("milestone-file-input")?.click()}
                  >
                    <input
                      id="milestone-file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="p-3 bg-white rounded-full shadow-3xs border border-stone-100 text-stone-400">
                      {isUploading ? (
                        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Image className="w-5 h-5 text-purple-400" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800">
                        {isUploading ? "Structuring and attaching sweet photo..." : "Upload a cozy photo memory"}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium">
                        Drag &amp; drop or click to upload (Optional)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Heartfelt Letter Style Preset */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-pink-500 animate-bounce" />
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                    Heartfelt Expression Style
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {LETTER_STYLES.map((style) => (
                    <button
                      type="button"
                      key={style}
                      onClick={() => setAiLetterStyle(style)}
                      className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                        aiLetterStyle === style
                          ? "bg-purple-100 text-purple-700 border-purple-300 shadow-2xs"
                          : "bg-stone-50 text-gray-600 border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reminder Section */}
              <div className="p-4 bg-sky-50/60 rounded-2xl border border-sky-100 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-sky-600" />
                    <div>
                      <span className="text-xs font-bold text-sky-900 block leading-tight">
                        Schedule Milestone Reminder
                      </span>
                      <span className="text-[10px] text-sky-600">Get notified via email or in-app calendar</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableReminder}
                    onChange={(e) => setEnableReminder(e.target.checked)}
                    className="w-4 h-4 accent-sky-600 rounded-lg cursor-pointer"
                  />
                </div>

                {enableReminder && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="pt-2.5 border-t border-sky-100/50 space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block mb-1">
                          Delivery Channel
                        </label>
                        <select
                          value={deliveryType}
                          onChange={(e) => setDeliveryType(e.target.value as ReminderType)}
                          className="w-full px-3 py-2 bg-white border border-sky-200 focus:outline-hidden rounded-lg text-xs cursor-pointer"
                        >
                          <option value="Email">Email Notification</option>
                          <option value="In-App">In-App Alert</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block mb-1">
                          Delivery Date
                        </label>
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-sky-200 focus:outline-hidden rounded-lg text-xs cursor-pointer"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Submit panel */}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 hover:bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-semibold rounded-xl text-sm shadow-md transition flex items-center justify-center cursor-pointer"
                >
                  {isSubmitting ? "Saving Love..." : initialMilestone ? "Update Milestone" : "Record Memory"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
