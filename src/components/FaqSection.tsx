import React, { useState } from "react";
import { HelpCircle, ChevronDown, Sparkles, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FaqItem {
  question: string;
  answer: string;
}

export default function FaqSection() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const faqs: FaqItem[] = [
    {
      question: "BayiiStore sistemi tam olarak nasıl çalışıyor?",
      answer: "Sistemimiz otomatik teslimat odaklıdır. Mağazamızdaki ürünlerin altındaki 'ItemSatış Satın Al' butonuna tıklayarak ItemSatış üzerinden güvenli ödemenizi gerçekleştirirsiniz. Satın alma sonrası ItemSatış'ın size otomatik teslim ettiği 'Stok Kodu'nu sitemizdeki 'Hızlı Onay' alanına girerek APK, ZIP, kurulum videosu veya lisans anahtarı gibi premium dosyalarınıza anında erişebilirsiniz."
    },
    {
      question: "ItemSatış üzerinden aldığım teslimat kodunu nasıl doğrularım?",
      answer: "Oldukça basit! Giriş yaptıktan sonra anasayfadaki 'Hızlı Onay' kartında bulunan 'ItemSatış Stok Kodu' alanına size teslim edilen kodu yapıştırın ve 'Kodu Doğrula ve Dosyaları Al' butonuna basın. Sistem anında kodu kontrol eder, kod geçerliyse 'Dosyalarım ve Lisanslarım' bölümünüze ürünü kalıcı olarak ekler."
    },
    {
      question: "Papara veya IBAN ile ödeme nasıl yapılır ve AI doğrulama nasıl çalışır?",
      answer: "Dilerseniz ItemSatış komisyonu ödememek için doğrudan Papara veya IBAN ile ödeme yapabilirsiniz. İlgili ürünün detaylarında Papara/IBAN seçeneğini seçin. Belirtilen hesap numarasına ödemeyi gönderip dekontun ekran görüntüsünü (fotoğrafını) sisteme yükleyin. Gelişmiş Gemini Yapay Zekamız dekontu saniyeler içinde analiz eder. Tutar, isim ve alıcı doğru ise sistem anında ödemenizi onaylar ve ürünü hesabınıza tanımlar!"
    },
    {
      question: "Doğrulama yaptım ama dosyam inmedi veya hata aldım, ne yapmalıyım?",
      answer: "Kodu başarılı bir şekilde doğruladığınızda, 'Dosyalarım ve Lisanslarım' panelinde ilgili ürün belirir. Buradaki 'APK İndir', 'ZIP İndir' veya 'Kurulum Videosu' butonlarına tıklayarak her zaman erişebilirsiniz. Eğer bir indirme engeli veya hata yaşarsanız, tarayıcınızın reklam engelleyicisini (AdBlock) geçici olarak kapatmayı deneyin ya da sayfayı yenileyin."
    },
    {
      question: "Destek ekibinize nasıl ulaşabilirim?",
      answer: "Sitemizin alt kısmındaki (footer) sosyal medya ve destek ikonlarından doğrudan 7/24 WhatsApp veya Instagram hattımıza bağlanabilirsiniz. Ayrıca sayfanın altındaki 'Destek Talebi Oluştur' formunu doldurarak veya sağ alttaki 'AI Destek Asistanı' ile sohbet ederek her an anında yardım alabilirsiniz."
    }
  ];

  const toggleFaq = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div id="faq-section" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-md">
      <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-sans font-black text-base text-zinc-800 dark:text-white">Sıkça Sorulan Sorular</h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Aklınıza takılan soruların yanıtlarını hızlıca bulun.</p>
        </div>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, index) => {
          const isOpen = activeIndex === index;
          return (
            <div
              id={`faq-item-${index}`}
              key={index}
              className={`border rounded-2xl transition-all duration-250 ${
                isOpen
                  ? "bg-indigo-50/20 dark:bg-indigo-950/10 border-indigo-500/30 dark:border-indigo-500/20"
                  : "bg-zinc-50/50 dark:bg-zinc-950/30 border-zinc-150 dark:border-zinc-800 hover:border-zinc-250 dark:hover:border-zinc-700"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleFaq(index)}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 cursor-pointer"
              >
                <span className="font-sans font-bold text-xs sm:text-sm text-zinc-800 dark:text-zinc-200">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-zinc-400 dark:text-zinc-500 transition-transform duration-300 flex-shrink-0 ${
                    isOpen ? "rotate-180 text-indigo-500 dark:text-indigo-400" : ""
                  }`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800/60 pt-3">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
