import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles, Bot, User, ShieldAlert, HelpCircle } from "lucide-react";
import { collection, query, orderBy, onSnapshot, doc, setDoc, updateDoc } from "firebase/firestore";
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
  const [chatMode, setChatMode] = useState<"ai" | "live">("ai");
  
  // 1. Live Support States
  const [liveMessages, setLiveMessages] = useState<SupportChatMessage[]>([]);
  const [liveInput, setLiveInput] = useState("");
  const [session, setSession] = useState<SupportChatSession | null>(null);
  const [isSendingLive, setIsSendingLive] = useState(false);

  // 2. AI Support States
  const [aiMessages, setAiMessages] = useState<any[]>([
    {
      role: "assistant",
      content: "Merhaba! Ben BayiiStore E-pin Guard Yapay Zeka Asistanıyım. Sitemizdeki e-pin, bypass araçları, hileler, ItemSatış kod doğrulamaları veya ödeme yöntemleri hakkında her türlü soruyu sorabilirsin. Sana nasıl yardımcı olabilirim?"
    }
  ]);
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const starterQuestions = [
    "Sistem nasıl çalışır?",
    "Stok kodunu (E-pin) nasıl alırım?",
    "Papara & IBAN ile ödeme nasıl yapılır?",
    "WhatsApp / Instagram destek nerede?"
  ];

  const scrollRef = useRef<HTMLDivElement>(null);

  const isGuest = !currentUserId || currentUserId === "anonymous_client";

  // Real-time listener: User's support session
  useEffect(() => {
    if (isGuest) return;

    const sessionRef = doc(db, "chats", currentUserId);
    const unsubscribe = onSnapshot(sessionRef, (snapshot) => {
      if (snapshot.exists()) {
        setSession(snapshot.data() as SupportChatSession);
      } else {
        setSession(null);
      }
    });

    return () => unsubscribe();
  }, [currentUserId, isGuest]);

  // Real-time listener: Live support chat messages
  useEffect(() => {
    if (isGuest || !isOpen || chatMode !== "live") return;

    const messagesQuery = query(
      collection(db, "chats", currentUserId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const list: SupportChatMessage[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as SupportChatMessage);
      });
      setLiveMessages(list);
    });

    return () => unsubscribe();
  }, [currentUserId, isOpen, chatMode, isGuest]);

  // Clear unread flag on chat open / mode change to live
  useEffect(() => {
    if (isOpen && chatMode === "live" && !isGuest && session?.unreadByUser) {
      try {
        updateDoc(doc(db, "chats", currentUserId), {
          unreadByUser: false
        });
      } catch (err) {
        console.error("Error clearing chat unread status:", err);
      }
    }
  }, [isOpen, chatMode, currentUserId, isGuest, session?.unreadByUser]);

  // Handle scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveMessages, aiMessages, isOpen, chatMode]);

  // Send message to Live Support (Admin)
  const handleSendLiveMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveInput.trim() || isGuest) return;

    setIsSendingLive(true);
    const text = liveInput.trim();
    setLiveInput("");

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
      console.error("Error sending live chat message:", err);
    } finally {
      setIsSendingLive(false);
    }
  };

  // Send message to AI Assistant
  const handleSendAiMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isAiLoading) return;

    const userMessage = { role: "user", content: textToSend };
    setAiMessages((prev) => [...prev, userMessage]);
    setAiInput("");
    setIsAiLoading(true);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: aiMessages.slice(-10) // Limit history context
        })
      });

      const data = await response.json();
      
      if (response.ok && data.reply) {
        setAiMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setAiMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Üzgünüm, şu an bağlantıda bir aksaklık var. Lütfen biraz sonra tekrar deneyin veya direkt Canlı Destek sekmesinden yöneticimize ulaşın!"
          }
        ]);
      }
    } catch (error) {
      console.error("AI Assistant request failed:", error);
      setAiMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Yapay zeka asistanı sunucu hatası aldı. Lütfen daha sonra tekrar deneyiniz."
        }
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div id="support-chat-widget-root" className="fixed bottom-6 right-6 z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="support-chat-window"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="mb-4 w-80 sm:w-96 h-[510px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div id="support-chat-header" className="p-4 bg-indigo-600 dark:bg-indigo-700 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                    💬
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-indigo-600 dark:border-indigo-700 rounded-full animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-sans font-black leading-none">BayiiStore Destek</h4>
                  <p className="text-[10px] text-indigo-200 mt-1">
                    {chatMode === "ai" ? "🤖 AI Asistanı Aktif" : "👤 Canlı Destek Temsilcisi"}
                  </p>
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

            {/* Mode Selector Tabs */}
            <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1 border-b border-zinc-200 dark:border-zinc-850 flex-shrink-0">
              <button
                onClick={() => setChatMode("ai")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
                  chatMode === "ai"
                    ? "bg-white dark:bg-zinc-850 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                Guard AI Asistanı
              </button>
              <button
                onClick={() => setChatMode("live")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-2xl transition-all cursor-pointer relative ${
                  chatMode === "live"
                    ? "bg-white dark:bg-zinc-850 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Canlı Destek (Yönetici)
                {session?.unreadByUser && chatMode !== "live" && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-bounce" />
                )}
              </button>
            </div>

            {/* Chat Body */}
            <div id="support-chat-body" className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50 dark:bg-zinc-950">
              {chatMode === "ai" ? (
                // 1. AI Chat Mode Body
                <>
                  {aiMessages.map((msg, index) => {
                    const isUser = msg.role === "user";
                    return (
                      <div
                        key={index}
                        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                            isUser
                              ? "bg-indigo-600 text-white rounded-tr-none font-medium"
                              : "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-tl-none font-medium"
                          }`}
                        >
                          <p className="whitespace-pre-line break-words">{msg.content}</p>
                        </div>
                      </div>
                    );
                  })}

                  {isAiLoading && (
                    <div className="flex justify-start">
                      <div className="bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 rounded-2xl rounded-bl-none px-3 py-2 text-xs flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                        <span className="font-semibold">AI asistanı yazıyor...</span>
                      </div>
                    </div>
                  )}

                  {aiMessages.length === 1 && (
                    <div className="pt-4 space-y-2">
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-extrabold tracking-wider uppercase mb-1">HIZLI SORULAR</p>
                      <div className="flex flex-col gap-1.5">
                        {starterQuestions.map((q, i) => (
                          <button
                            key={i}
                            onClick={() => handleSendAiMessage(q)}
                            className="w-full text-left text-xs bg-white hover:bg-indigo-50 dark:bg-zinc-900 dark:hover:bg-indigo-950/20 text-zinc-700 dark:text-zinc-300 border border-zinc-150 dark:border-zinc-800 px-3 py-2 rounded-xl transition cursor-pointer"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // 2. Live Support Mode Body
                <>
                  {isGuest ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                      <ShieldAlert className="w-10 h-10 text-amber-500" />
                      <h5 className="font-sans font-black text-xs text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">GİRİŞ GEREKLİ</h5>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-[220px] leading-relaxed">
                        Yöneticilerimizle canlı destek üzerinden gerçek zamanlı sohbet edebilmek için lütfen önce hesabınıza giriş yapın.
                      </p>
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                        Dilerseniz Guard AI asistanımızla anında sohbete devam edebilirsiniz!
                      </p>
                    </div>
                  ) : liveMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                      <div className="text-3xl">👋</div>
                      <h5 className="font-sans font-bold text-xs text-zinc-800 dark:text-zinc-200">
                        Canlı Destek Yetkilisine Bağlandınız
                      </h5>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 max-w-[220px] leading-normal">
                        Bize sormak istediğiniz soruları, teslimat bildirimlerinizi ya da isteklerinizi buraya yazabilirsiniz. Yönetici ekibimiz hemen yanıtlayacaktır.
                      </p>
                    </div>
                  ) : (
                    liveMessages.map((m) => {
                      const isMe = m.senderId === currentUserId;
                      return (
                        <div
                          key={m.id}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                              isMe
                                ? "bg-indigo-600 text-white rounded-tr-none font-medium"
                                : "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-tl-none font-medium"
                            }`}
                          >
                            <p className="break-words">{m.content}</p>
                            <span
                              className={`text-[9px] block text-right mt-1.5 ${
                                isMe ? "text-indigo-200" : "text-zinc-500 dark:text-zinc-400"
                              }`}
                            >
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}
              <div ref={scrollRef} />
            </div>

            {/* Input Form */}
            {chatMode === "ai" ? (
              // AI Input Form
              <form id="ai-chat-form" onSubmit={(e) => { e.preventDefault(); handleSendAiMessage(aiInput); }} className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-150 dark:border-zinc-800 flex gap-2 flex-shrink-0">
                <input
                  id="ai-chat-input"
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Yapay zekaya sorun..."
                  className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-600 transition"
                />
                <button
                  id="ai-chat-send-btn"
                  type="submit"
                  disabled={isAiLoading || !aiInput.trim()}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition flex items-center justify-center cursor-pointer"
                >
                  {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            ) : (
              // Live Support Input Form (only show if not guest)
              !isGuest && (
                <form id="support-chat-form" onSubmit={handleSendLiveMessage} className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-150 dark:border-zinc-800 flex gap-2 flex-shrink-0">
                  <input
                    id="support-chat-input"
                    type="text"
                    value={liveInput}
                    onChange={(e) => setLiveInput(e.target.value)}
                    placeholder="Mesajınızı yazın..."
                    className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-600 transition"
                  />
                  <button
                    id="support-chat-send-btn"
                    type="submit"
                    disabled={isSendingLive || !liveInput.trim()}
                    className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition flex items-center justify-center cursor-pointer"
                  >
                    {isSendingLive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              )
            )}
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
        
        {((session?.unreadByUser && !isOpen) || (chatMode !== "live" && session?.unreadByUser)) && (
          <span
            id="chat-notification-badge"
            className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-500 border-2 border-white dark:border-zinc-950 rounded-full animate-bounce"
          />
        )}
      </button>
    </div>
  );
}
