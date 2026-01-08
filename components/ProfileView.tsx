
import React, { useState, useEffect, useRef } from 'react';
import { Profile } from '../types';
import { subscribeToPushNotifications } from '../push';
import { supabase } from '../lib/supabase';

interface ProfileViewProps {
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
}

const ProfileView: React.FC<ProfileViewProps> = ({ profile, setProfile }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  
  // Camera states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showPhotoSourceMenu, setShowPhotoSourceMenu] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Notification state
  const [isNotifLoading, setIsNotifLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [notifTitle, setNotifTitle] = useState("Match !");
  const [notifBody, setNotifBody] = useState("Quelqu'un vous a liké ✨");
  const [showDebug, setShowDebug] = useState(false);
  
  // Diagnostic State
  const [debugSub, setDebugSub] = useState<any>(null);

  // Auto-scroll carousel
  useEffect(() => {
    if (profile.images.length <= 1 || showPreview || isCameraOpen) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % profile.images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [profile.images.length, showPreview, isCameraOpen]);

  // Load diagnostic info
  const loadSubscriptionInfo = async () => {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setDebugSub(sub ? sub.toJSON() : "Inactif");
    }
  };

  useEffect(() => {
    loadSubscriptionInfo();
  }, []);

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
      alert("Impossible d'accéder à la caméra.");
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
      alert("Une photo minimum requise.");
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

  const enableNotifications = async () => {
    setIsNotifLoading(true);
    try {
      await subscribeToPushNotifications();
      await loadSubscriptionInfo();
      alert("Notifications activées !");
    } catch (error: any) {
      console.error(error);
      alert(`Erreur : ${error.message}`);
    } finally {
      setIsNotifLoading(false);
    }
  };
  
  const resetSubscription = async () => {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        alert("Réinitialisé.");
        loadSubscriptionInfo();
      }
    }
  };

  const sendTestNotificationServer = async () => {
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          user_id: profile.id,
          title: notifTitle,
          body: notifBody,
          url: window.location.origin
        }
      });
      if (error) throw error;
      if (data?.results?.some((r: any) => r.success)) {
         alert("Notification envoyée !");
      } else {
         alert("Erreur d'envoi. Vérifiez les logs.");
      }
    } catch (e: any) {
      alert(`Erreur: ${e.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 animate-fadeIn scrollbar-hide relative pb-20">
      {/* Header Image */}
      <div className="relative h-80 bg-slate-200 overflow-hidden group">
        <div 
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
        >
          {profile.images.map((img, idx) => (
            <img key={idx} src={img} alt="" className="w-full h-full object-cover flex-shrink-0" />
          ))}
        </div>
        
        {/* Indicators */}
        {profile.images.length > 1 && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
            {profile.images.map((_, idx) => (
              <div key={idx} className={`h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`} />
            ))}
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent pointer-events-none"></div>

        <button 
          onClick={() => setShowPhotoSourceMenu(true)}
          className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-rose-500 text-white shadow-lg flex items-center justify-center z-40 active:scale-95 transition-transform"
        >
          <i className="fas fa-camera"></i>
        </button>
      </div>

      <div className="px-6 space-y-6 -mt-8 relative z-20">
        
        {/* Basic Info */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-2xl font-bold text-slate-800">{profile.name}, {profile.age}</h2>
             <span className="text-xs bg-rose-100 text-rose-600 px-3 py-1.5 rounded-full font-bold">92% Aura</span>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Localisation</label>
              <input 
                type="text"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm focus:border-rose-300 focus:bg-white outline-none transition-all"
                value={profile.location}
                onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Bio</label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm focus:border-rose-300 focus:bg-white outline-none transition-all resize-none"
                rows={3}
                value={profile.bio}
                onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Photos</label>
          <div className="grid grid-cols-3 gap-2">
            {profile.images.map((img, idx) => (
              <div key={idx} className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-sm">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button 
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-sm"
                >
                  <i className="fas fa-times text-[10px]"></i>
                </button>
              </div>
            ))}
            <button 
              onClick={() => setShowPhotoSourceMenu(true)}
              className="aspect-[3/4] rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-rose-300 hover:text-rose-500 bg-white"
            >
              <i className="fas fa-plus"></i>
            </button>
          </div>
        </div>

        {/* Notifications & Settings */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
           <button 
             onClick={() => setShowDebug(!showDebug)}
             className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
           >
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center">
                 <i className="fas fa-cog"></i>
               </div>
               <span className="font-bold text-slate-700 text-sm">Paramètres & Notifications</span>
             </div>
             <i className={`fas fa-chevron-down text-slate-400 transition-transform ${showDebug ? 'rotate-180' : ''}`}></i>
           </button>
           
           {showDebug && (
             <div className="p-4 space-y-4 bg-white border-t border-slate-100 animate-fadeIn">
               <button
                 onClick={enableNotifications}
                 disabled={isNotifLoading}
                 className="w-full py-3 rounded-xl bg-indigo-50 text-indigo-600 font-bold text-sm flex items-center justify-center gap-2"
               >
                 {isNotifLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-bell"></i>}
                 Activer les notifications
               </button>

               <div className="pt-2 border-t border-slate-100">
                 <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Zone de Test</h4>
                 <div className="flex gap-2 mb-2">
                   <input 
                      type="text" 
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                      placeholder="Titre"
                   />
                 </div>
                 <div className="flex gap-2">
                   <button onClick={resetSubscription} className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500">
                     Reset
                   </button>
                   <button 
                     onClick={sendTestNotificationServer} 
                     disabled={isSending}
                     className="flex-[2] py-2 bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                   >
                     {isSending ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
                     Envoyer Test
                   </button>
                 </div>
                 <div className="mt-2 p-2 bg-slate-100 rounded-lg">
                   <p className="text-[10px] font-mono text-slate-500 break-all">
                     {typeof debugSub === 'string' ? debugSub : (debugSub ? "Abonnement Actif (OK)" : "Inactif")}
                   </p>
                 </div>
               </div>
             </div>
           )}
        </div>

        <button 
          onClick={() => alert("Profil sauvegardé")}
          className="w-full py-4 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-200 active:scale-95 transition-transform"
        >
          Enregistrer les modifications
        </button>
      </div>

      {/* Photo Source Modal */}
      {showPhotoSourceMenu && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end animate-fadeIn" onClick={() => setShowPhotoSourceMenu(false)}>
          <div className="w-full bg-white rounded-t-[2rem] p-6 space-y-3 animate-slideInUp" onClick={e => e.stopPropagation()}>
            <h3 className="text-center font-bold text-slate-800 mb-2">Ajouter une photo</h3>
            <button onClick={startCamera} className="w-full p-4 rounded-2xl bg-slate-50 flex items-center gap-4 hover:bg-slate-100">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center"><i className="fas fa-camera"></i></div>
              <span className="font-semibold text-slate-700">Appareil Photo</span>
            </button>
            <label className="w-full p-4 rounded-2xl bg-slate-50 flex items-center gap-4 hover:bg-slate-100 cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center"><i className="fas fa-images"></i></div>
              <span className="font-semibold text-slate-700">Galerie</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleAddImages} />
            </label>
            <button onClick={() => setShowPhotoSourceMenu(false)} className="w-full p-4 font-bold text-slate-400">Annuler</button>
          </div>
        </div>
      )}

      {/* Camera Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
          <div className="relative flex-1 bg-black">
             <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
             <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="h-32 bg-black flex items-center justify-around px-8">
            <button onClick={stopCamera} className="text-white p-4"><i className="fas fa-times text-2xl"></i></button>
            <button onClick={capturePhoto} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
              <div className="w-16 h-16 bg-white rounded-full active:scale-90 transition-transform"></div>
            </button>
            <div className="w-10"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileView;
