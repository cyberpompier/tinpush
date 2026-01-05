
import React, { useState, useEffect, useRef } from 'react';
import { Profile } from '../types';
import { subscribeToPushNotifications } from '../push';

interface ProfileViewProps {
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
}

const ProfileView: React.FC<ProfileViewProps> = ({ profile, setProfile }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  
  // Camera states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showPhotoSourceMenu, setShowPhotoSourceMenu] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Notification state
  const [isNotifLoading, setIsNotifLoading] = useState(false);

  // Auto-scroll carousel every 5 seconds for the edit view
  useEffect(() => {
    if (profile.images.length <= 1 || showPreview || isCameraOpen) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % profile.images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [profile.images.length, showPreview, isCameraOpen]);

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfile(prev => ({ 
            ...prev, 
            images: [...prev.images, reader.result as string] 
          }));
        };
        reader.readAsDataURL(file);
      });
    }
    setShowPhotoSourceMenu(false);
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', aspectRatio: 3/4 }, 
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraOpen(true);
      setShowPhotoSourceMenu(false);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg');
        setProfile(prev => ({ 
          ...prev, 
          images: [...prev.images, imageData] 
        }));
        stopCamera();
      }
    }
  };

  const removeImage = (index: number) => {
    if (profile.images.length <= 1) {
      alert("Vous devez avoir au moins une photo de profil.");
      return;
    }
    setProfile(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    if (currentImageIndex >= index && currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
  };

  const handleSave = () => {
    setShowPreview(false);
    alert("Profil mis à jour avec succès !");
  };

  const enableNotifications = async () => {
    setIsNotifLoading(true);
    try {
      await subscribeToPushNotifications();
      alert("Notifications activées avec succès !");
    } catch (error: any) {
      console.error(error);
      alert(`Erreur : ${error.message}`);
    } finally {
      setIsNotifLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 animate-fadeIn scrollbar-hide relative">
      {/* Carousel Header (Edition) */}
      <div className="relative h-80 bg-slate-200 overflow-hidden">
        <div 
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
        >
          {profile.images.map((img, idx) => (
            <img 
              key={idx} 
              src={img} 
              alt={`Profile ${idx}`} 
              className="w-full h-full object-cover flex-shrink-0" 
            />
          ))}
        </div>
        
        {/* Carousel Indicators */}
        {profile.images.length > 1 && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
            {profile.images.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentImageIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent pointer-events-none"></div>
      </div>

      <div className="px-6 py-4 space-y-6 -mt-8 relative z-20">
        {/* Main Info Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-2xl font-bold text-slate-800">{profile.name}, {profile.age}</h2>
             <span className="text-xs bg-rose-100 text-rose-600 px-3 py-1.5 rounded-full font-bold">92% Aura</span>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Ma Localisation</label>
              <div className="relative">
                <i className="fas fa-location-dot absolute left-4 top-1/2 -translate-y-1/2 text-rose-500 text-sm"></i>
                <input 
                  type="text"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-10 pr-4 text-sm focus:border-rose-300 focus:bg-white outline-none transition-all"
                  value={profile.location}
                  onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Ex: Paris, France"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Ma Bio</label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm focus:border-rose-300 focus:bg-white outline-none transition-all resize-none"
                rows={4}
                value={profile.bio}
                onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Dites-en un peu plus sur vous..."
              />
            </div>
          </div>
        </div>

        {/* Enable Notifications Button */}
        <button
          onClick={enableNotifications}
          disabled={isNotifLoading}
          className="w-full py-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center gap-3 text-indigo-600 font-bold shadow-sm hover:bg-indigo-100 transition-all active:scale-95"
        >
          {isNotifLoading ? (
            <i className="fas fa-spinner fa-spin"></i>
          ) : (
            <i className="fas fa-bell"></i>
          )}
          Activer les notifications
        </button>

        {/* Photo Management Section */}
        <section className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mes Photos</h3>
            <span className="text-[10px] text-slate-400 font-medium">{profile.images.length}/6</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {profile.images.map((img, idx) => (
              <div key={idx} className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-sm group">
                <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                <button 
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <i className="fas fa-times"></i>
                </button>
                {idx === 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-rose-500/80 text-white text-[8px] py-1 text-center font-bold">PRINCIPALE</div>
                )}
              </div>
            ))}
            {profile.images.length < 6 && (
              <div 
                onClick={() => setShowPhotoSourceMenu(true)}
                className="aspect-[3/4] rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-300 cursor-pointer hover:border-rose-300 hover:text-rose-300 transition-colors bg-white/50"
              >
                <i className="fas fa-plus text-lg"></i>
                <span className="text-[8px] font-bold uppercase tracking-tighter">Ajouter</span>
              </div>
            )}
          </div>
        </section>

        {/* Interests Section */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Mes Intérêts</h3>
          <div className="flex flex-wrap gap-2">
            {profile.interests.map(interest => (
              <span key={interest} className="px-4 py-2 rounded-full bg-white border border-slate-200 text-xs text-slate-600 font-medium shadow-sm">
                {interest}
              </span>
            ))}
            <button className="px-4 py-2 rounded-full border border-dashed border-slate-300 text-xs text-slate-400 hover:bg-slate-100 transition-colors">
              + Ajouter
            </button>
          </div>
        </section>

        <div className="pt-4 pb-8 space-y-3">
          <button 
            onClick={() => setShowPreview(true)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold shadow-lg shadow-rose-200 hover:opacity-90 transition-opacity"
          >
            Aperçu & Enregistrer
          </button>
          
          <button className="w-full py-4 rounded-2xl text-slate-400 text-sm font-semibold hover:text-slate-600 transition-colors">
            Déconnexion
          </button>
        </div>
      </div>

      {/* Photo Source Choice Menu */}
      {showPhotoSourceMenu && (
        <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex flex-col justify-end animate-fadeIn">
          <div className="bg-white rounded-t-[40px] p-8 space-y-4 animate-slideInUp">
            <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Ajouter une photo</h3>
            <button 
              onClick={startCamera}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <i className="fas fa-camera text-xl"></i>
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-800">Prendre une photo</p>
                <p className="text-xs text-slate-500">Utiliser l'appareil photo</p>
              </div>
            </button>
            <label className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                <i className="fas fa-image text-xl"></i>
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-800">Galerie</p>
                <p className="text-xs text-slate-500">Choisir depuis vos fichiers</p>
              </div>
              <input type="file" className="hidden" accept="image/*" multiple onChange={handleAddImages} />
            </label>
            <button 
              onClick={() => setShowPhotoSourceMenu(false)}
              className="w-full py-4 text-slate-400 font-bold hover:text-slate-600"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[120] bg-black flex flex-col items-center justify-between p-6">
          <div className="w-full flex justify-between items-center text-white">
            <button onClick={stopCamera} className="w-10 h-10 flex items-center justify-center">
              <i className="fas fa-times text-xl"></i>
            </button>
            <span className="font-bold">Sourire !</span>
            <div className="w-10"></div>
          </div>
          
          <div className="relative w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden bg-slate-900 border-2 border-white/20">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover mirror"
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="flex flex-col items-center gap-8 w-full">
            <div className="flex justify-center items-center gap-12">
               <div className="w-10 h-10 rounded-full border border-white/20"></div>
               <button 
                onClick={capturePhoto}
                className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
               >
                 <div className="w-16 h-16 rounded-full border-4 border-slate-900"></div>
               </button>
               <button className="w-10 h-10 text-white/50">
                 <i className="fas fa-sync-alt"></i>
               </button>
            </div>
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Appuyez pour capturer</p>
          </div>
        </div>
      )}

      {/* Profile Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm h-[80vh] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative animate-slideInUp">
            
            {/* Modal Header */}
            <div className="absolute top-6 left-0 right-0 z-50 flex justify-between px-6 items-center">
              <span className="bg-black/20 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/20">Aperçu Public</span>
              <button 
                onClick={() => setShowPreview(false)}
                className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Public Card Content */}
            <div className="flex-1 relative overflow-hidden group">
              {/* Card Images */}
              <div 
                className="flex h-full transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${previewImageIndex * 100}%)` }}
              >
                {profile.images.map((img, idx) => (
                  <img key={idx} src={img} className="w-full h-full object-cover flex-shrink-0" />
                ))}
              </div>

              {/* Tap Zones for Preview Navigation */}
              <div className="absolute inset-0 flex">
                <div 
                  className="w-1/2 h-full z-10" 
                  onClick={() => setPreviewImageIndex(prev => Math.max(0, prev - 1))}
                ></div>
                <div 
                  className="w-1/2 h-full z-10" 
                  onClick={() => setPreviewImageIndex(prev => Math.min(profile.images.length - 1, prev + 1))}
                ></div>
              </div>

              {/* Progress Bar (Indicators) */}
              <div className="absolute top-4 left-4 right-4 z-40 flex gap-1 px-2">
                {profile.images.map((_, idx) => (
                  <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                    <div className={`h-full bg-white transition-all ${idx === previewImageIndex ? 'w-full' : 'w-0'}`}></div>
                  </div>
                ))}
              </div>

              {/* Gradient & Info Overlay */}
              <div className="absolute inset-0 card-gradient pointer-events-none flex flex-col justify-end p-8 text-white">
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <h2 className="text-3xl font-bold">{profile.name}, {profile.age}</h2>
                    <p className="flex items-center gap-1 opacity-90 text-sm">
                      <i className="fas fa-location-dot text-rose-400"></i> {profile.location}
                    </p>
                  </div>
                  <div className="bg-rose-500 rounded-2xl px-3 py-1 text-xs border border-rose-400 flex items-center gap-2 animate-pulse">
                    <i className="fas fa-sparkles text-yellow-300"></i>
                    <span className="font-bold">Aura: 92%</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <p className="text-xs line-clamp-3 opacity-90 font-light leading-relaxed">
                    {profile.bio}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map(interest => (
                      <span key={interest} className="text-[9px] uppercase tracking-wider bg-white/10 px-2 py-1 rounded-full border border-white/20">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-6 bg-white border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setShowPreview(false)}
                className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                Modifier
              </button>
              <button 
                onClick={handleSave}
                className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold text-sm shadow-lg shadow-rose-200 hover:opacity-90 transition-opacity"
              >
                Confirmer & Publier
              </button>
            </div>
          </div>
          <p className="mt-4 text-white/50 text-xs text-center px-8">C'est ainsi que les autres membres verront votre profil dans leur flux.</p>
        </div>
      )}

      <style>{`
        @keyframes slideInUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideInUp {
          animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
};

export default ProfileView;
