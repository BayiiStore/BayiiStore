import React, { useState } from "react";
import { KeyRound, Download, Play, FileText, CheckCircle2, AlertCircle, Copy, Check, ExternalLink } from "lucide-react";
import { collection, query, where, getDocs, doc, writeBatch, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { DeliveryContent, Product } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface StockVerifierProps {
  currentUserId: string;
  currentUserEmail: string;
  onClaimSuccess?: (claimData: any) => void;
  fixedProductId?: string; // If provided, only verify codes for this product
  fixedProduct?: Product;
}

export default function StockVerifier({ currentUserId, currentUserEmail, onClaimSuccess, fixedProductId, fixedProduct }: StockVerifierProps) {
  const [stockCodeInput, setStockCodeInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [unlockedProduct, setUnlockedProduct] = useState<Product | null>(fixedProduct || null);
  const [unlockedContent, setUnlockedContent] = useState<DeliveryContent | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockCodeInput.trim()) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      // 1. Query the stock_codes collection
      const codesRef = collection(db, "stock_codes");
      const q = query(codesRef, where("code", "==", stockCodeInput.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setStatus("error");
        setErrorMsg("Geçersiz stok kodu! Lütfen ItemSatış'tan aldığınız kodu tam ve doğru yapıştırdığınızdan emin olun.");
        return;
      }

      const codeDoc = querySnapshot.docs[0];
      const codeData = codeDoc.data();

      // Check if already used
      if (codeData.used) {
        setStatus("error");
        setErrorMsg("Bu stok kodu daha önce kullanılmış! Her kod tek kullanımlıktır ve sadece bir kez doğrulanabilir.");
        return;
      }

      // Check if product mismatch when fixedProductId is supplied
      if (fixedProductId && codeData.productId !== fixedProductId) {
        setStatus("error");
        setErrorMsg("Bu kod başka bir ürüne aittir! Lütfen doğru ürünün altında doğrulama yapın veya ana sayfadaki genel sorgulamayı kullanın.");
        return;
      }

      // 2. Fetch the corresponding product info
      const productDocRef = doc(db, "products", codeData.productId);
      const productSnap = await getDocs(query(collection(db, "products"), where("id", "==", codeData.productId)));
      
      if (productSnap.empty) {
        setStatus("error");
        setErrorMsg("Bu koda bağlı ürün sistemde bulunamadı. Lütfen yöneticiyle iletişime geçin.");
        return;
      }

      const prodData = productSnap.docs[0].data() as Product;

      // 3. Perform atomic batch update
      const batch = writeBatch(db);
      
      // Update stock code as used
      batch.update(codeDoc.ref, {
        used: true,
        usedBy: currentUserId,
        usedAt: Date.now()
      });

      // Add a claim record
      const claimRef = doc(collection(db, "claims"));
      const claimPayload = {
        id: claimRef.id,
        userId: currentUserId,
        userEmail: currentUserEmail,
        productId: prodData.id,
        productName: prodData.name,
        stockCode: stockCodeInput.trim(),
        claimedAt: Date.now(),
        deliveryContent: prodData.deliveryContent
      };
      batch.set(claimRef, claimPayload);

      // Create a specific success notification
      const notifRef = doc(collection(db, "notifications"));
      batch.set(notifRef, {
        id: notifRef.id,
        userId: currentUserId,
        title: "Ürün Başarıyla Teslim Edildi!",
        message: `'${prodData.name}' adlı ürününüzün stok kodu başarıyla onaylandı. Dosyalarınızı ürün detayından veya hesabım sekmesinden dilediğiniz an indirebilirsiniz.`,
        type: "success",
        createdAt: Date.now(),
        readBy: []
      });

      await batch.commit();

      setUnlockedProduct(prodData);
      setUnlockedContent(prodData.deliveryContent);
      setStatus("success");
      
      if (onClaimSuccess) {
        onClaimSuccess(claimPayload);
      }
    } catch (error: any) {
      console.error("Verification failed:", error);
      setStatus("error");
      setErrorMsg("Doğrulama işlemi sırasında beklenmedik bir sunucu hatası oluştu. Lütfen bağlantınızı kontrol edip tekrar deneyin.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div id="stock-verifier" className="bg-white dark:bg-zinc-800 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-700/80 shadow-md">
      <AnimatePresence mode="wait">
        {status !== "success" ? (
          <motion.div
            id="verifier-input-view"
            key="input-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-base text-zinc-800 dark:text-white">
                  {fixedProduct ? `${fixedProduct.name} Guard Onay Kutusu` : "E-pin & Stok Kodu Doğrulama"}
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  ItemSatış üzerinden satın aldığınız stok kodunu girerek dosyayı anında indirin.
                </p>
              </div>
            </div>

            <form id="verifier-form" onSubmit={handleVerify} className="space-y-4">
              <div className="relative">
                <input
                  id="stock-code-input-field"
                  type="text"
                  required
                  value={stockCodeInput}
                  onChange={(e) => setStockCodeInput(e.target.value)}
                  placeholder="Örn: STOK-KGB-777"
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3.5 text-sm font-mono text-zinc-800 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              {status === "error" && (
                <div id="verifier-error" className="flex items-start gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-xl border border-rose-100 dark:border-rose-900/30 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="leading-normal">{errorMsg}</p>
                </div>
              )}

              <button
                id="verifier-submit-btn"
                type="submit"
                disabled={status === "loading" || !stockCodeInput.trim()}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-sans font-semibold py-3.5 px-4 rounded-2xl transition shadow-lg shadow-indigo-500/15 disabled:opacity-50 text-sm outline-none cursor-pointer flex items-center justify-center gap-2"
              >
                {status === "loading" ? "Kod Doğrulanıyor..." : "Kodu Doğrula ve Teslim Al"}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            id="verifier-success-view"
            key="success-display"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center"
          >
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
            </div>

            <h3 className="font-sans font-extrabold text-lg text-zinc-800 dark:text-white mb-1">
              Doğrulama Başarılı!
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-6">
              {unlockedProduct?.name} kilidi başarıyla açıldı. Dosyalarınız aşağıda güvenle listelenmiştir.
            </p>

            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-4 text-left space-y-4 border border-zinc-100 dark:border-zinc-800">
              
              {/* APK URL */}
              {unlockedContent?.apkUrl && (
                <div id="unlocked-apk" className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-150 dark:border-zinc-700 shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-lg">
                      <Download className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Bypass APK Dosyası</p>
                      <p className="text-[10px] text-zinc-400 truncate">Sürüm v3.2 - Güvenli Sunucu</p>
                    </div>
                  </div>
                  <a
                    id="apk-download-link"
                    href={unlockedContent.apkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-sans font-bold text-xs rounded-lg transition"
                  >
                    İndir
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* ZIP URL */}
              {unlockedContent?.zipUrl && (
                <div id="unlocked-zip" className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-150 dark:border-zinc-700 shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg">
                      <Download className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">VIP Cheat ZIP Arşivi</p>
                      <p className="text-[10px] text-zinc-400 truncate">Hile Paketi + ESP Loader</p>
                    </div>
                  </div>
                  <a
                    id="zip-download-link"
                    href={unlockedContent.zipUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-sans font-bold text-xs rounded-lg transition"
                  >
                    İndir
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Tutorial Video URL */}
              {unlockedContent?.tutorialVideo && (
                <div id="unlocked-video" className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-150 dark:border-zinc-700 shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg">
                      <Play className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Görüntülü Kurulum Rehberi</p>
                      <p className="text-[10px] text-zinc-400 truncate">Adım Adım Video Anlatım</p>
                    </div>
                  </div>
                  <a
                    id="video-tutorial-link"
                    href={unlockedContent.tutorialVideo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-sans font-bold text-xs rounded-lg transition"
                  >
                    İzle
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Text Instructions */}
              {unlockedContent?.textContent && (
                <div id="unlocked-text" className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-150 dark:border-zinc-700 p-3.5 shadow-xs relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      Lisans & Kurulum Bilgileri
                    </span>
                    <button
                      id="copy-unlocked-text"
                      onClick={() => copyToClipboard(unlockedContent.textContent || "")}
                      className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
                      title="Kopyala"
                    >
                      {copiedText ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs font-mono text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900 p-2 rounded-lg leading-relaxed whitespace-pre-line break-words max-h-40 overflow-y-auto">
                    {unlockedContent.textContent}
                  </p>
                </div>
              )}

            </div>

            <button
              id="verify-another-btn"
              onClick={() => {
                setStockCodeInput("");
                setStatus("idle");
              }}
              className="mt-5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
            >
              Başka Bir Kod Doğrula
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
