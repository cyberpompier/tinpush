
import React, { useState, useEffect } from 'react';
import { Profile, FilterCriteria } from '../types';
import { analyzeCompatibility } from '../services/geminiService';

interface DiscoverViewProps {
  profiles: Profile[];
  userProfile: Profile;
  onLike: (profile: Profile) => void;
  onSuperLike: (profile: Profile) => void;
  onPass: (profile: Profile) => void;
  filters: FilterCriteria;
  setFilters: React.Dispatch<React.SetStateAction<FilterCriteria>>;
}

const SWIPE_THRESHOLD = 100;
const AVAILABLE_INTERESTS = ['Nature', 'Photo', 'Café', 'Randonnée', 'Musique', 'Tech', 'Cuisine', 'Vin', 'Art', 'Gaming', 'Design', 'Voyage', 'Sport', 'Business', 'Lecture', 'Bien-être', 'Déco', 'Yoga', 'Animaux'];

const DiscoverView: React.FC<DiscoverViewProps> = ({ profiles, userProfile, onLike, onSuperLike, onPass, filters, setFilters }) => {
  const [insight, setInsight] = useState<{ score: number; insight: string } | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [isAnimatingAction, setIsAnimatingAction] = useState(false);
  const [actionType, setActionType] = useState<'like' | 'pass' | 'super' | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  
  // Swipe states
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const currentProfile = profiles[0];

  useEffect(() => {
    if (currentProfile) {
      setLoadingInsight(true);
      setInsight(null);
      analyzeCompatibility(userProfile, currentProfile).then(res => {
        setInsight(res);
        setLoadingInsight(false);
      });
    } else {
      setInsight(null);
    }
    setOffsetX(0);
    setActionType(null);
  }, [currentProfile, userProfile]);

  const handleAction = (type: 'like' | 'pass' | 'super') => {
    if (!currentProfile || isAnimatingAction) return;
    setIsAnimatingAction(true);
    setActionType(type);
    
    if (type === 'super') {
      setOffsetX(0);
    } else {
      setOffsetX(type === 'like' ? 500 : -500);
    }

    setTimeout(() => {
      if (type === 'like') onLike(currentProfile);
      else if (type === 'super') onSuperLike(currentProfile);
      else onPass(currentProfile);
      
      setIsAnimatingAction(false);
      setOffsetX(0);
      setActionType(null);
    }, 400);
  };

  const onStart = (clientX: number) => {
    if (isAnimatingAction || showFilterPanel) return;
    setDragStartX(clientX);
    setIsDragging(true);
  };

  const onMove = (clientX: number) => {
    if (!isDragging || dragStartX === null || isAnimatingAction) return;
    const diff = clientX - dragStartX;
    setOffsetX(diff);
  };

  const onEnd = () => {
    if (!isDragging || isAnimatingAction) return;
    setIsDragging(false);
    if (Math.abs(offsetX) > SWIPE_THRESHOLD) {
      handleAction(offsetX > 0 ? 'like' : 'pass');
    } else {
      setOffsetX(0);
    }
    setDragStartX(null);
  };

  const toggleInterest = (interest: string) => {
    setFilters(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const isFilterActive = filters.location !== '' || filters.interests.length > 0 || filters.minAge !== 18 || filters.maxAge !== 50;

  return (
    <div className="h-full flex flex-col px-3 pt-2 pb-1 animate-fadeIn select-none touch-none relative overflow-hidden">
      {/* Filters Trigger */}
      <div className="absolute top-4 right-4 z-30">
        <button 
          onClick={() => setShowFilterPanel(true)}
          className={`w-9 h-9 rounded-full bg-white/90 backdrop-blur-md shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${isFilterActive ? 'text-rose-500' : 'text-slate-600'}`}
        >
          <i className="fas fa-sliders text-sm"></i>
          {isFilterActive && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>}
        </button>
      </div>

      <div className="flex-1 relative min-h-0">
        {!currentProfile ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4 bg-white/50 rounded-[2.5rem] border border-slate-100">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
              <i className="fas fa-search text-slate-300 text-2xl"></i>
            </div>
            <h2 className="text-lg font-semibold text-slate-800">C'est tout pour le moment !</h2>
            <p className="text-slate-500 text-xs">Élargissez vos filtres pour voir plus de profils autour de vous.</p>
            <button 
              onClick={() => setShowFilterPanel(true)}
              className="px-6 py-2.5 bg-rose-500 text-white rounded-full text-xs font-bold shadow-md active:scale-95 transition-transform"
            >
              Ajuster les filtres
            </button>
          </div>
        ) : (
          <div 
            className={`h-full relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-slate-200 will-change-transform ${!isDragging ? 'transition-all duration-300' : ''} ${actionType === 'super' ? '!-translate-y-[100%] !opacity-0 scale-95' : ''}`}
            style={{
              transform: actionType !== 'super' ? `translateX(${offsetX}px) rotate(${offsetX / 25}deg)` : undefined,
            }}
            onMouseDown={(e) => onStart(e.clientX)}
            onMouseMove={(e) => onMove(e.clientX)}
            onMouseUp={onEnd}
            onMouseLeave={onEnd}
            onTouchStart={(e) => onStart(e.touches[0].clientX)}
            onTouchMove={(e) => onMove(e.touches[0].clientX)}
            onTouchEnd={onEnd}
          >
            {/* Action Badges */}
            <div 
              className="absolute top-8 left-8 z-20 border-4 border-green-500 text-green-500 font-black text-3xl px-3 py-1 rounded-xl rotate-[-15deg] pointer-events-none transition-opacity uppercase"
              style={{ opacity: Math.min(Math.max(offsetX / SWIPE_THRESHOLD, 0), 1) }}
            >
              Like
            </div>
            <div 
              className="absolute top-8 right-8 z-20 border-4 border-red-500 text-red-500 font-black text-3xl px-3 py-1 rounded-xl rotate-[15deg] pointer-events-none transition-opacity uppercase"
              style={{ opacity: Math.min(Math.max(-offsetX / SWIPE_THRESHOLD, 0), 1) }}
            >
              Nope
            </div>

            <img 
              src={currentProfile.images[0]} 
              alt={currentProfile.name}
              className="w-full h-full object-cover pointer-events-none"
            />
            
            <div className="absolute inset-0 card-gradient flex flex-col justify-end p-5 text-white pointer-events-none">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    {currentProfile.name}, {currentProfile.age}
                    <i className="fas fa-circle-check text-sky-400 text-sm"></i>
                  </h2>
                  <p className="flex items-center gap-1.5 opacity-90 text-[10px] uppercase tracking-wider font-semibold">
                    <i className="fas fa-location-dot text-rose-400"></i> {currentProfile.location}
                  </p>
                </div>
                
                {/* Aura Score Badge */}
                <div className="bg-white/20 backdrop-blur-xl rounded-2xl px-3 py-1.5 text-[10px] border border-white/30 flex items-center gap-2 shadow-lg">
                  {loadingInsight ? (
                    <i className="fas fa-circle-notch fa-spin text-rose-400"></i>
                  ) : insight ? (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]"></div>
                      <span className="font-black">AURA {insight.score}%</span>
                    </>
                  ) : null}
                </div>
              </div>
              
              <div className="space-y-3">
                 <p className="text-[11px] line-clamp-2 opacity-90 leading-relaxed font-medium">
                   {currentProfile.bio}
                 </p>
                 
                 <div className="flex flex-wrap gap-1.5">
                   {currentProfile.interests.slice(0, 3).map(interest => (
                     <span key={interest} className="text-[9px] font-bold uppercase tracking-widest bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                       {interest}
                     </span>
                   ))}
                 </div>

                 {/* Aura Insight Box */}
                 {insight && !loadingInsight && (
                   <div className="bg-gradient-to-r from-rose-500/90 to-rose-600/90 backdrop-blur-xl p-2.5 rounded-2xl border border-rose-400/50 text-[10px] font-medium leading-snug shadow-xl animate-fadeIn">
                     <i className="fas fa-sparkles mr-2 text-yellow-300"></i>
                     "{insight.insight}"
                   </div>
                 )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {currentProfile && (
        <div className="flex justify-center items-center gap-5 py-3.5">
          <button 
            onClick={() => handleAction('pass')}
            disabled={isAnimatingAction}
            className="w-13 h-13 rounded-full bg-white shadow-xl flex items-center justify-center text-slate-400 hover:text-red-500 active:scale-90 transition-all border border-slate-50 disabled:opacity-50"
          >
            <i className="fas fa-xmark text-xl"></i>
          </button>
          
          <button 
            onClick={() => handleAction('super')}
            disabled={isAnimatingAction}
            className={`w-13 h-13 rounded-full bg-white shadow-xl flex items-center justify-center text-indigo-400 hover:text-indigo-600 active:scale-90 transition-all border border-slate-50 disabled:opacity-50 ${actionType === 'super' ? 'animate-heartPop text-indigo-600' : ''}`}
          >
            <i className="fas fa-star text-xl"></i>
          </button>
          
          <button 
            onClick={() => handleAction('like')}
            disabled={isAnimatingAction}
            className={`w-15 h-15 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 shadow-2xl shadow-rose-200 flex items-center justify-center text-white active:scale-90 transition-all disabled:opacity-50 ${actionType === 'like' ? 'animate-heartPop' : ''}`}
          >
            <i className="fas fa-heart text-2xl"></i>
          </button>
        </div>
      )}

      {/* Filter Panel */}
      {showFilterPanel && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex flex-col justify-end animate-fadeIn">
          <div className="bg-white rounded-t-[2.5rem] p-6 pb-10 space-y-6 animate-slideInUp max-h-[85%] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold text-slate-800">Préférences</h2>
              <button 
                onClick={() => setShowFilterPanel(false)}
                className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <i className="fas fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between px-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Âge</label>
                <span className="text-xs font-bold text-rose-500">{filters.minAge} - {filters.maxAge} ans</span>
              </div>
              <div className="flex gap-4">
                <input 
                  type="range" min="18" max="50" value={filters.minAge} 
                  onChange={(e) => setFilters(prev => ({ ...prev, minAge: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
                <input 
                  type="range" min="18" max="50" value={filters.maxAge} 
                  onChange={(e) => setFilters(prev => ({ ...prev, maxAge: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Localisation</label>
              <div className="relative">
                <i className="fas fa-location-crosshairs absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                <input 
                  type="text" 
                  value={filters.location}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Ville ou pays..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-11 pr-4 text-sm focus:ring-2 ring-rose-100 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Intérêts</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_INTERESTS.map(interest => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`px-3.5 py-2 rounded-xl text-[10px] font-bold transition-all ${
                      filters.interests.includes(interest)
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-200'
                        : 'bg-slate-50 text-slate-500 border border-slate-100'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6">
              <button 
                onClick={() => setShowFilterPanel(false)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold shadow-xl shadow-rose-200 active:scale-95 transition-transform"
              >
                Appliquer
              </button>
              <button 
                onClick={() => setFilters({ minAge: 18, maxAge: 50, location: '', interests: [] })}
                className="w-full mt-3 py-2 text-slate-400 text-xs font-bold"
              >
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .w-13 { width: 3.25rem; }
        .h-13 { height: 3.25rem; }
        .w-15 { width: 3.75rem; }
        .h-15 { height: 3.75rem; }
        
        @keyframes slideInUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slideInUp {
          animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default DiscoverView;
