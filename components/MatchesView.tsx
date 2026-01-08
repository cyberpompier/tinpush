
import React from 'react';
import { Profile, Chat } from '../types';

interface MatchesViewProps {
  matches: Profile[];
  chats: Chat[];
  onOpenChat: (chatId: string) => void;
}

const MatchesView: React.FC<MatchesViewProps> = ({ matches, chats, onOpenChat }) => {
  return (
    <div className="h-full overflow-y-auto bg-white animate-fadeIn">
      
      {/* Search Bar - Visual only for now */}
      <div className="px-4 py-3 sticky top-0 bg-white z-10">
        <div className="bg-slate-100 rounded-xl flex items-center px-4 py-2.5 text-slate-500 gap-3">
          <i className="fas fa-search text-sm"></i>
          <span className="text-sm font-medium">Rechercher...</span>
        </div>
      </div>

      {/* New Matches Row */}
      <section className="py-2">
        <div className="px-4 flex items-center justify-between mb-3">
           <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Nouveaux Matches <span className="text-rose-500">{matches.length}</span></h3>
        </div>
        
        <div className="flex gap-4 overflow-x-auto px-4 pb-6 scrollbar-hide snap-x">
          {matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center w-full py-6 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
               <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-2">
                 <i className="fas fa-heart-crack"></i>
               </div>
               <p className="text-xs text-slate-400 font-medium">En attente de coups de cœur</p>
            </div>
          ) : (
            matches.map((profile, i) => {
              const chat = chats.find(c => c.user.id === profile.id);
              const isSuper = chat?.isSuperLike;
              
              return (
                <div 
                  key={profile.id} 
                  onClick={() => onOpenChat(`chat-${profile.id}`)}
                  className="flex-shrink-0 cursor-pointer text-center group relative snap-start animate-fadeIn"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className={`w-[4.5rem] h-[4.5rem] rounded-2xl p-0.5 bg-gradient-to-tr ${isSuper ? 'from-indigo-500 via-purple-500 to-indigo-400 shadow-indigo-200' : 'from-rose-500 via-orange-400 to-rose-400 shadow-rose-200'} shadow-lg mb-2 relative`}>
                    <img 
                      src={profile.images[0]} 
                      alt={profile.name}
                      className="w-full h-full rounded-[14px] object-cover border-2 border-white"
                    />
                    {isSuper && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white">
                        <i className="fas fa-star"></i>
                      </div>
                    )}
                  </div>
                  <span className={`text-xs font-bold block truncate max-w-[4.5rem] ${isSuper ? 'text-indigo-600' : 'text-slate-700'}`}>{profile.name}</span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Conversations List */}
      <section className="bg-slate-50 min-h-[500px] rounded-t-[2.5rem] pt-8 px-4 pb-20 -mt-2 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] relative z-0">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 px-2">Discussions</h3>
        
        <div className="space-y-3">
          {chats.length === 0 ? (
            <div className="text-center py-16 opacity-50">
              <i className="fas fa-comments text-slate-300 text-6xl mb-4 block"></i>
              <p className="text-slate-400 font-medium">Votre boîte de réception est vide.</p>
            </div>
          ) : (
            chats.map((chat, i) => (
              <div 
                key={chat.id}
                onClick={() => onOpenChat(chat.id)}
                className="bg-white p-3 rounded-2xl flex items-center gap-4 shadow-sm border border-slate-100 active:scale-[0.98] transition-all cursor-pointer animate-slideInUp"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="relative">
                  <img 
                    src={chat.user.images[0]} 
                    alt={chat.user.name} 
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  {chat.isSuperLike && (
                    <div className="absolute -bottom-1 -right-1 bg-indigo-100 text-indigo-600 w-5 h-5 rounded-full flex items-center justify-center border border-white text-[9px]">
                      <i className="fas fa-star"></i>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className={`font-bold text-base ${chat.isSuperLike ? 'text-indigo-900' : 'text-slate-800'}`}>
                      {chat.user.name}
                    </h4>
                    <span className="text-[10px] font-bold text-slate-300">12:30</span>
                  </div>
                  <p className={`text-sm truncate ${chat.isSuperLike ? 'text-indigo-500 font-medium' : 'text-slate-500'}`}>
                     {chat.lastMessage || `Dites bonjour à ${chat.user.name} 👋`}
                  </p>
                </div>

                {/* Unread dot simulation */}
                {Math.random() > 0.7 && (
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default MatchesView;
