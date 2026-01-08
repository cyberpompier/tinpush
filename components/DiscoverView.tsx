
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
  const nextProfile = profiles[1]; // Profil suivant pour l'effet de pile

  useEffect(() => {
    if (currentProfile) {
      setLoadingInsight(true);
      setInsight(null);
      // Debounce ou check si nécessaire pour économiser l'API
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
    
    // Animation de sortie
    if (type === 'super') {
      setOffsetX(0);
    } else {
      setOffsetX(type === 'like' ? 1000 : -1000); // Sortie large
    }

    setTimeout(() => {
      if (type === 'like') onLike(currentProfile);
      else if (type === 'super') onSuperLike(currentProfile);
      else onPass(currentProfile);
      
      setIsAnimatingAction(false);
      setOffsetX(0);
      setActionType(null);
    }, 300);
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

  // Calcul de la rotation et de l'opacité pour la carte active
  const rotation = offsetX / 20;
  const opacityLike = Math.min(Math.max(offsetX / SWIPE_THRESHOLD, 0), 1);
  const opacityNope = Math.min(Math.max(-offsetX / SWIPE_THRESHOLD, 0), 1);

  return (
    <div className="h-full flex flex-col pt-2 pb-1 bg-slate-50 overflow-hidden relative select-none">
      
      {/* Filters Trigger */}
      <div className="absolute top-4 right-4 z-40">
        <button 
          onClick={() => setShowFilterPanel(true)}
          className={`w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-sm flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${isFilterActive ? 'text-rose-500' : 'text-slate-600'}`}
        >
          <i className="fas fa-sliders text-sm"></i>
          {isFilterActive && <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>}
        </button>
      </div>

      <div className="flex-1 relative w-full max-w-md mx-auto px-2">
        {!currentProfile ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6 animate-fadeIn">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-rose-100 flex items-center justify-center animate-pulse">
                <i className="fas fa-search text-rose-300 text-3xl"></i>
              </div>
              <div className="absolute inset-0 border-2 border-rose-200 rounded-full animate-ping opacity-20"></div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">C'est tout pour le moment !</h2>
              <p className="text-slate-500 text-sm max-w-[200px] mx-auto">Il n'y a plus de profils correspondant à vos critères dans cette zone.</p>
            </div>
            <button 
              onClick={() => setShowFilterPanel(true)}
              className="px-8 py-3 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-full text-sm font-bold shadow-lg shadow-rose-200 hover:shadow-rose-300 active:scale-95 transition-all"
            >
              Élargir mes critères
            </button>
          </div>
        ) : (
          <div className="relative w-full h-full">
            
            {/* Background Card (Next Profile) */}
            {nextProfile && (
              <div className="absolute inset-0 rounded-[2rem] overflow-hidden bg-white shadow-xl transform scale-95 translate-y-3 opacity-60 pointer-events-none">
                 <img 
                    src={nextProfile.images[0]} 
                    alt="Next"
                    className="w-full h-full object-cover filter brightness-90 grayscale-[0.3]"
                  />
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]"></div>
              </div>
            )}

            {/* Active Card */}
            <div 
              className={`absolute inset-0 rounded-[2rem] overflow-hidden shadow-2xl bg-white will-change-transform z-20 cursor-grab active:cursor-grabbing
                ${!isDragging && !isAnimatingAction ? 'transition-all duration-300 ease-out' : ''} 
                ${actionType === 'super' ? 'transition-all duration-500 !-translate-y-[150%] !opacity-0 scale-90' : ''}
                ${actionType === 'like' || actionType === 'pass' ? 'transition-all duration-300' : ''}
              `}
              style={{
                transform: actionType !== 'super' 
                  ? `translateX(${offsetX}px) rotate(${rotation}deg)` 
                  : undefined,
              }}
              onMouseDown={(e) => onStart(e.clientX)}
              onMouseMove={(e) => onMove(e.clientX)}
              onMouseUp={onEnd}
              onMouseLeave={onEnd}
              onTouchStart={(e) => onStart(e.touches[0].clientX)}
              onTouchMove={(e) => onMove(e.touches[0].clientX)}
              onTouchEnd={onEnd}
            >
              
              {/* Overlay Gradients */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80 z-10 pointer-events-none"></div>

              {/* Action Indicators */}
              <div 
                className="absolute top-10 left-8 z-30 border-[6px] border-green-400 text-green-400 font-black text-4xl px-4 py-2 rounded-2xl -rotate-12 pointer-events-none uppercase tracking-widest backdrop-blur-sm"
                style={{ opacity: opacityLike }}
              >
                Like
              </div>
              <div 
                className="absolute top-10 right-8 z-30 border-[6px] border-red-500 text-red-500 font-black text-4xl px-4 py-2 rounded-2xl rotate-12 pointer-events-none uppercase tracking-widest backdrop-blur-sm"
                style={{ opacity: opacityNope }}
              >
                Non
              </div>

              {/* Image */}
              <img 
                src={currentProfile.images[0]} 
                alt={currentProfile.name}
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
              
              {/* Profile Info */}
              <div className="absolute inset-x-0 bottom-0 p-6 z-20 text-white pointer-events-none select-text">
                
                {/* Aura Insight Pop-up */}
                {insight && !loadingInsight && (
                   <div className="mb-4 animate-slideInRight">
                     <div className="inline-block bg-white/10 backdrop-blur-xl border border-white/20 p-3 rounded-2xl shadow-lg max-w-[90%]">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <i className="fas fa-sparkles text-white text-xs"></i>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">Compatibilité IA</span>
                              <span className="text-xs font-black text-white">{insight.score}%</span>
                            </div>
                            <p className="text-xs font-medium leading-snug opacity-95 text-slate-100 italic">"{insight.insight}"</p>
                          </div>
                        </div>
                     </div>
                   </div>
                 )}

                <div className="flex items-end justify-between mb-2">
                  <div>
                    <h2 className="text-3xl font-bold flex items-center gap-3 drop-shadow-md">
                      {currentProfile.name} 
                      <span className="text-2xl font-normal opacity-90">{currentProfile.age}</span>
                    </h2>
                    <p className="flex items-center gap-1.5 opacity-90 text-sm font-medium mt-1">
                      <i className="fas fa-map-marker-alt text-rose-500"></i> {currentProfile.location}
                    </p>
                  </div>
                </div>
                
                <p className="text-sm opacity-85 leading-relaxed line-clamp-3 mb-4 font-light drop-shadow-sm">
                  {currentProfile.bio}
                </p>
                
                <div className="flex flex-wrap gap-2">
                  {currentProfile.interests.slice(0, 4).map((interest, idx) => (
                    <span 
                      key={idx} 
                      className="text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-sm"
                    >
                      {interest}
                    </span>
                  ))}
                  {currentProfile.interests.length > 4 && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                      +{currentProfile.interests.length - 4}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      {currentProfile && (
        <div className="flex justify-center items-center gap-6 pb-2 pt-4 px-4 z-30">
          <button 
            onClick={() => handleAction('pass')}
            disabled={isAnimatingAction}
            className="w-14 h-14 rounded-full bg-white shadow-lg shadow-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 active:scale-95 transition-all border border-slate-100"
          >
            <i className="fas fa-times text-2xl"></i>
          </button>
          
          <button 
            onClick={() => handleAction('super')}
            disabled={isAnimatingAction}
            className={`w-12 h-12 rounded-full bg-white shadow-lg shadow-indigo-100 flex items-center justify-center text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95 transition-all border border-indigo-50 transform -translate-y-2 ${actionType === 'super' ? 'animate-heartPop text-indigo-600' : ''}`}
          >
            <i className="fas fa-star text-xl"></i>
          </button>
          
          <button 
            onClick={() => handleAction('like')}
            disabled={isAnimatingAction}
            className={`w-16 h-16 rounded-full bg-gradient-to-tr from-rose-500 to-rose-600 shadow-xl shadow-rose-200/80 flex items-center justify-center text-white active:scale-95 transition-all hover:scale-105 ${actionType === 'like' ? 'animate-heartPop' : ''}`}
          >
            <i className="fas fa-heart text-3xl"></i>
          </button>
        </div>
      )}

      {/* Filter Modal */}
      {showFilterPanel && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end flex-col animate-fadeIn">
          <div 
            className="bg-white rounded-t-[2rem] p-6 pb-8 h-[85vh] flex flex-col animate-slideInUp shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Préférences</h2>
              <button 
                onClick={() => setShowFilterPanel(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-8 pr-2 scrollbar-hide">
              {/* Age Range */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Tranche d'âge</label>
                  <span className="text-sm font-bold text-rose-500 bg-rose-50 px-3 py-1 rounded-lg">{filters.minAge} - {filters.maxAge} ans</span>
                </div>
                <div className="relative pt-2">
                   <input 
                    type="range" min="18" max="60" value={filters.maxAge} 
                    onChange={(e) => {
                       const val = parseInt(e.target.value);
                       if(val > filters.minAge) setFilters(prev => ({ ...prev, maxAge: val }));
                    }}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-medium">
                    <span>18</span>
                    <span>60+</span>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Distance & Lieu</label>
                <div className="relative group">
                  <i className="fas fa-map-pin absolute left-4 top-1/2 -translate-y-1/2 text-rose-500 transition-transform group-focus-within:scale-110"></i>
                  <input 
                    type="text" 
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Ville, Région..."
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-11 pr-4 text-slate-800 font-medium focus:border-rose-300 focus:bg-white outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Interests */}
              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Passions</label>
                <div className="flex flex-wrap gap-2.5">
                  {AVAILABLE_INTERESTS.map(interest => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        filters.interests.includes(interest)
                          ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-200 transform scale-105'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-500'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-slate-100 space-y-3">
              <button 
                onClick={() => setShowFilterPanel(false)}
                className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold shadow-xl active:scale-95 transition-transform"
              >
                Voir les résultats
              </button>
              <button 
                onClick={() => setFilters({ minAge: 18, maxAge: 50, location: '', interests: [] })}
                className="w-full py-2 text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors"
              >
                Réinitialiser tout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoverView;
