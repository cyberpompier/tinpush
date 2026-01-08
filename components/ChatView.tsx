
import React, { useState, useEffect, useRef } from 'react';
import { Chat, Message } from '../types';
import { generateIceBreaker } from '../services/geminiService';

interface ChatViewProps {
  chat: Chat;
  onBack: () => void;
  onSendMessage: (text: string) => void;
}

const ChatView: React.FC<ChatViewProps> = ({ chat, onBack, onSendMessage }) => {
  const [inputText, setInputText] = useState('');
  const [iceBreakers, setIceBreakers] = useState<string[]>([]);
  const [showIceBreakers, setShowIceBreakers] = useState(false);
  const [loadingIceBreakers, setLoadingIceBreakers] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat.messages]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const getIceBreakers = async () => {
    setLoadingIceBreakers(true);
    const ideas = await generateIceBreaker(chat.user);
    setIceBreakers(ideas);
    setShowIceBreakers(true);
    setLoadingIceBreakers(false);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col bg-white animate-slideInRight z-50 fixed inset-0">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-slate-100 shadow-sm sticky top-0 z-10">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
          <i className="fas fa-chevron-left text-lg"></i>
        </button>
        
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
          <div className="relative">
            <img 
              src={chat.user.images[0]} 
              alt={chat.user.name} 
              className={`w-10 h-10 rounded-full object-cover border-2 ${chat.isSuperLike ? 'border-indigo-400 p-0.5' : 'border-rose-100'}`} 
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-800 text-base leading-none mb-1 truncate flex items-center gap-1">
              {chat.user.name}
              {chat.isSuperLike && <i className="fas fa-star text-indigo-500 text-[10px]"></i>}
            </h3>
            <p className="text-xs text-slate-400 truncate">En ligne il y a 5 min</p>
          </div>
        </div>

        <button className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 rounded-full transition-colors">
          <i className="fas fa-shield-alt"></i>
        </button>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50"
      >
        {/* Match Started Notice */}
        <div className="text-center py-6">
           <div className="w-20 h-20 rounded-full overflow-hidden mx-auto border-4 border-white shadow-lg mb-3">
             <img src={chat.user.images[0]} className="w-full h-full object-cover" alt="" />
           </div>
           <p className="text-xs text-slate-400">
             Vous avez matché avec <span className="font-bold text-slate-700">{chat.user.name}</span>.<br/>
             {chat.user.interests.slice(0, 2).join(' • ')}
           </p>
        </div>

        {chat.messages.length === 0 && (
          <div className="animate-fadeIn space-y-4">
             {!showIceBreakers ? (
               <button 
                 onClick={getIceBreakers}
                 disabled={loadingIceBreakers}
                 className="w-full max-w-xs mx-auto p-4 rounded-2xl bg-white border border-rose-100 shadow-sm text-center group hover:border-rose-300 transition-all active:scale-95"
               >
                 <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-3 text-rose-500 group-hover:scale-110 transition-transform">
                   {loadingIceBreakers ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
                 </div>
                 <h4 className="font-bold text-slate-800 text-sm mb-1">Brisez la glace !</h4>
                 <p className="text-xs text-slate-500">Demandez à l'IA une phrase d'accroche originale pour {chat.user.name}.</p>
               </button>
             ) : (
               <div className="max-w-xs mx-auto space-y-2 animate-fadeIn">
                 <p className="text-center text-xs text-slate-400 font-bold uppercase tracking-widest mb-3">Suggestions Aura</p>
                 {iceBreakers.map((ib, i) => (
                   <button 
                     key={i} 
                     onClick={() => { setInputText(ib); setShowIceBreakers(false); }}
                     className="block w-full text-left p-3.5 rounded-2xl bg-white border border-slate-100 text-sm text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 transition-all shadow-sm"
                   >
                     "{ib}"
                   </button>
                 ))}
               </div>
             )}
          </div>
        )}

        {/* Message List */}
        <div className="space-y-1.5">
          {chat.messages.map((msg, idx) => {
            const isMe = msg.senderId === chat.user.id ? false : true; // Assuming 'user' was hardcoded previously, logic might need check based on auth ID
            // For mock purposes: if senderId is NOT the profile ID, it's Me.
            const isSelf = msg.senderId !== chat.user.id;
            
            return (
              <div key={msg.id} className={`flex w-full ${isSelf ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[80%] flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                  <div 
                    className={`px-4 py-2.5 shadow-sm text-[15px] leading-relaxed break-words ${
                      isSelf 
                        ? 'bg-rose-500 text-white rounded-2xl rounded-tr-sm' 
                        : 'bg-white text-slate-800 border border-slate-100 rounded-2xl rounded-tl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-slate-100 sticky bottom-0">
        <div className="flex items-end gap-2 bg-slate-100 rounded-[1.5rem] p-1.5 pl-4 transition-all focus-within:ring-2 focus-within:ring-rose-100 focus-within:bg-white border border-transparent focus-within:border-rose-200">
          <input 
            type="text" 
            placeholder="Écrivez un message..." 
            className="flex-1 bg-transparent outline-none text-sm py-2.5 max-h-32 resize-none text-slate-800 placeholder:text-slate-400"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!inputText.trim()}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md ${
              inputText.trim() 
                ? 'bg-rose-500 text-white hover:scale-105 active:scale-90' 
                : 'bg-slate-200 text-slate-400'
            }`}
          >
            <i className="fas fa-paper-plane text-sm translate-x-[-1px] translate-y-[1px]"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
