import React, { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, onSnapshot, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { SupportChatMessage, SupportChatSession } from "../types";
import { MessageSquare, Send, Check, Loader2, ArrowLeft, Clock } from "lucide-react";

export default function AdminChatManager() {
  const [sessions, setSessions] = useState<SupportChatSession[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeSession, setActiveSession] = useState<SupportChatSession | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Listen to all active support chat sessions
  useEffect(() => {
    const sessionsQuery = query(collection(db, "chats"), orderBy("lastActive", "desc"));
    const unsubscribe = onSnapshot(sessionsQuery, (snapshot) => {
      const list: SupportChatSession[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as SupportChatSession);
      });
      setSessions(list);
    });

    return () => unsubscribe();
  }, []);

  // 2. Listen to selected user's chat messages
  useEffect(() => {
    if (!selectedUserId) {
      setMessages([]);
      setActiveSession(null);
      return;
    }

    // Find the current active session
    const currentSess = sessions.find((s) => s.userId === selectedUserId) || null;
    setActiveSession(currentSess);

    const messagesQuery = query(
      collection(db, "chats", selectedUserId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const list: SupportChatMessage[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as SupportChatMessage);
      });
      setMessages(list);
    });

    // Mark unreadByAdmin as false immediately
    if (currentSess?.unreadByAdmin) {
      try {
        updateDoc(doc(db, "chats", selectedUserId), {
          unreadByAdmin: false
        });
      } catch (err) {
        console.error("Error clearing admin unread:", err);
      }
    }

    return () => unsubscribe();
  }, [selectedUserId, sessions]);

  // 3. Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedUserId) return;

    setIsSending(true);
    const text = replyText.trim();
    setReplyText("");

    try {
      const msgRef = doc(collection(db, "chats", selectedUserId, "messages"));
      const msgPayload: SupportChatMessage = {
        id: msgRef.id,
        senderId: "admin",
        senderEmail: "admin@bayiistore.com",
        content: text,
        createdAt: Date.now()
      };

      await setDoc(msgRef, msgPayload);

      // Update session status
      const sessionRef = doc(db, "chats", selectedUserId);
      await updateDoc(sessionRef, {
        lastMessage: text,
        lastActive: Date.now(),
        unreadByAdmin: false,
        unreadByUser: true
      });

    } catch (err) {
      console.error("Error sending admin reply:", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div id="admin-chat-manager" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-3xl overflow-hidden shadow-sm flex flex-col md:flex-row h-[550px]">
      
      {/* Left panel: Sessions list */}
      <div className={`w-full md:w-5/12 border-b md:border-b-0 md:border-r border-zinc-150 dark:border-zinc-800 flex flex-col h-full ${selectedUserId ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-zinc-150 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
          <span className="font-sans font-black text-xs text-zinc-800 dark:text-white uppercase tracking-wider">Canlı Destek Sohbetleri</span>
          <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full">
            {sessions.length} Aktif
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {sessions.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 dark:text-zinc-500 text-xs">
              Henüz aktif bir canlı sohbet bulunmuyor.
            </div>
          ) : (
            sessions.map((s) => {
              const isActive = s.userId === selectedUserId;
              return (
                <div
                  id={`admin-chat-session-${s.userId}`}
                  key={s.userId}
                  onClick={() => setSelectedUserId(s.userId)}
                  className={`p-4 cursor-pointer transition flex items-center justify-between gap-3 ${
                    isActive
                      ? "bg-indigo-50/40 dark:bg-indigo-950/20"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-850/30"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-sans font-extrabold text-xs text-zinc-800 dark:text-white truncate">
                        {s.userName || s.userEmail}
                      </span>
                      {s.unreadByAdmin && (
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate pr-2">
                      {s.lastMessage}
                    </p>
                  </div>
                  <div className="text-[9px] text-zinc-400 whitespace-nowrap flex flex-col items-end gap-1">
                    <span>{new Date(s.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {s.unreadByAdmin && (
                      <span className="bg-red-500 text-white font-bold px-1.5 py-0.5 rounded-full text-[8px]">YENİ</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel: Active chat window */}
      <div className={`w-full md:w-7/12 flex flex-col h-full bg-zinc-50/50 dark:bg-zinc-950/20 ${!selectedUserId ? "hidden md:flex justify-center items-center p-8 text-center" : "flex"}`}>
        {!selectedUserId ? (
          <div className="space-y-3">
            <div className="text-4xl">💬</div>
            <h5 className="font-sans font-black text-xs text-zinc-800 dark:text-white uppercase tracking-wider">Müşteri Canlı Destek Odası</h5>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 max-w-[280px] leading-normal mx-auto">
              Yanıtlamak istediğiniz aktif konuşmayı sol menüden seçerek canlı destek vermeye başlayabilirsiniz.
            </p>
          </div>
        ) : (
          <>
            {/* Active chat header */}
            <div className="p-4 bg-white dark:bg-zinc-900 border-b border-zinc-150 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <button
                  id="admin-back-to-sessions"
                  onClick={() => setSelectedUserId(null)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition md:hidden cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                </button>
                <div>
                  <h4 className="font-sans font-extrabold text-xs text-zinc-800 dark:text-white leading-none mb-1">
                    {activeSession?.userName || activeSession?.userEmail}
                  </h4>
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-500">
                    ID: <span className="font-mono">{selectedUserId}</span>
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                Destek Modu
              </span>
            </div>

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => {
                const isAdmin = m.senderId === "admin";
                return (
                  <div
                    key={m.id}
                    className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                        isAdmin
                          ? "bg-indigo-600 text-white rounded-tr-none"
                          : "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-tl-none"
                      }`}
                    >
                      <p className="break-words font-medium">{m.content}</p>
                      <span
                        className={`text-[9px] block text-right mt-1.5 ${
                          isAdmin ? "text-indigo-200" : "text-zinc-500 dark:text-zinc-400"
                        }`}
                      >
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <form onSubmit={handleSendReply} className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-150 dark:border-zinc-800 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Müşteriye yanıt yazın..."
                className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-600 transition"
              />
              <button
                type="submit"
                disabled={isSending || !replyText.trim()}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition flex items-center justify-center cursor-pointer"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </>
        )}
      </div>

    </div>
  );
}
