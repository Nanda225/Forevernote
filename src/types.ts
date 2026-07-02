export interface UserProfile {
  id: string;
  name: string;
  email: string;
  partnerName?: string;
  partnerEmail?: string;
  anniversaryDate?: string; // YYYY-MM-DD
  createdAt: any;
  inviteCode?: string;
  partnerInviteCode?: string;
  connectedPartnerId?: string;
  friendshipMode?: boolean;
  appearanceTheme?: string;
}

export type MilestoneType = 'First Meet' | 'First Date' | 'First Talk' | 'First Trip' | 'Proposal' | 'Anniversary' | 'Custom';

export type LetterStyle = 'Romantic' | 'Playful' | 'Cute' | 'Nostalgic' | 'Sarcastic' | 'GenZ Slang';

export interface Milestone {
  id: string;
  userId: string;
  title: string;
  type: MilestoneType;
  date: string; // YYYY-MM-DD
  description: string;
  aiLetterStyle?: LetterStyle;
  generatedLetter?: string;
  imageUrl?: string;
  createdAt: any;
}

export type ReminderType = 'Email' | 'In-App';

export interface Reminder {
  id: string;
  milestoneId: string;
  userId: string;
  deliveryType: ReminderType;
  scheduledDate: string; // YYYY-MM-DD
  status: 'pending' | 'sent';
  createdAt: any;
}

export interface GalleryItem {
  id: string;
  userId: string;
  partnerId?: string; // Optional field for querying partner views
  title: string;
  caption: string;
  imageUrl: string;
  category: string; // E.g., 'Travel', 'Dates', 'Selfies', 'Special Days'
  date: string; // YYYY-MM-DD
  reactions?: { [userId: string]: string }; // Map of user IDs to emoji reaction
  createdAt: any;
}

