import React, { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from "firebase/firestore";
import { seedInitialData } from "./utils/seeder";
import Navbar from "./components/Navbar";
import ProductList from "./components/ProductList";
import StockVerifier from "./components/StockVerifier";
import AdminPanel from "./components/AdminPanel";
import SupportForm from "./components/SupportForm";
import SupportBanner from "./components/SupportBanner";
import AiAssistant from "./components/AiAssistant";
import FaqSection from "./components/FaqSection";
import { Claim } from "./types";
import { ShieldCheck, KeyRound, ArrowRight, Download, Play, FileText, Sparkles, Clock, LockKeyhole, Laptop, ExternalLink, HelpCircle, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userClaims, setUserClaims] = useState<Claim[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Initialize Theme
  useEffect(() => {
    // Theme setup - enforce dark by default per request
    setIsDarkMode(true);
    document.documentElement.classList.add("dark");
  }, []);

  // Subscribe to Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch user role and profile
        try {
          const docSnap = await getDoc(doc(db, "users", currentUser.uid));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProfile(data);
            if (data.role === 'admin') {
              setUserRole('admin');
            } else {
              setUserRole('user');
            }
          } else {
            setUserProfile(null);
            setUserRole('user');
          }
        } catch (err) {
          console.error("Error fetching role/profile", err);
        }
      } else {
        setUserProfile(null);
        setUserRole('user');
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen to Global Settings (Maintenance Mode)
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "global"), (docSnap) => {
      if (docSnap.exists()) {
        setIsMaintenanceMode(docSnap.data().maintenanceMode || false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to User Claims (Purchases)
  useEffect(() => {
    if (!user) {
      setUserClaims([]);
      return;
    }

    const q = query(
      collection(db, "claims"),
      where("userId", "==", user.uid),
      orderBy("claimedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Claim[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Claim);
        });
        setUserClaims(list);
      },
      (error) => {
        console.error("Error listening to user claims:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Mock User UID/Email if guest to let them use the app
  const activeUserId = user ? user.uid : "anonymous_client";
  const activeUserEmail = user ? user.email || "anon@bayiistore.com" : "misafir@bayiistore.com";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 flex flex-col transition-colors duration-150 selection:bg-indigo-500/30">
      
      {/* Floating AI Assistant */}
      <AiAssistant />

      {/* Navigation Bar */}
      <Navbar
        user={user}
        isAdminMode={isAdminMode}
        setIsAdminMode={setIsAdminMode}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
      />

      {/* Main Body */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-6">
        <AnimatePresence mode="wait">
          
          {/* MAINTENANCE MODE CHECK */}
          {isMaintenanceMode && userRole !== 'admin' && !isAdminMode ? (
            <motion.div
              key="maintenance"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center"
            >
              <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl -ml-10 -mb-10"></div>
                
                <ShieldCheck className="w-16 h-16 text-indigo-500 mx-auto mb-6" />
                <h2 className="text-2xl font-black text-white mb-4">Sistem Bakımda</h2>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                  BayiiStore şu anda size daha iyi hizmet verebilmek için güncelleniyor. Lütfen kısa bir süre sonra tekrar deneyin.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-bold text-indigo-400 uppercase tracking-widest">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  Geliştirme Modu Aktif
                </div>
              </div>
            </motion.div>
          ) : isAdminMode ? (
            <motion.div
              id="admin-mode-container"
              key="admin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <AdminPanel />
            </motion.div>
          ) : (
            /* CUSTOMER MODE */
            <motion.div
              id="customer-mode-container"
              key="customer"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-10"
            >
              
              {/* Hero Banner Section */}
              <div id="hero-banner" className="relative rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-zinc-900 text-white p-6 sm:p-10 overflow-hidden shadow-xl border border-indigo-800">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:16px_16px]"></div>
                <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>

                <div className="relative max-w-2xl">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/35 text-xs text-indigo-300 font-sans font-bold uppercase tracking-wider mb-4">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse text-yellow-300" />
                    Türkiye'nin En Güvenli E-pin Platformu
                  </span>
                  <h2 className="font-sans font-black text-2xl sm:text-4xl tracking-tight leading-none mb-3">
                    BayiiStore E-pin Guard Korumalı Teslimat Sistemi
                  </h2>
                  <p className="text-sm text-zinc-300 leading-relaxed mb-6">
                    Beğendiğiniz bypass aracı, hile loader'ı veya premium APK'yı ItemSatış güvencesiyle satın alın. Size teslim edilen stok kodunu aşağıya girerek dosyanızı anında indirin!
                  </p>
                  
                  {/* Step Guides */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-zinc-700/60 pt-6 text-xs text-zinc-300">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-indigo-500/20 text-indigo-400 font-black rounded-full flex items-center justify-center flex-shrink-0 border border-indigo-500/30">
                        1
                      </div>
                      <div>
                        <p className="font-bold text-white mb-0.5">İlan Seç & Al</p>
                        <p className="text-[11px] text-zinc-400">Ürünün altındaki ItemSatış linkine tıklayıp ödeme yapın.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-indigo-500/20 text-indigo-400 font-black rounded-full flex items-center justify-center flex-shrink-0 border border-indigo-500/30">
                        2
                      </div>
                      <div>
                        <p className="font-bold text-white mb-0.5">Kodu Kopyala</p>
                        <p className="text-[11px] text-zinc-400">ItemSatış'tan size verilen teslimat stok kodunu kopyalayın.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-indigo-500/20 text-indigo-400 font-black rounded-full flex items-center justify-center flex-shrink-0 border border-indigo-500/30">
                        3
                      </div>
                      <div>
                        <p className="font-bold text-white mb-0.5">Sitede Doğrula</p>
                        <p className="text-[11px] text-zinc-400">Kodu onay kutusuna girerek premium dosyanıza anında ulaşın.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Verifier & User Personal Dashboard Row */}
              <div id="dashboard-row" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Global Stock Code Verifier Card */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <KeyRound className="w-4 h-4 text-indigo-500" />
                    <span className="font-sans font-black text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">HIZLI ONAY</span>
                  </div>
                  <StockVerifier
                    currentUserId={activeUserId}
                    currentUserEmail={activeUserEmail}
                  />
                </div>

                {/* Unlocked Claims Dashboard List */}
                <div id="unlocked-dashboard" className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                          <LockKeyhole className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="font-sans font-bold text-sm text-zinc-800 dark:text-white">Dosyalarım ve Lisanslarım</h3>
                          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Satın aldığınız ve başarılı doğruladığınız ürünlerin teslimat listesi.</p>
                        </div>
                      </div>
                    </div>

                    {user && (
                      <div className="mb-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md flex-shrink-0">
                            {userProfile?.bankFullName ? userProfile.bankFullName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : "?")}
                          </div>
                          <div>
                            <p className="text-xs font-sans font-black text-zinc-800 dark:text-white leading-tight">
                              {userProfile?.bankFullName || "Kullanıcı"}
                            </p>
                            <p className="text-[10px] text-zinc-400 font-mono leading-none mt-1">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {(() => {
                            let badge = { text: "Yeni Üye 🌱", class: "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500" };
                            if (userClaims.length >= 5) badge = { text: "Seçkin Elmas Üye 💎", class: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-extrabold animate-pulse" };
                            else if (userClaims.length >= 3) badge = { text: "Altın Üye 🥇", class: "bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold" };
                            else if (userClaims.length >= 1) badge = { text: "Gümüş Üye 🥈", class: "bg-slate-400/10 border-slate-400/30 text-slate-400 font-bold" };
                            return (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] rounded-full border ${badge.class} uppercase tracking-wider`}>
                                {badge.text}
                              </span>
                            );
                          })()}
                          <span className="px-2.5 py-1 text-[10px] bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-150 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 font-sans font-black rounded-full uppercase tracking-wider">
                            {userClaims.length} TESLİMAT
                          </span>
                        </div>
                      </div>
                    )}

                    {!user ? (
                      <div className="text-center py-8">
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
                          Sahip olduğunuz teslimatların kalıcı olarak saklanması ve dosyalarınızı dilediğiniz an tekrar indirmek için lütfen giriş yapın.
                        </p>
                      </div>
                    ) : userClaims.length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-normal">
                          Henüz bu hesapla doğrulanmış bir e-pin bulunmuyor. <br />
                          Soldaki doğrulama alanından ilk kodunuzu onaylayabilirsiniz.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
                        {userClaims.map((claim) => (
                          <div id={`claim-row-${claim.id}`} key={claim.id} className="bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-2xl border border-zinc-150 dark:border-zinc-800 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-100">{claim.productName}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-[10px] text-zinc-400 font-mono">Kod: {claim.stockCode}</p>
                                  <button
                                    onClick={() => handleCopyCode(claim.stockCode)}
                                    className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition text-zinc-500"
                                    title="Kodu Kopyala"
                                  >
                                    {copiedCode === claim.stockCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              </div>
                              <span className="text-[9px] text-zinc-400 flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3" />
                                {new Date(claim.claimedAt).toLocaleDateString("tr-TR")}
                              </span>
                            </div>

                            {/* Download action links */}
                            <div className="flex flex-wrap gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                              {claim.deliveryContent.apkUrl && (
                                <a
                                  href={claim.deliveryContent.apkUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white font-sans font-bold text-[10px] rounded-lg transition"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  APK İndir
                                </a>
                              )}
                              {claim.deliveryContent.zipUrl && (
                                <a
                                  href={claim.deliveryContent.zipUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-sans font-bold text-[10px] rounded-lg transition"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  ZIP İndir
                                </a>
                              )}
                              {claim.deliveryContent.tutorialVideo && (
                                <a
                                  href={claim.deliveryContent.tutorialVideo}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-sans font-bold text-[10px] rounded-lg transition"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                  Kurulum Videosu
                                </a>
                              )}
                              {claim.deliveryContent.textContent && (
                                <button
                                  onClick={() => alert(`Lisans & Metin Bilgisi:\n\n${claim.deliveryContent.textContent}`)}
                                  className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-600 hover:bg-zinc-700 text-white font-sans font-bold text-[10px] rounded-lg transition cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  Metni Göster
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                    <span>GÜVENLİK STANDARTI</span>
                    <span className="text-indigo-500 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" />
                      SECURE GUARD ACTIVE
                    </span>
                  </div>
                </div>

              </div>

              {/* Product Store Catalog List */}
              <div id="catalog-section" className="space-y-4">
                <div className="flex items-center gap-2 mb-1 px-1">
                  <Laptop className="w-4 h-4 text-indigo-500" />
                  <span className="font-sans font-black text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">MAĞAZA KATALOĞU</span>
                </div>
                <ProductList
                  currentUserId={activeUserId}
                  currentUserEmail={activeUserEmail}
                />
              </div>

              {/* Sıkça Sorulan Sorular */}
              <FaqSection />

              {/* Customer Support Request Form */}
              <SupportForm />

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <AnimatePresence>
        {copiedCode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 bg-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-sm font-bold z-50"
          >
            <Check className="w-4 h-4" />
            Kopyalandı!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Support and Payment footer */}
      <SupportBanner />
    </div>
  );
}
