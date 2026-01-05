
import React from 'react';
import { Profile, Chat } from '../types';

interface MatchesViewProps {
  matches: Profile[];
  chats: Chat[];
  onOpenChat: (chatId: string) => void;
}

const MatchesView: React.FC<MatchesViewProps> = ({ matches, chats, onOpenChat }) => {
  return (
    <div className="h-full overflow-y-auto px-4 py-6 space-y-8 animate-fadeIn">
      {/* New Matches Row */}
      <section>
        <h3 className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-4">Nouveaux Matches</h3>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {matches.length === 0 ? (
            <div className="text-slate-400 text-sm italic">Pas encore de matches, continuez à swiper !</div>
          ) : (
            matches.map(profile => {
              const chat = chats.find(c => c.user.id === profile.id);
              const isSuper = chat?.isSuperLike;
              
              return (
                <div 
                  key={profile.id} 
                  onClick={() => onOpenChat(`chat-${profile.id}`)}
                  className="flex-shrink-0 cursor-pointer text-center group relative"
                >
                  <div className={`w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr ${isSuper ? 'from-indigo-600 to-violet-400 shadow-indigo-200 shadow-lg' : 'from-rose-500 to-indigo-500'} mb-2`}>
                    <img 
                      src={profile.images[0]} 
                      alt={profile.name}
                      className="w-full h-full rounded-full object-cover border-2 border-white"
                    />
                  </div>
                  {isSuper && (
                    <div className="absolute top-11 right-0 w-6 h-6 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center text-white text-[10px] animate-bounce-short">
                      <i className="fas fa-star"></i>
                    </div>
                  )}
                  <span className={`text-xs font-medium ${isSuper ? 'text-indigo-600 font-bold' : 'text-slate-700'} group-hover:text-rose-500 transition-colors`}>{profile.name}</span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Conversations List */}
      <section>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Messages</h3>
        <div className="space-y-1">
          {chats.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-comments text-slate-200 text-5xl mb-4"></i>
              <p className="text-slate-400 text-sm">Lancez une discussion !</p>
            </div>
          ) : (
            chats.map(chat => (
              <div 
                key={chat.id}
                onClick={() => onOpenChat(chat.id)}
                className={`flex items-center gap-4 p-3 rounded-2xl transition-all cursor-pointer group ${chat.isSuperLike ? 'bg-indigo-50/50 border border-indigo-100' : 'hover:bg-slate-50'}`}
              >
                <div className="relative">
                  <img 
                    src={chat.user.images[0]} 
                    alt={chat.user.name} 
                    className={`w-14 h-14 rounded-2xl object-cover shadow-sm ${chat.isSuperLike ? 'border-2 border-indigo-200' : ''}`}
                  />
                  {chat.isSuperLike && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[8px] border border-white">
                      <i className="fas fa-star"></i>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-semibold ${chat.isSuperLike ? 'text-indigo-900' : 'text-slate-800'}`}>{chat.user.name}</h4>
                      {chat.isSuperLike && <span className="text-[8px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Super Match</span>}
                    </div>
                    <span className="text-[10px] text-slate-400">Maintenant</span>
                  </div>
                  <p className={`text-sm truncate ${chat.isSuperLike ? 'text-indigo-600 font-medium' : 'text-slate-500'}`}>
                    {chat.lastMessage || `Dites bonjour à ${chat.user.name} !`}
                  </p>
                </div>
                <div className={`w-2 h-2 rounded-full ${chat.isSuperLike ? 'bg-indigo-500' : 'bg-rose-500'} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default MatchesView;
