
import React from 'react';
import { View } from '../types';

interface BottomNavProps {
  currentView: View;
  setView: (view: View) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView }) => {
  const items: { id: View; icon: string; label: string }[] = [
    { id: 'discover', icon: 'fa-fire', label: 'Découvrir' },
    { id: 'matches', icon: 'fa-comments', label: 'Messages' },
    { id: 'profile', icon: 'fa-user', label: 'Profil' },
  ];

  return (
    <nav className="flex items-center justify-around px-4 py-3 bg-white border-t">
      {items.map(item => {
        const isActive = currentView === item.id || (item.id === 'matches' && currentView === 'chat');
        return (
          <button 
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex flex-col items-center gap-1 transition-all ${
              isActive ? 'text-rose-500 scale-110' : 'text-slate-300 hover:text-slate-400'
            }`}
          >
            <i className={`fas ${item.icon} text-xl`}></i>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
