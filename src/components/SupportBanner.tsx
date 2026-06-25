import React, { useState } from "react";
import { CreditCard, Smartphone, Send, ExternalLink, Check, Copy, MessageCircle } from "lucide-react";

export default function SupportBanner() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const paparaNo = "1553852811";
  const ibanNo = "TR40 0082 9000 0949 1553 8528 11";
  const receiverName = "Canet Karabacak";

  return (
    <div id="support-banner" className="bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 py-12 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Papara Payment */}
        <div id="payment-papara" className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 relative overflow-hidden transition hover:shadow-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full -mr-8 -mt-8"></div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="font-sans font-semibold text-lg text-zinc-800 dark:text-white">Papara ile Ödeme</h3>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Doğrudan Papara hesabımıza ödeme yaptıktan sonra WhatsApp hattımız üzerinden e-pin talep edebilirsiniz.
          </p>
          <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl flex items-center justify-between border border-zinc-100 dark:border-zinc-800">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Papara Numarası</span>
              <p className="font-mono font-medium text-zinc-700 dark:text-zinc-300">{paparaNo}</p>
            </div>
            <button
              id="copy-papara"
              onClick={() => handleCopy(paparaNo, "papara")}
              className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 dark:text-zinc-400 transition"
              title="Kopyala"
            >
              {copiedText === "papara" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-zinc-400 mt-2">Alıcı: {receiverName}</p>
        </div>

        {/* IBAN Payment */}
        <div id="payment-iban" className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 relative overflow-hidden transition hover:shadow-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-8 -mt-8"></div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="font-sans font-semibold text-lg text-zinc-800 dark:text-white">IBAN Havale / EFT</h3>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Tüm bankalardan BayiiStore resmi IBAN hesabına 7/24 FAST ile havale yapabilirsiniz.
          </p>
          <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl flex items-center justify-between border border-zinc-100 dark:border-zinc-800">
            <div className="overflow-hidden">
              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">IBAN</span>
              <p className="font-mono font-medium text-zinc-700 dark:text-zinc-300 text-xs truncate">{ibanNo}</p>
            </div>
            <button
              id="copy-iban"
              onClick={() => handleCopy(ibanNo, "iban")}
              className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 dark:text-zinc-400 transition flex-shrink-0"
              title="Kopyala"
            >
              {copiedText === "iban" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-zinc-400 mt-2">Alıcı: {receiverName}</p>
        </div>

        {/* Support & Contacts */}
        <div id="payment-support" className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 relative overflow-hidden transition hover:shadow-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full -mr-8 -mt-8"></div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400 rounded-xl">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h3 className="font-sans font-semibold text-lg text-zinc-800 dark:text-white">7/24 Destek Hatları</h3>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Ödeme bildirimleriniz, özel istekleriniz ve karşılaştığınız her türlü sorunda anında bizimle iletişime geçin.
          </p>
          
          <div className="space-y-2">
            <a
              id="whatsapp-link"
              href="https://wa.me/905059257542"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 font-medium rounded-xl text-sm transition"
            >
              <span className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                WhatsApp Canlı Destek
              </span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <a
              id="instagram-link"
              href="https://instagram.com/bayiistore"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-2.5 bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/30 dark:hover:bg-pink-900/50 text-pink-700 dark:text-pink-400 font-medium rounded-xl text-sm transition"
            >
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Instagram @bayiistore
              </span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

      </div>
      <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-center">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">
          © {new Date().getFullYear()} BayiiStore E-pin Guard Koruma ve Güvenli Teslimat Platformu. Sadece Türkiye için geçerlidir.
        </p>
      </div>
    </div>
  );
}
