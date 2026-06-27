import React, { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, updateDoc } from "firebase/firestore";
import { seedInitialData } from "./utils/seeder";
import Navbar from "./components/Navbar";
import ProductList from "./components/ProductList";
import StockVerifier from "./components/StockVerifier";
import AdminPanel from "./components/AdminPanel";
import SupportForm from "./components/SupportForm";
import SupportBanner from "./components/SupportBanner";
import FaqSection from "./components/FaqSection";
import OrderLibrary from "./components/OrderLibrary";
import SupportChatWidget from "./components/SupportChatWidget";
import { Claim, UserProfile } from "./types";
import { ShieldCheck, KeyRound, ArrowRight, Download, Play, FileText, Sparkles, Clock, LockKeyhole, Laptop, ExternalLink, HelpCircle, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ProfileCompletionOverlay from "./components/ProfileCompletionOverlay";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userClaims, setUserClaims] = useState<Claim[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');

  // Auto-approval logic for orders
  useEffect(() => {
    const checkAutoApproval = async () => {
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
      // Logic: If not confirmed and older than 24h
      const pendingClaims = userClaims.filter(c => !c.isConfirmedByUser && c.claimedAt < twentyFourHoursAgo);

      for (const claim of pendingClaims) {
        try {
          const claimRef = doc(db, "claims", claim.id);
          await updateDoc(claimRef, {
            isConfirmedByUser: true,
            confirmedAt: Date.now(),
            autoConfirmed: true
          });
        } catch (err) {
          console.error("Auto approval failed for claim:", claim.id, err);
        }
      }
    };

    if (userClaims.length > 0) {
      const interval = setInterval(checkAutoApproval, 60000); // Check every minute while app is open
      checkAutoApproval();
      return () => clearInterval(interval);
    }
  }, [userClaims]);

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

  // Calculate Loyalty Tiers on the fly
  const successfulClaims = userClaims.filter(
    (c) => c.status === "approved" || c.stockCode !== "MANUAL_PENDING"
  );
  const totalSpent = successfulClaims.reduce(
    (sum, c) => sum + (c.paidPrice || c.originalPrice || 0), 0
  );

  let loyaltyTier: "Bronz" | "Gümüş" | "Altın" = "Bronz";
  let tierDiscountPercent = 0;
  if (totalSpent >= 1500) {
    loyaltyTier = "Altın";
    tierDiscountPercent = 5;
  } else if (totalSpent >= 500) {
    loyaltyTier = "Gümüş";
    tierDiscountPercent = 2;
  }

  // Check if user has an incomplete profile (must have valid bankFullName, itemsatisUsername, and itemsatisFullName)
  const isProfileIncomplete = !!(
    user &&
    userProfile &&
    userProfile.role !== "admin" &&
    (!userProfile.bankFullName ||
      userProfile.bankFullName === "Banka İsmi Belirtilmedi" ||
      userProfile.bankFullName.trim() === "" ||
      !userProfile.itemsatisUsername ||
      userProfile.itemsatisUsername.trim() === "" ||
      !userProfile.itemsatisFullName ||
      userProfile.itemsatisFullName.trim() === "")
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 flex flex-col transition-colors duration-150 selection:bg-indigo-500/30">
      
      {/* Navigation Bar */}
      <Navbar
        user={user}
        isAdminMode={isAdminMode}
        setIsAdminMode={setIsAdminMode}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        userClaims={userClaims}
      />

      {/* Mandatory Profile Onboarding Modal for Google or Legacy incomplete profiles */}
      {isProfileIncomplete && (
        <ProfileCompletionOverlay
          currentUserId={user!.uid}
          currentUserEmail={user!.email || "anon@bayiistore.com"}
          userProfile={userProfile}
          onComplete={(updatedProfile) => {
            setUserProfile(updatedProfile);
          }}
        />
      )}

      {/* Main Body */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-6">
        <AnimatePresence mode="wait">
          
          {/* MANDATORY AUTH CHECK */}
          {!user && !isAuthLoading ? (
            <motion.div
              key="auth-required"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center"
            >
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-10 rounded-3xl shadow-xl max-w-md w-full">
                <LockKeyhole className="w-16 h-16 text-indigo-500 mx-auto mb-6" />
                <h2 className="text-2xl font-black text-zinc-800 dark:text-white mb-4">Giriş Yapmalısınız</h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mb-6">
                  BayiiStore kataloğuna erişmek ve ürün satın almak için lütfen giriş yapın veya kayıt olun.
                </p>
                <div className="space-y-3">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Lütfen Yukarıdaki "Giriş Yap" Butonunu Kullanın</p>
                </div>
              </div>
            </motion.div>
          ) : isMaintenanceMode && userRole !== 'admin' && !isAdminMode ? (
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

                {/* Unlocked Claims Dashboard List / Order Library */}
                <OrderLibrary
                  user={user}
                  userProfile={userProfile}
                  userClaims={userClaims}
                  copiedCode={copiedCode}
                  handleCopyCode={handleCopyCode}
                />

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
                  loyaltyTier={loyaltyTier}
                  tierDiscountPercent={tierDiscountPercent}
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

      {/* Floating support chat for logged in users */}
      <SupportChatWidget
        currentUserId={activeUserId}
        currentUserEmail={activeUserEmail}
        userProfile={userProfile}
      />
    </div>
  );
}
