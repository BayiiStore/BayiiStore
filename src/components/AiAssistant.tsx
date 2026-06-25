import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, Loader2, ArrowDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChatMessage } from "../types";

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Merhaba! Ben BayiiStore E-pin Guard Yapay Zeka Asistanıyım. Sitemizdeki e-pin, bypass araçları, hileler, ItemSatış kod doğrulamaları veya ödeme yöntemleri hakkında her türlü soruyu sorabilirsin. Sana nasıl yardımcı olabilirim?"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const starterQuestions = [
    "Sistem nasıl çalışır?",
    "Stok kodunu (E-pin) nasıl alırım?",
    "Papara & IBAN ile ödeme nasıl yapılır?",
    "WhatsApp / Instagram destek nerede?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(-10) // Send last 10 messages for context
        })
      });

      const data = await response.json();
      
      if (response.ok && data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Üzgünüm, şu an bağlantıda bir aksaklık var. Lütfen biraz sonra tekrar deneyin veya direkt WhatsApp destek hattımızdan bize ulaşın!"
          }
        ]);
      }
    } catch (error) {
      console.error("AI Assistant request failed:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Yapay zeka asistanı sunucu hatası aldı. Lütfen daha sonra tekrar deneyiniz."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="ai-assistant-container" className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            id="ai-trigger-btn"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-3.5 rounded-full shadow-2xl hover:from-purple-700 hover:to-indigo-700 transition font-sans font-medium tracking-tight text-sm outline-none cursor-pointer"
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span>AI Destek Asistanı</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="ai-chat-window"
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="bg-white dark:bg-zinc-900 w-[380px] sm:w-[420px] h-[520px] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div id="ai-chat-header" className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/10 rounded-xl">
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <h4 className="font-sans font-bold tracking-tight text-sm">BayiiStore Guard AI</h4>
                  <p className="text-[10px] text-purple-200">Gelişmiş Yapay Zeka Asistanı</p>
                </div>
              </div>
              <button
                id="ai-close-btn"
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Body */}
            <div id="ai-chat-body" className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50 dark:bg-zinc-950">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      msg.role === "user"
                        ? "bg-purple-600 text-white rounded-br-none"
                        : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-bl-none border border-zinc-100 dark:border-zinc-700/50"
                    }`}
                  >
                    <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div id="ai-loading" className="flex justify-start">
                  <div className="bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl rounded-bl-none px-4 py-3 text-zinc-500 flex items-center gap-2 shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    <span className="text-xs font-medium">Yapay zeka düşünüyor...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions (Visible only when not loading) */}
            {!isLoading && messages.length === 1 && (
              <div id="ai-quick-suggestions" className="px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900 flex gap-1.5 flex-wrap">
                {starterQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(q)}
                    className="text-[11px] bg-white hover:bg-purple-50 dark:bg-zinc-800 dark:hover:bg-purple-950/30 text-zinc-600 dark:text-zinc-300 hover:text-purple-600 dark:hover:text-purple-400 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 rounded-full font-medium transition duration-150 cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <form
              id="ai-chat-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2"
            >
              <input
                id="ai-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Bir soru sorun..."
                className="flex-1 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-3 py-2 text-sm text-zinc-800 dark:text-white outline-none focus:ring-1 focus:ring-purple-500 placeholder-zinc-400 dark:placeholder-zinc-500"
              />
              <button
                id="ai-send-btn"
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="p-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 text-white rounded-xl transition duration-150 flex-shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
