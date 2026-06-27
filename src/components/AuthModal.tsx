import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Mail, User as UserIcon, Loader2 } from 'lucide-react';
import { auth, db, googleProvider } from '../firebase';
import AgreementModal from './AgreementModal';
import { REGISTRATION_AGREEMENT, DIGITAL_CONTENT_AGREEMENT } from '../constants/agreements';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bankFullName, setBankFullName] = useState('');
  const [itemsatisUsername, setItemsatisUsername] = useState('');
  const [itemsatisFullName, setItemsatisFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [agreeRegistration, setAgreeRegistration] = useState(false);
  const [agreeDigital, setAgreeDigital] = useState(false);
  const [activeAgreement, setActiveAgreement] = useState<'registration' | 'digital' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (mode === 'register') {
        if (!bankFullName.trim()) {
          throw new Error('Lütfen banka/Papara hesabınızdaki isim ve soyisminizi eksiksiz girin. Bu doğrulama için zorunludur.');
        }
        if (bankFullName.split(' ').length < 2) {
          throw new Error('Lütfen hem adınızı hem de soyadınızı girin.');
        }
        if (!itemsatisUsername.trim()) {
          throw new Error('Lütfen İtemSatış kullanıcı adınızı girin. Bu doğrulama için zorunludur.');
        }
        if (!itemsatisFullName.trim()) {
          throw new Error('Lütfen İtemSatış hesabınızda kayıtlı olan ad ve soyadınızı girin.');
        }
        if (itemsatisFullName.trim().split(' ').length < 2) {
          throw new Error('Lütfen İtemSatış hesabınızdaki hem adınızı hem de soyadınızı girin.');
        }
        if (!agreeRegistration) {
          throw new Error('Lütfen Kayıt ve Gizlilik Sözleşmesi\'ni onaylayın.');
        }
        if (!agreeDigital) {
          throw new Error('Lütfen Dijital İçerik ve Kullanım Sözleşmesi\'ni onaylayın.');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save user profile to Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          bankFullName: bankFullName.trim(),
          itemsatisUsername: itemsatisUsername.trim(),
          itemsatisFullName: itemsatisFullName.trim(),
          role: 'user',
          createdAt: Date.now()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose(); // Close modal on success
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') setError('Bu e-posta adresi zaten kullanımda.');
      else if (err.code === 'auth/invalid-credential') setError('E-posta adresi veya şifre hatalı.');
      else if (err.code === 'auth/weak-password') setError('Şifreniz en az 6 karakter olmalıdır.');
      else if (err.code === 'auth/operation-not-allowed') {
        setError('E-posta ve şifre ile giriş/kayıt yöntemi şu an Firebase Console üzerinde aktif değil. Lütfen Firebase Console -> Authentication -> Sign-in method kısmından Email/Password seçeneğini aktif edin.');
      } else setError(err.message || 'Giriş yapılırken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;

      // Check if user document already exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        // Create user document if it's their first time logging in
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          bankFullName: user.displayName || 'Banka İsmi Belirtilmedi',
          role: 'user',
          createdAt: Date.now()
        });
      }
      onClose(); // Close modal on success
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Google ile giriş henüz Firebase Console üzerinden aktif edilmemiş. Lütfen Firebase Console -> Authentication -> Sign-in method sekmesinden Google seçeneğini etkinleştirin.');
      } else if (err.code === 'auth/unauthorized-domain') {
        const currentDomain = window.location.hostname;
        setError(`Bu alan adı (${currentDomain}) Firebase projenizde yetkilendirilmemiş. Lütfen Firebase Console -> Authentication -> Settings (Ayarlar) -> Authorized domains (Yetkilendirilmiş alan adları) kısmına giderek "${currentDomain}" alan adını ekleyin.`);
      } else {
        setError(err.message || 'Google ile giriş yapılırken bir hata oluştu.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 md:p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] flex flex-col"
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-4 mt-2 flex-shrink-0">
                <h2 className="text-xl md:text-2xl font-black text-white font-sans tracking-tight">
                  {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
                </h2>
                <p className="text-[11px] md:text-xs text-zinc-400 mt-1 leading-relaxed">
                  {mode === 'login' 
                    ? 'BayiiStore hesabınıza giriş yaparak ürünlerinizi yönetin.' 
                    : 'Hesap oluşturarak siparişlerinizi ve e-pin kodlarınızı takip edebilirsiniz.'}
                </p>
              </div>

              {/* Scrollable Body Content */}
              <div className="flex-1 overflow-y-auto pr-1 md:pr-1.5 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-xs font-medium text-red-400">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {mode === 'register' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">
                          Ad & Soyad (Banka / Papara ile Aynı Olmalı)
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <UserIcon className="h-4 w-4 text-zinc-500" />
                          </div>
                          <input
                            type="text"
                            required
                            value={bankFullName}
                            onChange={(e) => setBankFullName(e.target.value)}
                            placeholder="Örn: Ahmet Yılmaz"
                            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs md:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                          />
                        </div>
                        <p className="text-[9px] text-zinc-500 ml-1 leading-normal">
                          ⚠️ Dekont doğrulamasında sorun yaşamamak için lütfen hesap adınızı doğru girin.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">
                          İtemSatış Kullanıcı Adınız
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <UserIcon className="h-4 w-4 text-zinc-500" />
                          </div>
                          <input
                            type="text"
                            required
                            value={itemsatisUsername}
                            onChange={(e) => setItemsatisUsername(e.target.value)}
                            placeholder="Örn: Kiwoo35"
                            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs md:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                          />
                        </div>
                        <p className="text-[9px] text-zinc-500 ml-1 leading-normal">
                          ⚠️ Kod doğrulaması yaparken bu kullanıcı adı eşleştirilecektir.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">
                          İtemSatış'a Kayıtlı İsim Soyisim
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <UserIcon className="h-4 w-4 text-zinc-500" />
                          </div>
                          <input
                            type="text"
                            required
                            value={itemsatisFullName}
                            onChange={(e) => setItemsatisFullName(e.target.value)}
                            placeholder="Örn: Ahmet Yılmaz"
                            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs md:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                          />
                        </div>
                        <p className="text-[9px] text-zinc-500 ml-1 leading-normal">
                          ⚠️ İtemSatış hesabınızda kayıtlı olan gerçek adınız ve soyadınız ile birebir aynı olmalıdır.
                        </p>
                      </div>
                    </>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">
                      E-Posta Adresi
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-zinc-500" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="mail@ornek.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs md:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">
                      Şifre
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-zinc-500" />
                      </div>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs md:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  {mode === 'register' && (
                    <div className="space-y-3 my-3 border-t border-b border-zinc-900 py-3 px-1">
                      <label className="flex items-start gap-2.5 cursor-pointer group select-none">
                        <input
                          type="checkbox"
                          checked={agreeRegistration}
                          onChange={(e) => setAgreeRegistration(e.target.checked)}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-800 bg-zinc-900 text-indigo-600 focus:ring-indigo-500/20 focus:ring-2 transition-all cursor-pointer accent-indigo-600"
                        />
                        <span className="text-[10px] md:text-[11px] leading-relaxed text-zinc-400 group-hover:text-zinc-300 transition-colors">
                          <button
                            type="button"
                            onClick={() => setActiveAgreement('registration')}
                            className="font-black text-indigo-400 hover:text-indigo-300 underline cursor-pointer text-left mr-1 inline"
                          >
                            Kayıt ve Gizlilik Sözleşmesi
                          </button>
                          şartlarını okudum, anladım ve verilerimin güvenlik amaçlı loglanmasını kabul ediyorum. <span className="text-red-500">*</span>
                        </span>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer group select-none">
                        <input
                          type="checkbox"
                          checked={agreeDigital}
                          onChange={(e) => setAgreeDigital(e.target.checked)}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-800 bg-zinc-900 text-indigo-600 focus:ring-indigo-500/20 focus:ring-2 transition-all cursor-pointer accent-indigo-600"
                        />
                        <span className="text-[10px] md:text-[11px] leading-relaxed text-zinc-400 group-hover:text-zinc-300 transition-colors">
                          <button
                            type="button"
                            onClick={() => setActiveAgreement('digital')}
                            className="font-black text-indigo-400 hover:text-indigo-300 underline cursor-pointer text-left mr-1 inline"
                          >
                            Dijital İçerik ve Kullanım Sözleşmesi
                          </button>
                          şartlarını tamamen kabul ediyorum, aktivasyon sonrasında iade hakkımın olmadığını onaylıyorum. <span className="text-red-500">*</span>
                        </span>
                      </label>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || (mode === 'register' && (!agreeRegistration || !agreeDigital))}
                    className="w-full mt-2 bg-white hover:bg-zinc-200 text-black font-sans font-bold py-2.5 px-4 rounded-xl transition-colors text-xs md:text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                    ) : (
                      mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol ve Başla'
                    )}
                  </button>
                </form>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-900"></div>
                  </div>
                  <div className="relative flex justify-center text-[9px] uppercase font-bold text-zinc-500 tracking-wider">
                    <span className="bg-zinc-950 px-2.5">VEYA</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 hover:border-zinc-700 font-sans font-bold py-2.5 px-4 rounded-xl transition-colors text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Google ile Devam Et
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                    className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {mode === 'login' 
                      ? 'Hesabınız yok mu? Hemen Kayıt Olun' 
                      : 'Zaten bir hesabınız var mı? Giriş Yapın'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>

          <AgreementModal
            isOpen={activeAgreement === 'registration'}
            onClose={() => setActiveAgreement(null)}
            title={REGISTRATION_AGREEMENT.title}
            content={REGISTRATION_AGREEMENT.content}
          />

          <AgreementModal
            isOpen={activeAgreement === 'digital'}
            onClose={() => setActiveAgreement(null)}
            title={DIGITAL_CONTENT_AGREEMENT.title}
            content={DIGITAL_CONTENT_AGREEMENT.content}
          />
        </>
      )}
    </AnimatePresence>
  );
}
