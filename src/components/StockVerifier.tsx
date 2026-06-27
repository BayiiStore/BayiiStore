import React, { useState, useEffect } from "react";
import { KeyRound, Download, Play, FileText, CheckCircle2, AlertCircle, Copy, Check, ExternalLink, ShieldCheck } from "lucide-react";
import { collection, query, where, getDocs, doc, writeBatch, addDoc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { DeliveryContent, Product } from "../types";
import { motion, AnimatePresence } from "motion/react";
import html2canvas from "html2canvas";

interface StockVerifierProps {
  currentUserId: string;
  currentUserEmail: string;
  onClaimSuccess?: (claimData: any) => void;
  fixedProductId?: string; // If provided, only verify codes for this product
  fixedProduct?: Product;
}

export default function StockVerifier({ currentUserId, currentUserEmail, onClaimSuccess, fixedProductId, fixedProduct }: StockVerifierProps) {
  const [stockCodeInput, setStockCodeInput] = useState("");
  const [itemsatisUsername, setItemsatisUsername] = useState("");
  const [itemsatisFullName, setItemsatisFullName] = useState("");
  const [userIp, setUserIp] = useState("Yükleniyor...");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [unlockedProduct, setUnlockedProduct] = useState<Product | null>(fixedProduct || null);
  const [unlockedContent, setUnlockedContent] = useState<DeliveryContent | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Helper function to parse real operating system and browser details
  const getDeviceDetails = () => {
    const ua = navigator.userAgent;
    let os = "Bilinmeyen Cihaz";
    let browser = "Bilinmeyen Tarayıcı";

    if (ua.includes("Windows")) os = "Windows PC";
    else if (ua.includes("Macintosh")) os = "macOS";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS (Apple Mobile)";
    else if (ua.includes("Android")) os = "Android Mobile";
    else if (ua.includes("Linux")) os = "Linux PC";

    if (ua.includes("Chrome") && !ua.includes("Edge")) browser = "Google Chrome";
    else if (ua.includes("Firefox")) browser = "Mozilla Firefox";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Apple Safari";
    else if (ua.includes("Edge") || ua.includes("Edg/")) browser = "Microsoft Edge";

    return `${os} / ${browser}`;
  };

  // Auto-populate profile data from users collection
  useEffect(() => {
    if (currentUserId && currentUserId !== "anonymous_client") {
      const fetchProfile = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUserId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data?.itemsatisUsername) {
              setItemsatisUsername(data.itemsatisUsername);
            }
            if (data?.itemsatisFullName) {
              setItemsatisFullName(data.itemsatisFullName);
            }
          }
        } catch (err) {
          console.error("Error fetching profile in StockVerifier:", err);
        }
      };
      fetchProfile();
    }
  }, [currentUserId]);

  // Fetch real IP Address of the client on load
  useEffect(() => {
    const fetchIp = async () => {
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData.ip) {
            setUserIp(ipData.ip);
          }
        }
      } catch (err) {
        console.warn("Could not fetch user IP:", err);
        setUserIp("Algılanamadı");
      }
    };
    fetchIp();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockCodeInput.trim() || !itemsatisUsername.trim() || !itemsatisFullName.trim()) {
      setStatus("error");
      setErrorMsg("Lütfen tüm zorunlu alanları (Kullanıcı Adı, İsim Soyisim ve E-pin Kodu) doldurun.");
      return;
    }

    if (itemsatisFullName.trim().split(" ").length < 2) {
      setStatus("error");
      setErrorMsg("Lütfen İtemSatış hesabınızda kayıtlı olan adınızı ve soyadınızı girin.");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      // 1. Verify if the İtemSatış username profile exists
      try {
        const verifyRes = await fetch(`/api/itemsatis/verify/${encodeURIComponent(itemsatisUsername.trim())}`);
        if (verifyRes.ok) {
          const profileData = await verifyRes.json();
          if (profileData.exists === false) {
            setStatus("error");
            setErrorMsg(`İtemSatış profili doğrulanamadı! ${profileData.reason || "Kullanıcı mevcut değil."}`);
            return;
          }
        }
      } catch (err) {
        console.warn("Could not check İtemSatış username existence via server proxy:", err);
      }

      // Fetch user IP
      let detectedIp = "Bilinmiyor";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          detectedIp = ipData.ip || "Bilinmiyor";
        }
      } catch (ipErr) {
        console.warn("Could not fetch user IP:", ipErr);
      }

      const userAgent = navigator.userAgent;

      // 2. Query the stock_codes collection
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

      // 3. Fetch the corresponding product info
      const productSnap = await getDocs(query(collection(db, "products"), where("id", "==", codeData.productId)));
      
      if (productSnap.empty) {
        setStatus("error");
        setErrorMsg("Bu koda bağlı ürün sistemde bulunamadı. Lütfen yöneticiyle iletişime geçin.");
        return;
      }

      const prodData = productSnap.docs[0].data() as Product;

      // 4. Perform atomic batch update
      const batch = writeBatch(db);
      
      // Update stock code as used
      batch.update(codeDoc.ref, {
        used: true,
        usedBy: currentUserId,
        usedAt: Date.now(),
        itemsatisUsername: itemsatisUsername.trim(),
        itemsatisFullName: itemsatisFullName.trim()
      });

      // Add a claim record with IP, userAgent, firstActivationTime
      const claimRef = doc(collection(db, "claims"));
      const claimPayload = {
        id: claimRef.id,
        userId: currentUserId,
        userEmail: currentUserEmail,
        productId: prodData.id,
        productName: prodData.name,
        stockCode: stockCodeInput.trim(),
        claimedAt: Date.now(),
        deliveryContent: prodData.deliveryContent,
        isConfirmedByUser: false,
        itemsatisUsername: itemsatisUsername.trim(),
        itemsatisFullName: itemsatisFullName.trim(),
        userIp: detectedIp,
        userAgent: userAgent,
        firstActivationTime: Date.now(),
        successScreenshot: "" // will update on client snapshot shortly
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

      // Add a confirmation notification
      const confirmNotifRef = doc(collection(db, "notifications"));
      batch.set(confirmNotifRef, {
        id: confirmNotifRef.id,
        userId: currentUserId,
        title: "Sipariş Onayı Bekleniyor",
        message: `'${prodData.name}' ürününü teslim aldınız. Eğer her şey yolundaysa lütfen siparişi onaylayın. 24 saat içinde onaylanmazsa sistem tarafından otomatik onaylanacaktır.`,
        type: "order_approval",
        createdAt: Date.now(),
        readBy: [],
        claimId: claimRef.id
      });

      await batch.commit();

      // Auto open notifications panel
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("open-notifications"));
      }, 500);

      setUnlockedProduct(prodData);
      setUnlockedContent(prodData.deliveryContent);
      setStatus("success");
      
      if (onClaimSuccess) {
        onClaimSuccess(claimPayload);
      }

      // Capture Success Screen Shot using html2canvas
      setTimeout(async () => {
        const targetElement = document.getElementById("verifier-success-view");
        if (targetElement) {
          try {
            const canvas = await html2canvas(targetElement, {
              useCORS: true,
              scale: 1.5,
              logging: false,
              backgroundColor: "#09090b", // zinc-950 dark background representation
              onclone: (clonedDoc) => {
                // To prevent html2canvas oklch parsing errors, remove external stylesheets containing oklch colors in the cloned document
                // and inject classic HEX and RGB styling rules for the success container.
                try {
                  const styleSheets = Array.from(clonedDoc.styleSheets);
                  styleSheets.forEach((sheet: any) => {
                    try {
                      const rules = Array.from(sheet.cssRules || sheet.rules) as any[];
                      for (let i = rules.length - 1; i >= 0; i--) {
                        const ruleText = (rules[i] as any).cssText || "";
                        if (ruleText.includes("oklch")) {
                          sheet.deleteRule(i);
                        }
                      }
                    } catch (e) {
                      // If cross-origin or un-accessible stylesheet, delete it entirely to be 100% safe
                      if (sheet.ownerNode) {
                        sheet.ownerNode.remove();
                      }
                    }
                  });
                } catch (styleErr) {
                  console.warn("Could not prune oklch rules, clearing all stylesheets as fallback:", styleErr);
                  // Direct clean fallback: remove all link and style nodes and inject classic style
                  clonedDoc.querySelectorAll("style, link[rel='stylesheet']").forEach(node => node.remove());
                }

                // Inject standard clean style sheet that overrides success view elements with standard Hex colors
                const overrideStyle = clonedDoc.createElement("style");
                overrideStyle.textContent = `
                  #verifier-success-view {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
                    background-color: #09090b !important;
                    color: #f4f4f5 !important;
                    padding: 24px !important;
                    border-radius: 24px !important;
                    border: 1px solid #27272a !important;
                    text-align: center !important;
                    box-sizing: border-box !important;
                  }
                  .text-zinc-800 { color: #f4f4f5 !important; }
                  .text-zinc-400 { color: #a1a1aa !important; }
                  .text-zinc-500 { color: #71717a !important; }
                  .bg-zinc-50 { background-color: #18181b !important; }
                  .bg-zinc-900 { background-color: #09090b !important; }
                  .border-zinc-100 { border-color: #27272a !important; }
                  .border-zinc-800 { border-color: #27272a !important; }
                  .bg-emerald-100 { background-color: rgba(16, 185, 129, 0.1) !important; }
                  .text-emerald-600 { color: #34d399 !important; }
                  .text-emerald-400 { color: #34d399 !important; }
                  .bg-emerald-500\\/10 { background-color: rgba(16, 185, 129, 0.1) !important; }
                  .border-emerald-500\\/20 { border-color: rgba(16, 185, 129, 0.2) !important; }
                  .bg-green-50 { background-color: rgba(16, 185, 129, 0.1) !important; }
                  .text-green-600 { color: #34d399 !important; }
                  .bg-green-600 { background-color: #059669 !important; }
                  .bg-blue-50 { background-color: rgba(59, 130, 246, 0.1) !important; }
                  .text-blue-600 { color: #60a5fa !important; }
                  .bg-blue-600 { background-color: #2563eb !important; }
                  .bg-red-50 { background-color: rgba(239, 68, 68, 0.1) !important; }
                  .text-red-600 { color: #f87171 !important; }
                  .bg-red-600 { background-color: #dc2626 !important; }
                  .text-indigo-400 { color: #818cf8 !important; }
                  .text-indigo-500 { color: #6366f1 !important; }
                  .border-indigo-500\\/20 { border-color: rgba(99, 102, 241, 0.2) !important; }
                  .text-indigo-600 { color: #6366f1 !important; }
                  .bg-zinc-100 { background-color: #18181b !important; }
                  .bg-white { background-color: #18181b !important; }
                  .dark\\:bg-zinc-800 { background-color: #18181b !important; }
                  .dark\\:bg-zinc-900 { background-color: #09090b !important; }
                  .dark\\:bg-zinc-950 { background-color: #030303 !important; }
                  .dark\\:border-zinc-700 { border-color: #27272a !important; }
                  .dark\\:border-zinc-800 { border-color: #27272a !important; }
                  .dark\\:text-white { color: #ffffff !important; }
                  .dark\\:text-zinc-200 { color: #e4e4e7 !important; }
                  .dark\\:text-zinc-300 { color: #d4d4d8 !important; }
                  .dark\\:text-zinc-400 { color: #a1a1aa !important; }
                  .dark\\:text-zinc-500 { color: #71717a !important; }
                  .font-black { font-weight: 900 !important; }
                  .font-extrabold { font-weight: 800 !important; }
                  .font-bold { font-weight: 700 !important; }
                  .font-semibold { font-weight: 600 !important; }
                  .uppercase { text-transform: uppercase !important; }
                  .tracking-wider { letter-spacing: 0.05em !important; }
                  .grid-cols-2 { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
                  .gap-3 { gap: 12px !important; }
                  .p-4 { padding: 16px !important; }
                  .p-3 { padding: 12px !important; }
                  .rounded-2xl { border-radius: 16px !important; }
                  .space-y-4 > * + * { margin-top: 16px !important; }
                  .space-y-3\\.5 > * + * { margin-top: 14px !important; }
                  .space-y-0\\.5 > * + * { margin-top: 2px !important; }
                  .flex { display: flex !important; }
                  .items-center { align-items: center !important; }
                  .justify-between { justify-content: space-between !important; }
                  .justify-center { justify-content: center !important; }
                  .gap-1\\.5 { gap: 6px !important; }
                  .gap-2\\.5 { gap: 10px !important; }
                  .mb-4 { margin-bottom: 16px !important; }
                  .mb-1 { margin-bottom: 4px !important; }
                  .mb-6 { margin-bottom: 24px !important; }
                  .mt-4 { margin-top: 16px !important; }
                  .text-xs { font-size: 12px !important; }
                  .text-sm { font-size: 14px !important; }
                  .text-lg { font-size: 18px !important; }
                  .text-\\[10px\\] { font-size: 10px !important; }
                `;
                clonedDoc.head.appendChild(overrideStyle);

                // Clean inline styles that contain oklch
                const allClonedElements = clonedDoc.querySelectorAll("*");
                allClonedElements.forEach((el: any) => {
                  const styleAttr = el.getAttribute("style") || "";
                  if (styleAttr.includes("oklch")) {
                    el.setAttribute("style", styleAttr.replace(/oklch\([^)]+\)/g, "#4f46e5"));
                  }
                });
              }
            });
            const imgData = canvas.toDataURL("image/jpeg", 0.7);
            await updateDoc(doc(db, "claims", claimRef.id), {
              successScreenshot: imgData
            });
            console.log("Success screenshot logged successfully in claim doc:", claimRef.id);
          } catch (shotErr) {
            console.error("html2canvas screenshot capture error:", shotErr);
          }
        }
      }, 1000);

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
                  İtemSatış üzerinden satın aldığınız stok kodunu ve kullanıcı adınızı girerek teslim alın.
                </p>
              </div>
            </div>

            <form id="verifier-form" onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider">
                    İtemSatış Gerçek Kullanıcı Adınız <span className="text-indigo-500">*</span>
                  </label>
                  <input
                    id="itemsatis-username-input-field"
                    type="text"
                    required
                    value={itemsatisUsername}
                    onChange={(e) => setItemsatisUsername(e.target.value)}
                    placeholder="Örn: Kiwoo35"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3.5 text-xs font-sans font-semibold text-zinc-800 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                    Kodun satın alındığı İtemSatış hesabının kullanıcı adını girmek zorunludur.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider">
                    İtemSatış'a Kayıtlı İsim & Soyisminiz <span className="text-indigo-500">*</span>
                  </label>
                  <input
                    id="itemsatis-fullname-input-field"
                    type="text"
                    required
                    value={itemsatisFullName}
                    onChange={(e) => setItemsatisFullName(e.target.value)}
                    placeholder="Örn: Ahmet Yılmaz"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3.5 text-xs font-sans font-semibold text-zinc-800 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                    İtemSatış hesabınızda kayıtlı olan adınız ve soyadınız ile birebir aynı olmalıdır.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider">
                    E-pin & Stok Kodunuz <span className="text-indigo-500">*</span>
                  </label>
                  <input
                    id="stock-code-input-field"
                    type="text"
                    required
                    value={stockCodeInput}
                    onChange={(e) => setStockCodeInput(e.target.value)}
                    placeholder="Örn: STOK-KGB-777"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3.5 text-xs font-mono font-bold text-zinc-800 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>
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
                disabled={status === "loading" || !stockCodeInput.trim() || !itemsatisUsername.trim() || !itemsatisFullName.trim()}
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
              
              {/* Security Seal Indicator for the screenshot context */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Dijital Mühürlü Teslimat Logu Aktifleştirildi</span>
              </div>
              
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

              {/* Real user IP, device and İtemSatış matching details inside the success card */}
              <div className="bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-left space-y-3">
                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  GÜVENLİK, IP VE CİHAZ EŞLEŞMESİ (GERÇEK)
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">İtemSatış Profil Linki</p>
                    <a
                      href={`https://www.itemsatis.com/profil/${itemsatisUsername}.html`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 min-w-0"
                    >
                      <span className="truncate">@{itemsatisUsername}</span>
                      <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                    </a>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">İtemSatış İsim & Soyisim</p>
                    <p className="font-extrabold text-zinc-800 dark:text-zinc-100 truncate">{itemsatisFullName}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Gerçek IP Adresi</p>
                    <p className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{userIp}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Cihaz & Tarayıcı</p>
                    <p className="font-bold text-zinc-800 dark:text-zinc-200 truncate">{getDeviceDetails()}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-[9px] text-zinc-400 dark:text-zinc-500">
                  <span>Doğrulama Zaman Damgası:</span>
                  <span className="font-mono font-bold">{new Date().toLocaleString("tr-TR")}</span>
                </div>
              </div>

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
