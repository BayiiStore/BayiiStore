import React, { useState, useEffect } from "react";
import { Bell, Check, Trash2, Info, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { collection, query, onSnapshot, doc, updateDoc, arrayUnion, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { Notification } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface NotificationDropdownProps {
  currentUserId: string;
}

export default function NotificationDropdown({ currentUserId }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Notification[] = [];
      let unreads = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<Notification, "id">;
        const readBy = data.readBy || [];
        const isRead = readBy.includes(currentUserId);
        
        list.push({
          id: doc.id,
          ...data
        });

        if (!isRead && (data.userId === "all" || data.userId === currentUserId)) {
          unreads++;
        }
      });
      
      setNotifications(list);
      setUnreadCount(unreads);
    });

    return () => unsubscribe();
  }, [currentUserId]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const docRef = doc(db, "notifications", id);
      await updateDoc(docRef, {
        readBy: arrayUnion(currentUserId)
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      for (const n of notifications) {
        const isRead = n.readBy?.includes(currentUserId);
        if (!isRead && (n.userId === "all" || n.userId === currentUserId)) {
          await handleMarkAsRead(n.id);
        }
      }
    } catch (error) {
      console.error("Error marking all read:", error);
    }
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "alert":
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);

    if (mins < 1) return "Şimdi";
    if (mins < 60) return `${mins} dk önce`;
    if (hrs < 24) return `${hrs} saat önce`;
    return `${days} gün önce`;
  };

  return (
    <div id="notification-dropdown-container" className="relative">
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition outline-none cursor-pointer"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            id="notification-badge"
            className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-bounce"
          >
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop to close dropdown */}
            <div id="notification-backdrop" className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            
            {/* Dropdown Card */}
            <motion.div
              id="notification-card"
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 z-50 overflow-hidden"
            >
              {/* Header */}
              <div id="notification-card-header" className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
                <span className="font-sans font-bold text-sm text-zinc-800 dark:text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-500" />
                  Bildirimler
                  {unreadCount > 0 && (
                    <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs px-2 py-0.5 rounded-full font-semibold">
                      {unreadCount} Yeni
                    </span>
                  )}
                </span>
                {unreadCount > 0 && (
                  <button
                    id="mark-all-read-btn"
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Hepsini Oku
                  </button>
                )}
              </div>

              {/* List */}
              <div id="notification-list" className="max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-zinc-400 dark:text-zinc-500">Henüz bildirim bulunmuyor.</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isRead = n.readBy?.includes(currentUserId);
                    return (
                      <div
                        id={`notif-${n.id}`}
                        key={n.id}
                        className={`p-4 transition ${isRead ? "bg-transparent" : "bg-indigo-50/20 dark:bg-indigo-950/10"}`}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 mt-0.5">{getIcon(n.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h5 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate pr-2">
                                {n.title}
                              </h5>
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 whitespace-nowrap flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(n.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed break-words">
                              {n.message}
                            </p>
                            {!isRead && (
                              <button
                                id={`mark-read-btn-${n.id}`}
                                onClick={() => handleMarkAsRead(n.id)}
                                className="mt-2 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Okundu İşaretle
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
