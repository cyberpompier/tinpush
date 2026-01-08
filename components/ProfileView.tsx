
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
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  
  // Camera states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showPhotoSourceMenu, setShowPhotoSourceMenu] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Notification state
  const [isNotifLoading, setIsNotifLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [notifTitle, setNotifTitle] = useState("Nouveau Match !");
  const [notifBody, setNotifBody] = useState("Quelqu'un a liké votre profil Aura ✨");
  
  // Diagnostic State
  const [debugSub, setDebugSub] = useState<any>(null);

  // Auto-scroll carousel every 5 seconds for the edit view
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
      setDebugSub(sub ? sub.toJSON() : "Aucune souscription active sur ce navigateur");
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
      await loadSubscriptionInfo(); // Reload debug info
      alert("Notifications activées avec succès !");
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
        alert("Désabonnement local effectué. Cliquez sur 'Activer' pour générer une nouvelle clé.");
        loadSubscriptionInfo();
      } else {
        alert("Aucun abonnement à supprimer.");
      }
    }
  };

  // Test Local (navigateur -> navigateur)
  const sendTestNotificationLocal = async () => {
    if (Notification.permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(notifTitle, {
          body: notifBody,
          icon: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f496.png',
          badge: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f496.png',
          vibrate: [100, 50, 100],
          data: { url: '/' }
        } as any);
      } catch (e) {
        console.error(e);
        alert("Erreur SW Local");
      }
    } else {
      alert("Activez les notifications d'abord.");
    }
  };

  // Test Réel (Frontend -> Edge Function -> WebPush -> Navigateur)
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
      
      console.log("Résultat serveur:", data);
      
      if (data && data.error) {
        alert(`Erreur Serveur: ${data.error}`);
      } else if (data && data.results) {
        const successes = data.results.filter((r: any) => r.success).length;
        const failures = data.results.filter((r: any) => !r.success).length;
        
        if (successes > 0) {
           alert(`Succès ! Notification envoyée à ${successes} appareil(s).`);
        } else {
           const firstError = data.results[0]?.error || "Inconnue";
           alert(`Échec de l'envoi (${failures} erreurs). Détail: ${firstError}`);
        }
      } else if (data && data.message) {
        alert(`Info: ${data.message}`);
      }
    } catch (e: any) {
      console.error("Erreur appel fonction:", e);
      alert(`Erreur d'appel: ${e.message || 'Impossible de joindre la fonction Edge'}`);
    } finally {
      setIsSending(false);
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

        {/* Add/Edit Photo Button */}
        <button 
          onClick={() => setShowPhotoSourceMenu(true)}
          className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-rose-500 text-white shadow-lg flex items-center justify-center z-40 active:scale-95 transition-transform"
        >
          <i className="fas fa-camera"></i>
        </button>
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

        {/* Test Zone */}
        <div className="bg-slate-100 rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-slate-500 text-xs uppercase tracking-widest">Zone de Test (Debug)</h3>
            
            <div className="space-y-2">
                <input 
                    type="text" 
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm"
                    placeholder="Titre notif"
                />
                 <input 
                    type="text" 
                    value={notifBody}
                    onChange={(e) => setNotifBody(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm"
                    placeholder="Message notif"
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={sendTestNotificationLocal}
                    className="py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 shadow-sm active:scale-95 transition-transform"
                >
                    Test Local
                </button>
                <button 
                    onClick={sendTestNotificationServer}
                    disabled={isSending}
                    className="py-3 bg-slate-800 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-300 active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                    {isSending ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-server"></i>}
                    Test Serveur
                </button>
            </div>
        </div>

        {/* Diagnostic Panel */}
        <div className="bg-slate-800 rounded-3xl p-6 space-y-3 text-white">
           <div className="flex justify-between items-center">
             <h3 className="font-bold text-slate-400 text-xs uppercase tracking-widest">Diagnostic Données</h3>
             <button onClick={loadSubscriptionInfo} className="text-xs text-rose-400 hover:text-rose-300">
               <i className="fas fa-sync"></i> Refresh
             </button>
           </div>
           
           <div className="bg-slate-900 rounded-xl p-3 max-h-40 overflow-auto border border-slate-700">
             <pre className="text-[10px] font-mono whitespace-pre-wrap text-green-400 break-all">
               {debugSub ? JSON.stringify(debugSub, null, 2) : "Chargement..."}
             </pre>
           </div>
           
           <button 
             onClick={resetSubscription}
             className="w-full py-2 bg-red-500/20 text-red-300 border border-red-500/50 rounded-xl text-xs font-bold hover:bg-red-500/30 transition-colors"
           >
             <i className="fas fa-trash mr-2"></i>
             Forcer Désabonnement (Reset)
           </button>
           <p className="text-[10px] text-slate-500 italic">
             Si "endpoint" est null ci-dessus, cliquez sur Reset puis "Activer les notifications".
           </p>
        </div>

        {/* Photo Gallery Manager */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Mes Photos ({profile.images.length})</label>
          <div className="grid grid-cols-3 gap-3">
            {profile.images.map((img, idx) => (
              <div key={idx} className="relative aspect-[3/4] rounded-2xl overflow-hidden group shadow-sm">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button 
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md active:scale-90 transition-transform"
                >
                  <i className="fas fa-times text-xs"></i>
                </button>
              </div>
            ))}
            <button 
              onClick={() => setShowPhotoSourceMenu(true)}
              className="aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-rose-300 hover:text-rose-500 transition-colors bg-white"
            >
              <i className="fas fa-plus text-xl"></i>
              <span className="text-[10px] font-bold uppercase">Ajouter</span>
            </button>
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-transform"
        >
          Enregistrer le profil
        </button>
        
        <div className="h-20"></div> {/* Spacing for bottom nav */}
      </div>

      {/* Photo Source Modal */}
      {showPhotoSourceMenu && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-end animate-fadeIn" onClick={() => setShowPhotoSourceMenu(false)}>
          <div className="w-full bg-white rounded-t-[2rem] p-6 space-y-4 animate-slideInUp" onClick={e => e.stopPropagation()}>
            <h3 className="text-center font-bold text-slate-800 mb-4">Ajouter une photo</h3>
            
            <button onClick={startCamera} className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4 hover:bg-slate-100 transition-colors">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center">
                <i className="fas fa-camera"></i>
              </div>
              <span className="font-semibold text-slate-700">Prendre une photo</span>
            </button>

            <label className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4 hover:bg-slate-100 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center">
                <i className="fas fa-images"></i>
              </div>
              <span className="font-semibold text-slate-700">Choisir depuis la galerie</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleAddImages} />
            </label>

            <button onClick={() => setShowPhotoSourceMenu(false)} className="w-full p-4 font-bold text-slate-400">
              Annuler
            </button>
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
            <button onClick={stopCamera} className="text-white p-4">
              <i className="fas fa-times text-2xl"></i>
            </button>
            <button onClick={capturePhoto} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
              <div className="w-16 h-16 bg-white rounded-full active:scale-90 transition-transform"></div>
            </button>
            <div className="w-10"></div> {/* Spacer for alignment */}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileView;
