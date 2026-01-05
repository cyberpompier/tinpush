
import React, { useState } from 'react';
import { Profile } from '../types';

interface OnboardingViewProps {
  onComplete: (profile: Profile) => void;
}

const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<Profile>>({
    name: '',
    age: 25,
    bio: '',
    location: '',
    images: ['https://picsum.photos/seed/default/600/800'],
    interests: []
  });

  const INTERESTS_LIST = ['Voyage', 'Musique', 'Tech', 'Sport', 'Cuisine', 'Art', 'Randonnée', 'Photo', 'Cinéma', 'Lecture'];

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else {
      onComplete({
        id: 'user-' + Date.now(),
        name: formData.name || 'Utilisateur',
        age: formData.age || 18,
        bio: formData.bio || 'Nouvel utilisateur sur Aura',
        images: formData.images || [],
        interests: formData.interests || [],
        location: formData.location || 'Paris',
        job: formData.job || ''
      } as Profile);
    }
  };

  const toggleInterest = (interest: string) => {
    const current = formData.interests || [];
    if (current.includes(interest)) {
      setFormData({ ...formData, interests: current.filter(i => i !== interest) });
    } else {
      setFormData({ ...formData, interests: [...current, interest] });
    }
  };

  return (
    <div className="h-full flex flex-col bg-white animate-fadeIn">
      {/* Progress Bar */}
      <div className="w-full h-1 bg-slate-100">
        <div 
          className="h-full bg-rose-500 transition-all duration-500 ease-out"
          style={{ width: `${(step / 3) * 100}%` }}
        ></div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 flex flex-col">
        <div className="flex-1 flex flex-col justify-center space-y-8">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 mx-auto flex items-center justify-center shadow-lg shadow-rose-200 mb-6">
              <i className="fas fa-sparkles text-white text-2xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Bienvenue sur Aura</h1>
            <p className="text-slate-500">Créons votre profil unique pour des rencontres plus intelligentes.</p>
          </div>

          {step === 1 && (
            <div className="space-y-4 animate-slideInRight">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Prénom</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-rose-500 outline-none transition-all font-medium text-lg"
                  placeholder="Votre prénom"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Âge</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-rose-500 outline-none transition-all font-medium text-lg"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Localisation</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-rose-500 outline-none transition-all font-medium text-lg"
                  placeholder="Ville"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-slideInRight">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">À propos de vous</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-rose-500 outline-none transition-all resize-none text-base"
                  rows={4}
                  placeholder="Dites-nous ce qui vous rend unique..."
                />
              </div>
              <div className="bg-blue-50 p-4 rounded-2xl flex gap-3 text-blue-700 text-sm">
                <i className="fas fa-lightbulb mt-1"></i>
                <p>L'IA utilisera votre bio pour trouver vos meilleures compatibilités. Soyez créatif !</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-slideInRight">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Vos Intérêts</label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS_LIST.map(interest => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                        formData.interests?.includes(interest)
                          ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 scale-105'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleNext}
          disabled={step === 1 && !formData.name}
          className="w-full py-4 mt-8 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
        >
          {step === 3 ? 'Commencer' : 'Continuer'}
        </button>
      </div>
    </div>
  );
};

export default OnboardingView;
