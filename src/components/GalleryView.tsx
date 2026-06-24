import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Camera, Plus, Search, Calendar, Heart, Trash2, X, Filter, 
  ExternalLink, Sparkles, Smile, Image as ImageIcon, AlertCircle, RefreshCw, Upload
} from "lucide-react";
import { db, OperationType, handleFirestoreError, collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, where, serverTimestamp, getDocs } from "../firebase";
import { GalleryItem, UserProfile } from "../types";

interface GalleryViewProps {
  user: any;
  profile: UserProfile | null;
  showNotification: (type: "success" | "error" | "info", msg: string) => void;
}

const CATEGORIES = [
  { id: "All", name: "All Memories 🌸" },
  { id: "Travel", name: "Road-Trips & Wanders ✈️" },
  { id: "Dates", name: "Cozy Café & Dinner Dates ☕" },
  { id: "Selfies", name: "Cute Sells & Cozy Snaps 📸" },
  { id: "Special", name: "Golden Anniversary & Milestones 💖" },
  { id: "Candid", name: "Silly Candid Moments 🍂" },
];

const PRESET_BACKDROPS = [
  { 
    name: "Golden Flight 🌅", 
    category: "Travel",
    url: "https://images.unsplash.com/photo-1527631746610-bca00a040d60?q=80&w=800&auto=format&fit=crop" 
  },
  { 
    name: "Warm Cabin Roast 🔥", 
    category: "Dates",
    url: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?q=80&w=800&auto=format&fit=crop" 
  },
  { 
    name: "Cozy Latte Pour ☕", 
    category: "Dates",
    url: "https://images.unsplash.com/photo-1517256064527-09c53b2d0bc6?q=80&w=800&auto=format&fit=crop" 
  },
  { 
    name: "Sunset Strolls 🌊", 
    category: "Special",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop" 
  },
  { 
    name: "Cherry Petal Snow 🌸", 
    category: "Selfies",
    url: "https://images.unsplash.com/photo-1522748906645-95d8adfd52c7?q=80&w=800&auto=format&fit=crop" 
  },
  { 
    name: "Bright Cozy Knits ✨", 
    category: "Candid",
    url: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=800&auto=format&fit=crop" 
  }
];

const EMOTE_OPTIONS = ["❤️", "🥰", "⭐️", "🔥", "🌸", "🍕"];

