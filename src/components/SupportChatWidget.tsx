import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { collection, query, orderBy, onSnapshot, doc, setDoc, addDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { SupportChatMessage, SupportChatSession, UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface SupportChatWidgetProps {
  currentUserId: string;
  currentUserEmail: string;
  userProfile: UserProfile | null;
}

export default function SupportChatWidget({
  currentUserId,
  currentUserEmail,
  userProfile
}: SupportChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [session, setSession] = useState<SupportChatSession | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Listen to user's chat session status (for unread count/notification dot)
  useEffect(() => {
    if (!currentUserId || currentUserId === "anonymous_client") return;

    const sessionRef = doc(db, "chats", currentUserId);
    const unsubscribe = onSnapshot(sessionRef, (snapshot) => {
      if (snapshot.exists()) {
        setSession(snapshot.data() as SupportChatSession);
      } else {
        setSession(null);
      }
    });

    return () => unsubscribe();
  }, [currentUserId]);

  // 2. Listen to real-time support chat messages
  useEffect(() => {
    if (!currentUserId || currentUserId === "anonymous_client" || !isOpen) return;

    const messagesQuery = query(
      collection(db, "chats", currentUserId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const list: SupportChatMessage[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as SupportChatMessage);
      });
      setMessages(list);
    });

    return () => unsubscribe();
  }, [currentUserId, isOpen]);

  // 3. Mark unreadByUser as false when chat opens
  useEffect(() => {
    if (isOpen && currentUserId && currentUserId !== "anonymous_client" && session?.unreadByUser) {
      try {
        updateDoc(doc(db, "chats", currentUserId), {
          unreadByUser: false
        });
      } catch (err) {
        console.error("Error clearing chat unread status:", err);
      }
    }
  }, [isOpen, currentUserId, session?.unreadByUser]);

  // 4. Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserId || currentUserId === "anonymous_client") return;

    setIsSending(true);
    const text = newMessage.trim();
    setNewMessage("");

    try {
      const msgRef = doc(collection(db, "chats", currentUserId, "messages"));
      const msgPayload: SupportChatMessage = {
        id: msgRef.id,
        senderId: currentUserId,
        senderEmail: currentUserEmail,
        content: text,
        createdAt: Date.now()
      };

      await setDoc(msgRef, msgPayload);

      // Create or update chat session
      const sessionRef = doc(db, "chats", currentUserId);
      const userName = userProfile?.bankFullName || currentUserEmail;
      
      await setDoc(sessionRef, {
        userId: currentUserId,
        userEmail: currentUserEmail,
        userName: userName,
        lastMessage: text,
        lastActive: Date.now(),
        unreadByAdmin: true,
        unreadByUser: false
      }, { merge: true });

    } catch (err) {
      console.error("Error sending chat message:", err);
    } finally {
      setIsSending(false);
    }
  };

  if (!currentUserId || currentUserId === "anonymous_client") return null;

  return (
    <div id="support-chat-widget-root" className="fixed bottom-6 right-6 z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="support-chat-window"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="mb-4 w-80 sm:w-96 h-[480px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div id="support-chat-header" className="p-4 bg-indigo-600 dark:bg-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                    💬
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-indigo-600 dark:border-indigo-700 rounded-full animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-sans font-black leading-none">Canlı Destek</h4>
                  <p className="text-[10px] text-indigo-200 mt-1">Destek Ekibi Çevrimiçi</p>
                </div>
              </div>
              <button
                id="close-chat-widget"
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/15 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Body */}
            <div id="support-chat-body" className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50 dark:bg-zinc-950">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                  <div className="text-3xl">👋</div>
                  <h5 className="font-sans font-bold text-xs text-zinc-800 dark:text-zinc-200">
                    Merhaba, size nasıl yardımcı olabiliriz?
                  </h5>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 max-w-[220px] leading-normal">
                    Papara ödemeleri, teslimat sorunları veya merak ettiğiniz her şeyi bize sorabilirsiniz.
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.senderId === currentUserId;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                          isMe
                            ? "bg-indigo-600 text-white rounded-tr-none"
                            : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-150 border border-zinc-150 dark:border-zinc-700/50 rounded-tl-none"
                        }`}
                      >
                        <p className="break-words">{m.content}</p>
                        <span
                          className={`text-[9px] block text-right mt-1.5 ${
                            isMe ? "text-indigo-200" : "text-zinc-400 dark:text-zinc-500"
                          }`}
                        >
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form id="support-chat-form" onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-150 dark:border-zinc-800 flex gap-2">
              <input
                id="support-chat-input"
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Mesajınızı yazın..."
                className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-600 transition"
              />
              <button
                id="support-chat-send-btn"
                type="submit"
                disabled={isSending || !newMessage.trim()}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition flex items-center justify-center cursor-pointer"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <button
        id="toggle-support-chat"
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all outline-none cursor-pointer relative"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6 animate-pulse" />}
        
        {session?.unreadByUser && !isOpen && (
          <span
            id="chat-notification-badge"
            className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-500 border-2 border-white dark:border-zinc-950 rounded-full animate-bounce"
          />
        )}
      </button>
    </div>
  );
}
