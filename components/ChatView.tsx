
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

  return (
    <div className="h-full flex flex-col bg-slate-50 animate-slideInRight">
      {/* Header */}
      <div className={`bg-white px-4 py-3 flex items-center gap-4 border-b ${chat.isSuperLike ? 'border-b-indigo-100 shadow-sm' : ''}`}>
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600">
          <i className="fas fa-chevron-left text-xl"></i>
        </button>
        <div className="flex items-center justify-between flex-1">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={chat.user.images[0]} alt={chat.user.name} className={`w-10 h-10 rounded-full object-cover border ${chat.isSuperLike ? 'border-indigo-300' : 'border-slate-100'}`} />
              {chat.isSuperLike && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-500 text-white rounded-full flex items-center justify-center text-[6px] border border-white">
                  <i className="fas fa-star"></i>
                </div>
              )}
            </div>
            <div>
              <h3 className={`font-bold leading-none mb-1 ${chat.isSuperLike ? 'text-indigo-900' : 'text-slate-800'}`}>{chat.user.name}</h3>
              <span className="text-[10px] text-green-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> En ligne
              </span>
            </div>
          </div>
          {chat.isSuperLike && (
            <div className="bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase px-2 py-1 rounded-full border border-indigo-100 animate-pulse">
              Super Match
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {chat.messages.length === 0 && (
          <div className="text-center py-8">
             <p className={`text-sm mb-4 italic ${chat.isSuperLike ? 'text-indigo-400 font-medium' : 'text-slate-400'}`}>
               {chat.isSuperLike ? `Tu as envoyé un Super Like à ${chat.user.name} ! C'est le moment d'impressionner.` : "Vous avez matché ! C'est le moment idéal pour envoyer un message."}
             </p>
             {!showIceBreakers ? (
               <button 
                 onClick={getIceBreakers}
                 disabled={loadingIceBreakers}
                 className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 mx-auto ${chat.isSuperLike ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'}`}
               >
                 {loadingIceBreakers ? (
                    <i className="fas fa-spinner fa-spin"></i>
                 ) : (
                    <i className="fas fa-wand-magic-sparkles"></i>
                 )}
                 Besoin d'une phrase d'accroche ?
               </button>
             ) : (
               <div className="space-y-2 max-w-xs mx-auto">
                 {iceBreakers.map((ib, i) => (
                   <button 
                     key={i} 
                     onClick={() => { setInputText(ib); setShowIceBreakers(false); }}
                     className={`block w-full text-left p-3 rounded-2xl bg-white border text-xs transition-colors shadow-sm ${chat.isSuperLike ? 'border-indigo-100 hover:border-indigo-400 text-indigo-900' : 'border-rose-100 hover:border-rose-400 text-slate-700'}`}
                   >
                     {ib}
                   </button>
                 ))}
               </div>
             )}
          </div>
        )}

        {chat.messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.senderId === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${
              msg.senderId === 'user' 
                ? `${chat.isSuperLike ? 'bg-indigo-600 shadow-indigo-100' : 'bg-rose-500 shadow-rose-100'} text-white rounded-br-none shadow-md` 
                : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t">
        <div className={`flex items-center gap-3 rounded-full px-4 py-2 ${chat.isSuperLike ? 'bg-indigo-50 border border-indigo-100' : 'bg-slate-100'}`}>
          <input 
            type="text" 
            placeholder="Tapez votre message..." 
            className="flex-1 bg-transparent outline-none text-sm py-1"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!inputText.trim()}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              inputText.trim() 
                ? (chat.isSuperLike ? 'bg-indigo-600 text-white scale-110 shadow-lg' : 'bg-rose-500 text-white scale-110 shadow-lg') 
                : 'text-slate-400'
            }`}
          >
            <i className="fas fa-paper-plane text-sm"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
