
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Profile, View, Chat as ChatType, Message, FilterCriteria } from './types';
import { MOCK_PROFILES } from './constants';
import DiscoverView from './components/DiscoverView';
import MatchesView from './components/MatchesView';
import ChatView from './components/ChatView';
import ProfileView from './components/ProfileView';
import OnboardingView from './components/OnboardingView';
import BottomNav from './components/BottomNav';

const App: React.FC = () => {
  // --- Persistent State Initialization ---

  // Check for existing profile
  const [userProfile, setUserProfile] = useState<Profile | null>(() => {
    const saved = localStorage.getItem('aura_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentView, setCurrentView] = useState<View>('discover');

  // Load swiped IDs (Set needs special handling)
  const [swipedIds, setSwipedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('aura_swiped');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Load matches
  const [matches, setMatches] = useState<Profile[]>(() => {
    const saved = localStorage.getItem('aura_matches');
    return saved ? JSON.parse(saved) : [];
  });

  // Load chats
  const [chats, setChats] = useState<ChatType[]>(() => {
    const saved = localStorage.getItem('aura_chats');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Filters state (not persisted for now, or could be)
  const [filters, setFilters] = useState<FilterCriteria>({
    minAge: 18,
    maxAge: 50,
    location: '',
    interests: []
  });

  // --- Persistence Effects ---

  useEffect(() => {
    if (userProfile) {
      localStorage.setItem('aura_profile', JSON.stringify(userProfile));
    }
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('aura_swiped', JSON.stringify(Array.from(swipedIds)));
  }, [swipedIds]);

  useEffect(() => {
    localStorage.setItem('aura_matches', JSON.stringify(matches));
  }, [matches]);

  useEffect(() => {
    localStorage.setItem('aura_chats', JSON.stringify(chats));
  }, [chats]);

  // --- Logic ---

  const filteredProfiles = useMemo(() => {
    return MOCK_PROFILES.filter(profile => {
      if (swipedIds.has(profile.id)) return false;
      if (profile.age < filters.minAge || profile.age > filters.maxAge) return false;
      if (filters.location && !profile.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
      if (filters.interests.length > 0) {
        const hasCommonInterest = profile.interests.some(interest => filters.interests.includes(interest));
        if (!hasCommonInterest) return false;
      }
      return true;
    });
  }, [swipedIds, filters]);

  const createMatch = useCallback((profile: Profile, isSuper: boolean = false) => {
    setSwipedIds(prev => {
      const newSet = new Set(prev);
      newSet.add(profile.id);
      return newSet;
    });

    setMatches(prev => [profile, ...prev]);
    
    const newChat: ChatType = {
      id: `chat-${profile.id}`,
      user: profile,
      messages: [],
      isSuperLike: isSuper
    };
    setChats(prev => [newChat, ...prev]);
    
    // Simulate first message from match
    setTimeout(() => {
      const msgText = isSuper 
        ? `Wouah ! J'ai reçu ton Super Like, ça me touche beaucoup ! ✨`
        : `Salut ! C'est super d'avoir matché avec toi.`;
        
      const msg: Message = {
        id: Date.now().toString(),
        senderId: profile.id,
        text: msgText,
        timestamp: new Date()
      };
      setChats(prev => prev.map(c => c.id === newChat.id ? { ...c, messages: [...c.messages, msg], lastMessage: msg.text } : c));
    }, 1500);
  }, []);

  const handleLike = useCallback((profile: Profile) => {
    // 80% chance of match for demo purposes
    if (Math.random() > 0.2) {
      createMatch(profile, false);
    } else {
      setSwipedIds(prev => new Set(prev).add(profile.id));
    }
  }, [createMatch]);

  const handleSuperLike = useCallback((profile: Profile) => {
    createMatch(profile, true);
  }, [createMatch]);

  const handlePass = useCallback((profile: Profile) => {
    setSwipedIds(prev => new Set(prev).add(profile.id));
  }, []);

  const openChat = (chatId: string) => {
    setActiveChatId(chatId);
    setCurrentView('chat');
  };

  // --- Rendering ---

  if (!userProfile) {
    return (
      <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-xl overflow-hidden relative">
        <OnboardingView onComplete={(profile) => setUserProfile(profile)} />
      </div>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case 'discover':
        return <DiscoverView 
                  profiles={filteredProfiles} 
                  userProfile={userProfile}
                  onLike={handleLike} 
                  onSuperLike={handleSuperLike}
                  onPass={handlePass}
                  filters={filters}
                  setFilters={setFilters}
                />;
      case 'matches':
        return <MatchesView 
                  matches={matches} 
                  chats={chats}
                  onOpenChat={openChat} 
                />;
      case 'chat':
        const chat = chats.find(c => c.id === activeChatId);
        if (!chat) {
          setCurrentView('matches');
          return null;
        }
        return <ChatView 
                  chat={chat} 
                  onBack={() => setCurrentView('matches')}
                  onSendMessage={(text) => {
                    const newMessage: Message = {
                      id: Date.now().toString(),
                      senderId: userProfile.id, // ID of the logged in user
                      text,
                      timestamp: new Date()
                    };
                    setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [...c.messages, newMessage], lastMessage: text } : c));
                  }}
                />;
      case 'profile':
        return <ProfileView profile={userProfile} setProfile={setUserProfile as React.Dispatch<React.SetStateAction<Profile>>} />;
      default:
        return <DiscoverView profiles={filteredProfiles} userProfile={userProfile} onLike={handleLike} onSuperLike={handleSuperLike} onPass={handlePass} filters={filters} setFilters={setFilters} />;
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-xl overflow-hidden relative">
      <header className="px-6 py-4 flex items-center justify-between border-b bg-white z-10">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-200">
             <i className="fas fa-sparkles text-white text-xs"></i>
           </div>
           <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-rose-500 to-indigo-600 bg-clip-text text-transparent">Aura</h1>
        </div>
        <button onClick={() => setCurrentView('profile')} className="text-slate-400 hover:text-rose-500 transition-all hover:rotate-90 duration-300">
          <img src={userProfile.images[0]} alt="Me" className="w-8 h-8 rounded-full border border-slate-200 object-cover" />
        </button>
      </header>

      <main className="flex-1 overflow-hidden relative">
        {renderContent()}
      </main>

      {currentView !== 'chat' && (
        <BottomNav currentView={currentView} setView={setCurrentView} />
      )}
    </div>
  );
};

export default App;
