
export interface Profile {
  id: string;
  name: string;
  age: number;
  bio: string;
  images: string[];
  interests: string[];
  location: string;
  job?: string;
  compatibilityScore?: number;
  aiInsight?: string;
}

export interface FilterCriteria {
  minAge: number;
  maxAge: number;
  location: string;
  interests: string[];
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
}

export interface Chat {
  id: string;
  user: Profile;
  lastMessage?: string;
  messages: Message[];
  isSuperLike?: boolean;
}

export type View = 'discover' | 'matches' | 'chat' | 'profile';
