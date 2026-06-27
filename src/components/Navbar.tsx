import React, { useState, useEffect } from "react";
import { LogIn, LogOut, ShieldAlert, Moon, Sun, ShieldCheck, Home } from "lucide-react";
import { auth, db } from "../firebase";
import { signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import NotificationDropdown from "./NotificationDropdown";
import AuthModal from "./AuthModal";
import { Claim } from "../types";

interface NavbarProps {
  user: User | null;
  isAdminMode: boolean;
  setIsAdminMode: (mode: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  userClaims: Claim[];
}

export default function Navbar({ user, isAdminMode, setIsAdminMode, isDarkMode, setIsDarkMode, userClaims }: NavbarProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [bankName, setBankName] = useState<string>('');

  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        try {
          const docSnap = await getDoc(doc(db, "users", user.uid));
          if (docSnap.exists() && docSnap.data().bankFullName) {
            setBankName(docSnap.data().bankFullName);
          }
        } catch (err) {
          console.error("Error fetching user data", err);
        }
      };
      fetchUserData();
    } else {
      setBankName('');
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setIsAdminMode(false);
    } catch (error) {
      console.error("Sign-out failed:", error);
    }
  };

  const toggleDarkMode = () => {
    const nextVal = !isDarkMode;
    setIsDarkMode(nextVal);
    if (nextVal) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <>
      <header id="main-header" className="sticky top-0 z-40 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition duration-150">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div id="brand-logo" className="flex items-center gap-3 cursor-pointer" onClick={() => setIsAdminMode(false)}>
            <div className="p-2 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-xl shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-sans font-black text-zinc-800 dark:text-zinc-100 text-base leading-none tracking-tight flex items-center gap-1.5">
                BayiiStore <span className="text-xs bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded-md">GUARD</span>
              </h1>
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">E-pin & Safe Delivery</p>
            </div>
          </div>

          {/* Right side interactions */}
          <div className="flex items-center gap-3">
            
            {/* Dark Mode Toggle */}
            <button
              id="theme-toggle-btn"
              onClick={toggleDarkMode}
              className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-900 rounded-xl text-zinc-600 dark:text-zinc-400 transition outline-none cursor-pointer"
              title={isDarkMode ? "Aydınlık Mod" : "Karanlık Mod"}
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-zinc-500" />}
            </button>

            {/* Real-time Notifications */}
            <NotificationDropdown currentUserId={user ? user.uid : "anonymous_client"} userClaims={userClaims} />

            {/* Panel Toggle Button */}
            <button
              id="admin-panel-toggle"
              onClick={() => setIsAdminMode(!isAdminMode)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition duration-150 cursor-pointer ${
                isAdminMode
                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                  : "bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800"
              }`}
            >
              {isAdminMode ? (
                <>
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Müşteri Paneli</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin Girişi</span>
                </>
              )}
            </button>

            {/* Authentication Sign In/Out */}
            {user ? (
              <div id="user-auth-active" className="flex items-center gap-2">
                <div className="hidden md:block text-left mr-1">
                  <p className="text-xs font-bold text-zinc-800 dark:text-white truncate max-w-[120px]">
                    {bankName || user.email?.split('@')[0]}
                  </p>
                  <p className="text-[9px] text-zinc-500 truncate max-w-[120px]">Onaylı Müşteri</p>
                </div>
                <button
                  id="sign-out-btn"
                  onClick={handleSignOut}
                  className="p-2 bg-zinc-100 hover:bg-rose-50 dark:bg-zinc-900 dark:hover:bg-rose-950/30 text-zinc-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition duration-150 cursor-pointer"
                  title="Çıkış Yap"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>
            ) : (
              <button
                id="sign-in-btn"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md transition cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Giriş Yap</span>
              </button>
            )}

          </div>

        </div>
      </header>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </>
  );
}
