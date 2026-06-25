import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { MessageSquare, Send, CheckCircle2, Phone, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function SupportForm() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim() || !message.trim()) return;

    setStatus("submitting");

    try {
      await addDoc(collection(db, "support_requests"), {
        name: name.trim(),
        contact: contact.trim(),
        message: message.trim(),
        createdAt: Date.now(),
        status: "bekliyor"
      });

      setStatus("success");
      setName("");
      setContact("");
      setMessage("");
    } catch (error) {
      console.error("Error submitting support request:", error);
      setStatus("error");
    }
  };

  return (
    <div id="support-form-card" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-lg max-w-4xl mx-auto my-6">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* Left Side: Contact Information */}
        <div className="w-full md:w-5/12 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-sans font-black text-lg text-zinc-800 dark:text-white">Destek ve Şikayet Hattı</h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            E-pin teslimatı, ödeme onayları veya bypass hileleriyle ilgili herhangi bir sorun yaşıyorsanız, doğrudan sistem kurucusuna şikayet bildirebilirsiniz.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              <Phone className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-zinc-700 dark:text-zinc-300">Yönetici Telefon Numarası</p>
                <p className="font-mono text-zinc-500 dark:text-zinc-400">0505 925 75 42</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-zinc-700 dark:text-zinc-300">İsim & Papara Alıcısı</p>
                <p className="text-zinc-500 dark:text-zinc-400">Canet Karabacak</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: The Interactive Support Form */}
        <div className="w-full md:w-7/12 border-t md:border-t-0 md:border-l border-zinc-100 dark:border-zinc-800 md:pl-8 pt-6 md:pt-0">
          <AnimatePresence mode="wait">
            {status === "success" ? (
              <motion.div
                id="support-success"
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8"
              >
                <div className="flex justify-center mb-4 text-emerald-500">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h4 className="font-sans font-bold text-zinc-800 dark:text-white text-base mb-1">
                  Destek Talebiniz Alındı!
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-4">
                  Şikayetiniz veya talebiniz Canet Karabacak'a başarıyla iletilmiştir. Gerekli kontroller sağlanarak tarafınıza en kısa sürede dönüş yapılacaktır.
                </p>
                <button
                  onClick={() => setStatus("idle")}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Yeni Talep Gönder
                </button>
              </motion.div>
            ) : (
              <motion.form
                id="support-submit-form"
                key="form"
                onSubmit={handleSubmit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block mb-1">ADINIZ SOYADINIZ</label>
                  <input
                    id="support-name-input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Örn: Canet Karabacak"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block mb-1">İLETİŞİM BİLGİNİZ (TELEFON VEYA E-POSTA)</label>
                  <input
                    id="support-contact-input"
                    type="text"
                    required
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Örn: 0505 925 75 42 veya mail@adresiniz.com"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block mb-1">SORUN / ŞİKAYET DETAYI</label>
                  <textarea
                    id="support-message-textarea"
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Karşılaştığınız sorunu, şikayetinizi veya yardım istediğiniz konuyu detaylıca açıklayınız..."
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-800 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition resize-none"
                  />
                </div>

                {status === "error" && (
                  <p className="text-xs text-rose-500 font-medium">Gönderim sırasında hata oluştu. Lütfen bağlantınızı kontrol edin.</p>
                )}

                <button
                  id="support-submit-btn"
                  type="submit"
                  disabled={status === "submitting"}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-200 text-white font-sans font-bold py-3 px-4 rounded-xl transition text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {status === "submitting" ? (
                    "Gönderiliyor..."
                  ) : (
                    <>
                      Destek Talebini İlet
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