export default function GalleryView({ user, profile, showNotification }: GalleryViewProps) {
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Create state
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("Dates");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // Local upload states
  const [imageMode, setImageMode] = useState<"upload" | "link">("upload");
  const [isDragActive, setIsDragActive] = useState(false);

  // Compress and handle selected image file
  const compressAndSetImage = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showNotification("error", "Please select a valid image file. 🌸");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Optimize and limit to 1600px max width/height to support high-density retina photography up to 2.5MB
        const MAX_SIZE = 1600;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress as JPEG
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.85);
          setImageUrl(compressedBase64);
          showNotification("success", "Processed and compressed image beautifully! ✨ Ready to pin.");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      compressAndSetImage(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      compressAndSetImage(e.target.files[0]);
    }
  };

  // Lightbox / Detail Modal state
  const [activeItem, setActiveItem] = useState<GalleryItem | null>(null);

  const partnerId = profile?.connectedPartnerId;

  // Real-time listener for Gallery items
  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);

    const galleryRef = collection(db, "gallery_items");
    
    // Auto-update any of current user's gallery items that have empty/mismatched partnerId to ensure retro-active syncing
    if (partnerId) {
      const qUploadedToUpdate = query(galleryRef, where("userId", "==", user.uid));
      getDocs(qUploadedToUpdate).then((snapshot) => {
        snapshot.forEach(async (docSnap) => {
          const data = docSnap.data();
          if (data.partnerId !== partnerId) {
            try {
              await updateDoc(docSnap.ref, { partnerId: partnerId });
              console.log(`[AutoHeal] Successfully synced retro-active partnerId to ${partnerId} for photo ${docSnap.id}`);
            } catch (err) {
              console.error("Failed to auto-heal partnerId for item:", docSnap.id, err);
            }
          }
        });
      }).catch(err => console.error("Error fetching items for auto-heal:", err));
    }
    
    // Formulate two clean, statically-verifiable queries:
    // 1. Where the current user is the uploader
    const qUploaded = query(galleryRef, where("userId", "==", user.uid));
    
    // 2. Where the current user is the partner of the uploader
    const qShared = partnerId 
      ? query(galleryRef, where("partnerId", "==", user.uid))
      : null;

    let itemsUploaded: GalleryItem[] = [];
    let itemsShared: GalleryItem[] = [];

    const handleUpdate = (uploaded: GalleryItem[], shared: GalleryItem[]) => {
      // Merge elements, filtering duplicates
      const combined = [...uploaded];
      shared.forEach(item => {
        if (!combined.some(c => c.id === item.id)) {
          combined.push(item);
        }
      });

      // Sort client-side to bypass composite indexing requirement
      const sorted = combined.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateB - dateA; // Primary sort: date desc
        
        const createA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
        const createB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
        return createB - createA; // Secondary sort: creation desc
      });

      setGalleryItems(sorted);
      setLoading(false);
    };

    // Listen to current user's uploaded items
    const unsubscribeUploaded = onSnapshot(qUploaded, (snapshot) => {
      const items: GalleryItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          userId: data.userId,
          partnerId: data.partnerId,
          title: data.title,
          caption: data.caption,
          imageUrl: data.imageUrl,
          category: data.category,
          date: data.date,
          reactions: data.reactions || {},
          createdAt: data.createdAt
        });
      });
      itemsUploaded = items;
      handleUpdate(itemsUploaded, itemsShared);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "gallery_items");
      showNotification("error", "Failed to sync your photos.");
      setLoading(false);
    });

    // Listen to shared items from the partner (where partnerId equals current user's uid)
    let unsubscribeShared = () => {};
    if (qShared) {
      unsubscribeShared = onSnapshot(qShared, (snapshot) => {
        const items: GalleryItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            userId: data.userId,
            partnerId: data.partnerId,
            title: data.title,
            caption: data.caption,
            imageUrl: data.imageUrl,
            category: data.category,
            date: data.date,
            reactions: data.reactions || {},
            createdAt: data.createdAt
          });
        });
        itemsShared = items;
        handleUpdate(itemsUploaded, itemsShared);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, "gallery_items");
        showNotification("error", "Failed to sync shared photos from partner.");
        setLoading(false);
      });
    } else {
      // If no partner linked, update with empty list
      handleUpdate(itemsUploaded, []);
    }

    return () => {
      unsubscribeUploaded();
      unsubscribeShared();
    };
  }, [user?.uid, partnerId]);

  // Handle adding custom visual memory
  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl.trim() || !caption.trim()) {
      showNotification("error", "Write some cozy details and paste/select an image URL 🌸");
      return;
    }

    setSaving(true);
    const photoId = `photo_${Date.now()}`;
    const newPath = `gallery_items`;

    try {
      const payload: Omit<GalleryItem, "id"> = {
        userId: user.uid,
        partnerId: profile?.connectedPartnerId || partnerId || "",
        title: title.trim(),
        caption: caption.trim(),
        imageUrl: imageUrl.trim(),
        category,
        date,
        reactions: {},
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, "gallery_items", photoId), payload);
      
      showNotification("success", "Locked in a warm physical photo snapshot memory! 📸✨");
      setIsAdding(false);
      
      // Cleanup inputs
      setTitle("");
      setCaption("");
      setImageUrl("");
      setCategory("Dates");
      setDate(new Date().toISOString().split("T")[0]);
    } catch (err: any) {
      console.error("Firestore error while saving gallery photo:", err);
      showNotification("error", "Failed to preserve photo: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle reaction updates (sticker tags)
  const handleAddReaction = async (itemId: string, emoji: string) => {
    if (!user?.uid) return;
    try {
      const item = galleryItems.find(i => i.id === itemId);
      if (!item) return;

      const updatedReactions = { ...(item.reactions || {}) };
      
      // If same user selected same emoji, remove it. Otherwise add or update it.
      if (updatedReactions[user.uid] === emoji) {
        delete updatedReactions[user.uid];
      } else {
        updatedReactions[user.uid] = emoji;
      }

      await updateDoc(doc(db, "gallery_items", itemId), {
        reactions: updatedReactions
      });

      // Update local state for lightbox instant gratification
      if (activeItem && activeItem.id === itemId) {
        setActiveItem({
          ...activeItem,
          reactions: updatedReactions
        });
      }
    } catch (err: any) {
      showNotification("error", "Failed to stamp sticker: " + err.message);
    }
  };

  // Handle deleting visual memory
  const handleDeleteMemory = async (itemId: string, creatorUid: string) => {
    if (creatorUid !== user.uid) {
      showNotification("error", "Only the partner who pinned this memory can put it away 🔒");
      return;
    }

    if (!window.confirm("Are you sure you want to dismantle this visual keepsake from your gallery?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "gallery_items", itemId));
      showNotification("success", "Keepsake put away of the gallery.");
      if (activeItem?.id === itemId) {
        setActiveItem(null);
      }
    } catch (err: any) {
      showNotification("error", "Failed to delete: " + err.message);
    }
  };

  // Filter and search computation
  const filteredItems = galleryItems.filter(item => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const cleanQuery = searchQuery.toLowerCase();
    const matchesSearch = 
      item.title.toLowerCase().includes(cleanQuery) || 
      item.caption.toLowerCase().includes(cleanQuery) || 
      item.category.toLowerCase().includes(cleanQuery);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8" id="forevernote-cozy-gallery">
      {/* Intro section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-y-4 bg-gradient-to-tr from-pink-50/50 via-rose-50/20 to-stone-50 p-6 rounded-3xl border border-pink-100/45 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-pink-500 text-white rounded-xl shadow-sm shadow-pink-500/20 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-display font-black tracking-tight text-slate-800">
              Cozy Collage Gallery
            </h2>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            A secure shared frame for your favorite golden hours, trips, cozy coffee dates, and silly snaps. Add custom stickers, stamp reactions, and explore your scrapbook visually.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2.5 bg-pink-500 hover:bg-pink-600 active:scale-95 text-white font-bold rounded-2xl text-xs transition cursor-pointer flex items-center gap-1.5 self-start md:self-center shadow-lg shadow-pink-500/10"
        >
          {isAdding ? (
            <>
              <X className="w-4 h-4" />
              <span>Cancel Collage</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 text-white" />
              <span>Pin New Memory</span>
            </>
          )}
        </button>
      </div>

      {/* Adding collage memory dialog panel */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl p-6 border border-slate-150 shadow-md space-y-6"
          >
            <div className="flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-pink-500 animate-pulse" />
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Pin a Cozy Memory Backdrop</h3>
            </div>

            <form onSubmit={handleAddMemory} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Form controls */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block pb-1">Memory Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Autumn Walk in Central Park 🍁"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-pink-350 focus:bg-white rounded-xl text-xs font-semibold focus:outline-none transition text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block pb-1">Memory Date</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-pink-350 focus:bg-white rounded-xl text-xs font-semibold focus:outline-none transition text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block pb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-pink-350 focus:bg-white rounded-xl text-xs font-semibold focus:outline-none transition text-slate-800 cursor-pointer"
                    >
                      <option value="Dates">☕ Cozy Dates</option>
                      <option value="Travel">✈️ Roadtrips</option>
                      <option value="Selfies">📸 Cute Snaps</option>
                      <option value="Special">💖 Special Days</option>
                      <option value="Candid">🍂 Silly Candid</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block pb-1">Handwritten Captions & Details</label>
                  <textarea
                    required
                    rows={3}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Describe the sweet feeling, cold breezes, or laughs you shared that day..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-pink-350 focus:bg-white rounded-xl text-xs font-semibold focus:outline-none transition text-slate-800 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block pb-1">Image Source</span>
                  <div className="flex gap-2 p-1 bg-slate-50 border border-slate-200/65 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setImageMode("upload");
                        setImageUrl("");
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                        imageMode === "upload" 
                          ? "bg-white text-pink-600 shadow-xs" 
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      📸 Upload Picture
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImageMode("link");
                        setImageUrl("");
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                        imageMode === "link" 
                          ? "bg-white text-pink-600 shadow-xs" 
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      🔗 Web Image URL
                    </button>
                  </div>

                  {imageMode === "upload" ? (
                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-xl p-4 transition text-center flex flex-col items-center justify-center min-h-[140px] cursor-pointer ${
                        isDragActive 
                          ? "border-pink-500 bg-pink-50/40" 
                          : imageUrl && imageUrl.startsWith("data:") 
                            ? "border-emerald-300 bg-emerald-50/10" 
                            : "border-slate-200 hover:border-pink-300 bg-slate-50/40"
                      }`}
                      onClick={() => {
                        document.getElementById("photo-upload-input")?.click();
                      }}
                    >
                      <input 
                        id="photo-upload-input"
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />

                      {imageUrl && imageUrl.startsWith("data:") ? (
                        <div className="space-y-3 w-full" onClick={(e) => e.stopPropagation()}>
                          <div className="relative w-20 h-20 mx-auto rounded-lg overflow-hidden border border-slate-200 shadow-xs">
                            <img src={imageUrl} alt="Compressed preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/10 flex items-center justify-center text-white text-[9px] font-bold">
                              Ready!
                            </div>
                          </div>
                          <div className="space-y-1 text-center">
                            <span className="text-[10px] font-bold text-slate-600 block">✓ Photo Loaded & Compressed</span>
                            <button
                              type="button"
                              onClick={() => setImageUrl("")}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg text-[9px] font-extrabold transition uppercase tracking-wider cursor-pointer"
                            >
                              Clear Photo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 pointer-events-none">
                          <Upload className="w-6 h-6 mx-auto text-slate-400 animate-bounce" />
                          <div className="space-y-0.5">
                            <span className="text-[10.5px] font-black text-slate-600 block">
                              Drag-and-Drop Picture Here
                            </span>
                            <span className="text-[9.5px] text-slate-400 block font-bold">
                              or click anywhere to browse
                            </span>
                          </div>
                          <span className="text-[8.5px] font-extrabold text-pink-400 uppercase tracking-widest block pt-0.5 animate-pulse">
                            Auto-Optimized for Cloud storage 🌸
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/photo-..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-pink-350 focus:bg-white rounded-xl text-xs font-semibold focus:outline-none transition text-slate-800"
                      />
                      <span className="text-[8px] text-slate-400 block pt-1 font-bold leading-tight">
                        Tip: You can paste any .jpg, .png, or web image address, or choose a template preset on the right side.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Pre-designed template presets selection */}
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block pb-1">
                    Instant Cozy Backdrops (Pick one to load!)
                  </span>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 max-h-[220px] overflow-y-auto pr-1">
                    {PRESET_BACKDROPS.map((preset, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setImageMode("link");
                          setImageUrl(preset.url);
                          setCategory(preset.category);
                          if (!title) {
                            setTitle(preset.name);
                          }
                          showNotification("info", `Aesthetic image "${preset.name}" selected! 🎨`);
                        }}
                        className={`group relative h-20 rounded-xl overflow-hidden text-left border-2 transition cursor-pointer ${
                          imageUrl === preset.url ? "border-pink-500 scale-98 shadow-sm" : "border-slate-100 hover:border-pink-200"
                        }`}
                      >
                        <img 
                          src={preset.url} 
                          alt={preset.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-1.5">
                          <span className="text-[9px] font-black text-white/95 leading-none tracking-tight">
                            {preset.name}
                          </span>
                          <span className="text-[7px] text-white/65 mt-0.5 uppercase tracking-wide">
                            {preset.category}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 flex justify-end gap-x-2">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-pink-500 hover:bg-pink-600 disabled:bg-slate-350 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Preserving...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Lock In Memory Card</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control sub-heading: Category Filters & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-y-3 bg-white p-4 rounded-2xl border border-slate-100/70 shadow-sm">
        {/* Category Filters */}
        <div className="flex items-center gap-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none pr-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:inline" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat.id 
                  ? "bg-pink-50 text-pink-600 border border-pink-100" 
                  : "bg-slate-50 hover:bg-stone-100 text-slate-600 border border-transparent"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative md:max-w-xs w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-3.5 h-3.5 text-slate-400" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cozy Polaroid titles..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-pink-350 focus:bg-white rounded-xl text-xs font-bold focus:outline-none transition text-slate-800"
          />
        </div>
      </div>

      {/* Gallery Cards Container */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing Love Ledger Snaps...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-3xl text-center space-y-4">
          <div className="p-4 bg-slate-50 rounded-full flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-slate-300" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black text-slate-700">No Visual Keepsakes Scattered Here yet</h4>
            <p className="text-xs text-slate-500 max-w-sm">
              {searchQuery || selectedCategory !== "All"
                ? "No photo memories fit your current categories or search filters. Try widening your view."
                : "Your gallery is currently empty! Frame your first coffee stroll, midnight ride, or smiling selfie above."}
            </p>
          </div>
          {!isAdding && (searchQuery || selectedCategory !== "All" ? null : (
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-pink-500 text-white text-xs font-bold rounded-xl hover:bg-pink-600 transition"
            >
              Create First Photo Card
            </button>
          ))}
        </div>
      ) : (
        <motion.div 
          layout 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredItems.map((item) => {
            const isCreator = item.userId === user.uid;
            
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="group bg-white p-4 pb-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg transition duration-200 flex flex-col relative rotate-0 hover:-rotate-1"
                title="Click photo to inspect full keepsake size"
              >
                {/* Visual Category Label Badge */}
                <span className="absolute top-6 left-6 z-10 px-2 py-1 bg-black/60 text-white rounded-lg text-[9px] font-black uppercase tracking-wider backdrop-blur-xs">
                  {item.category === "Dates" && "☕ Date"}
                  {item.category === "Travel" && "✈️ Travel"}
                  {item.category === "Selfies" && "📸 Cute Snap"}
                  {item.category === "Special" && "💖 Highlight"}
                  {item.category === "Candid" && "🍂 Candid"}
                </span>

                {/* Stamped Stickers Layer on Polaroid top right */}
                {item.reactions && Object.keys(item.reactions).length > 0 && (
                  <div className="absolute top-6 right-6 z-10 flex gap-x-1.5">
                    {Object.entries(item.reactions).map(([uid, emote]) => (
                      <span 
                        key={uid} 
                        className="flex items-center justify-center h-6 w-6 rounded-full bg-white text-xs shadow-md border border-slate-105 animate-bounce"
                        title={uid === user.uid ? "Your reaction stamp" : "Partner's reaction stamp"}
                      >
                        {emote}
                      </span>
                    ))}
                  </div>
                )}

                {/* Main Photo Area */}
                <div 
                  onClick={() => setActiveItem(item)}
                  className="w-full aspect-square rounded-lg overflow-hidden bg-slate-50 relative cursor-pointer group"
                >
                  <img 
                    src={item.imageUrl} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-300 pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-slate-800 text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1 transition-all duration-200">
                      <ExternalLink className="w-3 h-3" />
                      <span>View Keepsake</span>
                    </span>
                  </div>
                </div>

                {/* Bottom handwritten Polaroid metadata section */}
                <div className="mt-4 flex-1 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h3 className="font-caveat font-extrabold text-lg text-slate-800 line-clamp-1 leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed italic pr-2">
                      "{item.caption}"
                    </p>
                  </div>

                  {/* Date & interactive tiny buttons footer */}
                  <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-450" />
                      <span>{item.date}</span>
                    </span>

                    <div className="flex items-center gap-x-2">
                      {/* Heart Emote stamping */}
                      <button 
                        onClick={() => handleAddReaction(item.id, "❤️")}
                        className={`p-1 rounded-md hover:bg-slate-50 transition cursor-pointer flex items-center gap-0.5 ${
                          item.reactions?.[user.uid] === "❤️" ? "text-rose-500 hover:text-rose-600 bg-rose-50" : "text-slate-400 hover:text-rose-450"
                        }`}
                        title="Stamp Heart ❤️"
                      >
                        <Heart className={`w-3.5 h-3.5 ${item.reactions?.[user.uid] === "❤️" ? "fill-rose-500" : ""}`} />
                        {Object.values(item.reactions || {}).filter(e => e === "❤️").length > 0 && (
                          <span className="text-[9px] font-extrabold">{Object.values(item.reactions || {}).filter(e => e === "❤️").length}</span>
                        )}
                      </button>

                      {/* Trash action strictly for creator */}
                      {isCreator && (
                        <button
                          onClick={() => handleDeleteMemory(item.id, item.userId)}
                          className="p-1 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer ml-1"
                          title="Unpin visual memory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Lightbox / Immersive Detail View Modal overlay dialog */}
      <AnimatePresence>
        {activeItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setActiveItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white max-w-2xl w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col md:flex-row max-h-[90vh] md:max-h-[500px]"
            >
              {/* Left Photo frame */}
              <div className="md:w-1/2 aspect-square md:aspect-auto md:h-full bg-slate-900 relative">
                <img 
                  src={activeItem.imageUrl} 
                  alt={activeItem.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                
                {/* Active category label overlay */}
                <span className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-xs text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase">
                  {activeItem.category}
                </span>
              </div>

              {/* Right content detail column */}
              <div className="md:w-1/2 p-6 flex flex-col justify-between space-y-4 overflow-y-auto">
                <div className="space-y-4">
                  {/* Top line with title and close */}
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="space-y-1">
                      <h4 className="text-base font-black text-slate-800 leading-snug">
                        {activeItem.title}
                      </h4>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {activeItem.date}
                      </span>
                    </div>

                    <button
                      onClick={() => setActiveItem(null)}
                      className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-650 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Descriptive text block with cozy typography */}
                  <div className="bg-stone-50 border-l-2 border-pink-400 p-3.5 rounded-r-xl">
                    <p className="font-caveat font-medium text-lg leading-relaxed text-slate-700 whitespace-pre-wrap">
                      "{activeItem.caption}"
                    </p>
                  </div>

                  {/* Real-time Stamped Sticker list panel */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Sticker stamps stamped</span>
                    <div className="flex flex-wrap gap-2">
                      {EMOTE_OPTIONS.map((emoji) => {
                        const userEmote = activeItem.reactions?.[user.uid];
                        const isStamped = userEmote === emoji;
                        
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleAddReaction(activeItem.id, emoji)}
                            className={`h-8 w-8 rounded-xl flex items-center justify-center text-sm shadow-sm border transition cursor-pointer active:scale-90 ${
                              isStamped 
                                ? "bg-pink-100 border-pink-300" 
                                : "bg-slate-50 hover:bg-slate-100 border-transparent"
                            }`}
                          >
                            {emoji}
                          </button>
                        );
                      })}
                    </div>

                    {/* Show stamped info text */}
                    {Object.keys(activeItem.reactions || {}).length > 0 ? (
                      <div className="space-y-1 pt-1 border-t border-slate-50">
                        {Object.entries(activeItem.reactions || {}).map(([uid, emote]) => {
                          const isMe = uid === user.uid;
                          const displayName = isMe 
                            ? "You (Stamped)" 
                            : (profile?.partnerName || "Your Partner");
                          
                          return (
                            <div key={uid} className="flex items-center gap-1.5 text-[10px] text-slate-500 font-extrabold uppercase">
                              <span className="h-4 w-4 bg-slate-100 rounded-full flex items-center justify-center shadow-xs">{emote}</span>
                              <span>{displayName}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[9px] font-bold text-slate-400 uppercase italic">No stamps stamped. Pin yours above!</p>
                    )}
                  </div>
                </div>

                {/* Footer trash strictly for creator */}
                <div className="border-t border-slate-150 pt-4 flex items-center justify-between">
                  <span className="text-[9px] text-slate-350 font-bold uppercase">
                    Keepsake ID: {activeItem.id.slice(0, 12)}...
                  </span>

                  {activeItem.userId === user.uid && (
                    <button
                      onClick={() => handleDeleteMemory(activeItem.id, activeItem.userId)}
                      className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Take down keepsake</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
