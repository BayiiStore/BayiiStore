import React, { useState, useEffect } from "react";
import { Product, Comment, Alert } from "../types";
import { Star, MessageSquare, ShieldAlert, ShoppingBag, Send, AlertCircle, Sparkles, ArrowLeft, Smartphone, CreditCard, Check, Copy, Loader2, CheckCircle2, MessageCircle, Bell, BellRing } from "lucide-react";
import { collection, query, where, getDocs, addDoc, doc, updateDoc, orderBy, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import StockVerifier from "./StockVerifier";
import { motion, AnimatePresence } from "motion/react";

interface ProductCardProps {
  product: Product;
  currentUserId: string;
  currentUserEmail: string;
  loyaltyTier?: "Bronz" | "Gümüş" | "Altın";
  tierDiscountPercent?: number;
  key?: string;
}

export default function ProductCard({ 
  product, 
  currentUserId, 
  currentUserEmail,
  loyaltyTier = "Bronz",
  tierDiscountPercent = 0
}: ProductCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(10); // 1-10 scale
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [commentMethod, setCommentMethod] = useState<"itemsatis" | "bayiistore">("bayiistore");

  // Papara payment states
  const [paparaStep, setPaparaStep] = useState<"none" | "name_input" | "payment_instructions" | "verifying" | "success">("none");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"papara" | "iban">("papara");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Coupon promo states
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");

  // Stock & Price Alert states
  const [activeStockAlert, setActiveStockAlert] = useState<any>(null);
  const [activePriceAlert, setActivePriceAlert] = useState<any>(null);

  useEffect(() => {
    if (!currentUserId || currentUserId === "anonymous_client") return;

    const q = query(
      collection(db, "alerts"),
      where("userId", "==", currentUserId),
      where("productId", "==", product.id),
      where("active", "==", true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let stockAlert = null;
      let priceAlert = null;
      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() } as Alert;
        if (data.type === "stock") {
          stockAlert = data;
        } else if (data.type === "price") {
          priceAlert = data;
        }
      });
      setActiveStockAlert(stockAlert);
      setActivePriceAlert(priceAlert);
    });

    return () => unsubscribe();
  }, [currentUserId, product.id]);

  const handleToggleAlert = async (type: "stock" | "price") => {
    if (!currentUserId || currentUserId === "anonymous_client") {
      alert("Bildirim oluşturmak için lütfen önce giriş yapın.");
      return;
    }

    const currentAlert = type === "stock" ? activeStockAlert : activePriceAlert;

    if (currentAlert) {
      try {
        await updateDoc(doc(db, "alerts", currentAlert.id), {
          active: false
        });
      } catch (err) {
        console.error("Error deactivating alert:", err);
      }
    } else {
      try {
        const alertRef = doc(collection(db, "alerts"));
        await setDoc(alertRef, {
          id: alertRef.id,
          userId: currentUserId,
          productId: product.id,
          type: type,
          targetPrice: product.price,
          createdAt: Date.now(),
          active: true
        });
      } catch (err) {
        console.error("Error creating alert:", err);
      }
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setIsCheckingCoupon(true);
    setCouponError("");
    setCouponSuccess("");
    try {
      const q = query(
        collection(db, "coupons"),
        where("code", "==", couponInput.trim().toUpperCase()),
        where("active", "==", true)
      );
      const querySnap = await getDocs(q);
      if (querySnap.empty) {
        setCouponError("Geçersiz veya süresi dolmuş kupon kodu.");
        setAppliedCoupon(null);
      } else {
        const couponDoc = querySnap.docs[0];
        const couponData = couponDoc.data();
        setAppliedCoupon({ id: couponDoc.id, ...couponData });
        setCouponSuccess(`"${couponData.code}" kuponu başarıyla uygulandı!`);
      }
    } catch (err) {
      console.error("Coupon error:", err);
      setCouponError("Kupon kontrol edilirken hata oluştu.");
    } finally {
      setIsCheckingCoupon(false);
    }
  };

  const getFinalPrice = () => {
    let price = product.price;
    // 1. Coupon Discount
    if (appliedCoupon) {
      if (appliedCoupon.discountType === "percent") {
        const discount = (price * appliedCoupon.discountValue) / 100;
        price = Math.max(0, price - discount);
      } else {
        price = Math.max(0, price - appliedCoupon.discountValue);
      }
    }
    // 2. Loyalty Tier Discount
    if (tierDiscountPercent > 0) {
      const tierDiscount = (price * tierDiscountPercent) / 100;
      price = Math.max(0, price - tierDiscount);
    }
    return price;
  };

  const getWhatsAppMessageUrl = () => {
    const finalPrice = getFinalPrice();
    const text = `Merhaba BayiiStore Yetkilisi,\n\nBen *${customerName || "Bir Müşteri"}*, *${product.name}* ürünü için *${finalPrice.toFixed(2)} TL* tutarında ödememi *${paymentMethod === "papara" ? "Papara" : "IBAN (Banka Transferi)"}* yoluyla gönderdim.\n\nDekont dosyamı ekte iletiyorum, lütfen kontrol edip onaylar mısınız?\n\n*Ödeme Detayları:*\n- Alıcı: Canet Karabacak\n- Gönderen Müşteri: ${customerName || "Belirtilmedi"}\n- Ürün: ${product.name}\n- Ödenen Tutar: ${finalPrice.toFixed(2)} TL\n- Ödeme Yöntemi: ${paymentMethod === "papara" ? "Papara" : "IBAN/FAST"}\n- Tarih: ${new Date().toLocaleDateString("tr-TR")} ${new Date().toLocaleTimeString("tr-TR")}\n\nTeşekkürler!`;
    return `https://wa.me/905059257542?text=${encodeURIComponent(text)}`;
  };

  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptMime, setReceiptMime] = useState<string>("");
  const [receiptFileName, setReceiptFileName] = useState<string>("");
  const [isVerifyingReceipt, setIsVerifyingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const handleReceiptUpload = (file: File) => {
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isTxt = file.type === "text/plain" || file.name.endsWith(".txt");

    if (!isImage && !isPdf && !isTxt) {
      setReceiptError("Lütfen geçerli bir görsel (.png, .jpg, .jpeg), PDF (.pdf) veya metin (.txt) dosyası yükleyin.");
      return;
    }
    
    setReceiptError("");
    setReceiptFileName(file.name);
    
    const mime = file.type || (isPdf ? "application/pdf" : isTxt ? "text/plain" : "");
    setReceiptMime(mime);
    
    const reader = new FileReader();
    if (isTxt) {
      reader.onload = (e) => {
        if (e.target?.result) {
          const textContent = e.target.result as string;
          // Base64 encode the plain text safely
          const base64Str = btoa(unescape(encodeURIComponent(textContent)));
          setReceiptImage(base64Str);
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (e) => {
        if (e.target?.result) {
          const base64Str = (e.target.result as string).split(",")[1];
          setReceiptImage(base64Str);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVerifyReceiptWithAi = async () => {
    if (!receiptImage) {
      setReceiptError("Lütfen önce bir dekont görseli yükleyin.");
      return;
    }

    setIsVerifyingReceipt(true);
    setReceiptError("");
    setPaparaStep("verifying");

    try {
      const finalPrice = getFinalPrice();
      const response = await fetch("/api/gemini/verify-dekont", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: receiptImage,
          mimeType: receiptMime,
          expectedPrice: finalPrice,
          customerName: customerName
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        const claimRef = doc(collection(db, "claims"));
        const claimPayload = {
          id: claimRef.id,
          userId: currentUserId,
          userEmail: currentUserEmail || "anon@bayiistore.com",
          productId: product.id,
          productName: product.name,
          customerName: customerName,
          receiptImage: receiptImage,
          status: 'approved',
          stockCode: "PAPARA-" + customerName.toUpperCase().replace(/\s+/g, "_") + "-" + Math.floor(1000 + Math.random() * 9000),
          claimedAt: Date.now(),
          deliveryContent: product.deliveryContent,
          originalPrice: product.price,
          paidPrice: finalPrice,
          couponCode: appliedCoupon ? appliedCoupon.code : null,
          isConfirmedByUser: false
        };

        await setDoc(claimRef, claimPayload);

        const successNotifRef = doc(collection(db, "notifications"));
        await setDoc(successNotifRef, {
          id: successNotifRef.id,
          userId: currentUserId,
          title: "Ödemeniz AI Tarafından Onaylandı!",
          message: `'${product.name}' adlı ürün için yüklediğiniz ödeme dekontu yapay zekamız (Gemini) tarafından başarıyla doğrulandı. Dosyalarınızı indirebilirsiniz.`,
          type: "success",
          createdAt: Date.now(),
          readBy: []
        });

        // Add a confirmation notification
        const confirmNotifRef = doc(collection(db, "notifications"));
        await setDoc(confirmNotifRef, {
          id: confirmNotifRef.id,
          userId: currentUserId,
          title: "Sipariş Onayı Bekleniyor",
          message: `'${product.name}' ürününü teslim aldınız. Eğer her şey yolundaysa lütfen siparişi onaylayın. 24 saat içinde onaylanmazsa sistem tarafından otomatik onaylanacaktır.`,
          type: "order_approval",
          createdAt: Date.now(),
          readBy: [],
          claimId: claimRef.id
        });

        // Auto open notifications panel
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("open-notifications"));
        }, 500);

        setPaparaStep("success");
      } else {
        setReceiptError(data.reason || "Yapay zeka ödemeyi doğrulayamadı. Lütfen alıcı adı, tutar ve gönderenin doğru göründüğünden emin olun.");
        setPaparaStep("payment_instructions");
      }
    } catch (err: any) {
      console.error(err);
      setReceiptError("Dekont doğrulanırken bağlantı hatası oluştu. Lütfen tekrar deneyin.");
      setPaparaStep("payment_instructions");
    } finally {
      setIsVerifyingReceipt(false);
    }
  };

  const handleCompletePaparaPayment = async () => {
    setPaparaStep("verifying");
    
    // Simulate payment verification delay of 3 seconds
    setTimeout(async () => {
      try {
        const finalPrice = getFinalPrice();
        const claimRef = doc(collection(db, "claims"));
        const claimPayload = {
          id: claimRef.id,
          userId: currentUserId,
          userEmail: currentUserEmail || "anon@bayiistore.com",
          productId: product.id,
          productName: product.name,
          customerName: customerName,
          receiptImage: receiptImage || null,
          status: 'pending',
          stockCode: "MANUAL_PENDING",
          claimedAt: Date.now(),
          deliveryContent: product.deliveryContent,
          originalPrice: product.price,
          paidPrice: finalPrice,
          couponCode: appliedCoupon ? appliedCoupon.code : null,
          isConfirmedByUser: false
        };
        
        await setDoc(claimRef, claimPayload);
        
        const infoNotifRef = doc(collection(db, "notifications"));
        await setDoc(infoNotifRef, {
          id: infoNotifRef.id,
          userId: currentUserId,
          title: "Ödemeniz İncelemeye Alındı",
          message: `'${product.name}' adlı ürün için yaptığınız ödeme yöneticiler tarafından inceleniyor. Onaylandığında bildirim alacaksınız.`,
          type: "info",
          createdAt: Date.now(),
          readBy: []
        });

        // Add a confirmation notification (for manual)
        const confirmNotifRef = doc(collection(db, "notifications"));
        await setDoc(confirmNotifRef, {
          id: confirmNotifRef.id,
          userId: currentUserId,
          title: "Sipariş Onayı Bekleniyor",
          message: `'${product.name}' ürününü teslim aldınız. Eğer her şey yolundaysa lütfen siparişi onaylayın. 24 saat içinde onaylanmazsa sistem tarafından otomatik onaylanacaktır.`,
          type: "order_approval",
          createdAt: Date.now(),
          readBy: [],
          claimId: claimRef.id
        });

        // Auto open notifications panel
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("open-notifications"));
        }, 500);

        // We show a slightly different success screen
        setPaparaStep("success");
      } catch (err) {
        console.error("Papara claim error:", err);
        setPaparaStep("payment_instructions");
        alert("Ödeme kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.");
      }
    }, 3000);
  };

  // Fetch comments for this product
  useEffect(() => {
    if (!isDetailOpen) return;

    const q = query(
      collection(db, "comments"),
      where("productId", "==", product.id),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Comment[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Comment);
      });
      setComments(list);
    });

    return () => unsubscribe();
  }, [product.id, isDetailOpen]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    setCommentError("");

    try {
      const commentPayload = {
        productId: product.id,
        userId: currentUserId,
        userEmail: currentUserEmail || "Anonim Kullanıcı",
        rating: newRating,
        comment: newComment.trim(),
        createdAt: Date.now()
      };

      // 1. Add to comments
      await addDoc(collection(db, "comments"), commentPayload);

      // 2. Re-calculate average rating in Firestore (highly robust!)
      const commentsRef = collection(db, "comments");
      const q = query(commentsRef, where("productId", "==", product.id));
      const querySnap = await getDocs(q);
      
      let sum = 0;
      querySnap.forEach((doc) => {
        sum += doc.data().rating;
      });
      const newAverage = parseFloat((sum / querySnap.size).toFixed(1));

      // 3. Update product rating & ratingCount
      const prodDocRef = doc(db, "products", product.id);
      await updateDoc(prodDocRef, {
        rating: newAverage,
        ratingCount: querySnap.size
      });

      setNewComment("");
      setNewRating(10);
    } catch (error: any) {
      console.error("Error adding comment:", error);
      setCommentError("Yorum gönderilirken bir hata oluştu. Lütfen oturum açtığınızdan emin olun.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <>
      {/* Product Card Component */}
      <motion.div
        id={`product-card-${product.id}`}
        layoutId={`product-card-layout-${product.id}`}
        onClick={() => setIsDetailOpen(true)}
        whileHover={{ y: -5 }}
        className="bg-white dark:bg-zinc-800 rounded-3xl border border-zinc-200 dark:border-zinc-700/80 shadow-sm overflow-hidden flex flex-col cursor-pointer transition hover:shadow-lg h-full group"
      >
        <div className="relative aspect-[4/3] bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
          <img
            src={product.imageUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=600"}
            alt={product.name}
            className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-3 left-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-sans font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider border border-zinc-100 dark:border-zinc-800 shadow-sm">
            {product.category}
          </div>
          {product.stockStatus === "yok" && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
              <span className="bg-red-500 text-white font-sans font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md">
                <ShieldAlert className="w-4 h-4" />
                STOKTA YOK
              </span>
            </div>
          )}
        </div>

        <div className="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
                {product.rating || "9.5"}
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                ({product.ratingCount || "0"} Değerlendirme)
              </span>
            </div>

            <h4 className="font-sans font-bold text-zinc-800 dark:text-white text-base leading-snug tracking-tight mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
              {product.name}
            </h4>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-4">
              {product.description}
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-700/50">
            <div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">FİYAT</span>
              {tierDiscountPercent > 0 ? (
                <div className="flex flex-col">
                  <span className="text-[10px] line-through text-zinc-400 dark:text-zinc-500 leading-none mb-0.5">
                    {product.price.toFixed(2)} TL
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-lg leading-none">
                      {(product.price * (1 - tierDiscountPercent / 100)).toFixed(2)} TL
                    </span>
                    <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold text-[8px] rounded-md border border-indigo-150 dark:border-indigo-900 leading-none" title={`${loyaltyTier} Üye İndirimi`}>
                      -%{tierDiscountPercent}
                    </span>
                  </div>
                </div>
              ) : (
                <span className="font-mono font-extrabold text-zinc-800 dark:text-white text-lg">
                  {product.price.toFixed(2)} TL
                </span>
              )}
            </div>
            <button
              id={`details-btn-${product.id}`}
              className="px-4 py-2 bg-zinc-50 hover:bg-indigo-50 dark:bg-zinc-900 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-sans font-bold text-xs rounded-xl border border-zinc-150 dark:border-zinc-800 transition"
            >
              Detayları Gör
            </button>
          </div>
        </div>
      </motion.div>

      {/* Expanded Detail Modal overlay */}
      <AnimatePresence>
        {isDetailOpen && (
          <div id={`product-detail-modal-${product.id}`} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailOpen(false)}
              className="fixed inset-0 bg-zinc-950/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-w-4xl w-full max-h-[85vh] overflow-y-auto z-10 flex flex-col md:flex-row relative"
            >
              {/* Floating Close Button */}
              <button
                id={`close-detail-btn-${product.id}`}
                onClick={() => setIsDetailOpen(false)}
                className="absolute top-4 right-4 z-20 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>

              {/* Left Column: Image, Info & Purchase */}
              <div className="w-full md:w-5/12 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20">
                <div>
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden mb-4 bg-zinc-100 dark:bg-zinc-900 shadow-inner">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <span className="inline-block bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-sans font-bold px-2.5 py-1 rounded-full uppercase tracking-wider mb-2">
                    {product.category}
                  </span>

                  <h3 className="font-sans font-black text-zinc-800 dark:text-white text-xl leading-tight mb-2">
                    {product.name}
                  </h3>

                  <div className="flex items-center gap-1.5 mb-4">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-100">
                      {product.rating || "9.5"}
                    </span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      ({product.ratingCount || "0"} Müşteri Yorumu)
                    </span>
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6 whitespace-pre-line">
                    {product.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold block">SATIŞ FİYATI</span>
                      {tierDiscountPercent > 0 ? (
                        <div className="flex flex-col">
                          <span className="text-xs line-through text-zinc-400 dark:text-zinc-500 leading-none mb-0.5">
                            {product.price.toFixed(2)} TL
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-2xl text-indigo-600 dark:text-indigo-400 leading-none">
                              {(product.price * (1 - tierDiscountPercent / 100)).toFixed(2)} TL
                            </span>
                            <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold text-[9px] rounded-md border border-indigo-150 dark:border-indigo-900 leading-none" title={`${loyaltyTier} Üye İndirimi`}>
                              -%{tierDiscountPercent}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="font-mono font-extrabold text-2xl text-zinc-800 dark:text-white">
                          {product.price.toFixed(2)} TL
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold block text-right">STOK DURUMU</span>
                      <span className={`text-xs font-bold ${product.stockStatus === "var" ? "text-emerald-500" : "text-rose-500"}`}>
                        {product.stockStatus === "var" ? "STOKTA VAR" : "TÜKENDİ"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {product.itemSatisUrl && (
                      <a
                        id={`buy-itemsatis-btn-${product.id}`}
                        href={product.itemSatisUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-sans font-extrabold py-3 px-4 rounded-2xl transition shadow-lg shadow-orange-500/10 text-xs outline-none cursor-pointer flex items-center justify-center gap-2"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        ItemSatış'tan Güvenle Satın Al
                      </a>
                    )}

                    {product.stockStatus === "var" ? (
                      <>
                        <button
                          id={`pay-papara-btn-${product.id}`}
                          onClick={() => setPaparaStep("name_input")}
                          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-sans font-extrabold py-3 px-4 rounded-2xl transition shadow-lg shadow-indigo-500/10 text-xs outline-none cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-4 h-4 text-yellow-300" />
                          Papara & IBAN ile Anında Öde
                        </button>

                        <button
                          id={`toggle-price-alert-${product.id}`}
                          onClick={() => handleToggleAlert("price")}
                          className={`w-full font-sans font-bold py-2.5 px-4 rounded-2xl transition border text-[11px] outline-none cursor-pointer flex items-center justify-center gap-1.5 ${
                            activePriceAlert
                              ? "bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900"
                              : "bg-zinc-50 hover:bg-zinc-100 text-zinc-600 dark:bg-zinc-900/40 dark:hover:bg-zinc-800/40 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800"
                          }`}
                        >
                          <Bell className={`w-3.5 h-3.5 ${activePriceAlert ? "animate-pulse" : ""}`} />
                          {activePriceAlert ? "İndirim Alarmı Aktif (Kapat)" : "Fiyatı Düşünce Haber Ver"}
                        </button>
                      </>
                    ) : (
                      <button
                        id={`toggle-stock-alert-${product.id}`}
                        onClick={() => handleToggleAlert("stock")}
                        className={`w-full font-sans font-bold py-3 px-4 rounded-2xl transition border text-xs outline-none cursor-pointer flex items-center justify-center gap-2 ${
                          activeStockAlert
                            ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900"
                            : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800"
                        }`}
                      >
                        <BellRing className={`w-4 h-4 ${activeStockAlert ? "animate-bounce" : ""}`} />
                        {activeStockAlert ? "Stok Alarmı Aktif (Kapat)" : "Stok Gelince Haber Ver"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Verification & Comments OR Papara Payment wizard */}
              <div className="w-full md:w-7/12 p-6 flex flex-col justify-between">
                {paparaStep !== "none" ? (
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-3xl border border-zinc-150 dark:border-zinc-800 h-full flex flex-col justify-between space-y-6">
                    {paparaStep === "name_input" && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <button
                            id="back-from-name"
                            type="button"
                            onClick={() => setPaparaStep("none")}
                            className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition cursor-pointer"
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                          <h4 className="font-sans font-black text-zinc-800 dark:text-white text-base">Papara ile Ödeme</h4>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Teslimat kayıtlarınızın faturası ve onay eşleşmesi için lütfen adınızı ve soyadınızı giriniz.
                        </p>
                        
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (customerName.trim().length >= 4) {
                              setPaparaStep("payment_instructions");
                            } else {
                              alert("Lütfen geçerli bir isim soyisim giriniz.");
                            }
                          }}
                          className="space-y-4"
                        >
                          <div>
                            <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block mb-1">ADINIZ SOYADINIZ</label>
                            <input
                              id="customer-name-input"
                              type="text"
                              required
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              placeholder="Örn: Canet Karabacak"
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-zinc-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                            />
                          </div>

                          <button
                            id="submit-name-btn"
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold py-3 px-4 rounded-xl transition text-xs cursor-pointer shadow-sm"
                          >
                            Ödeme Bilgilerini Göster
                          </button>
                        </form>
                      </div>
                    )}

                    {paparaStep === "payment_instructions" && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <button
                            id="back-from-payment"
                            type="button"
                            onClick={() => setPaparaStep("name_input")}
                            className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition cursor-pointer"
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                          <h4 className="font-sans font-black text-zinc-800 dark:text-white text-base">Transfer Detayları</h4>
                        </div>

                        {/* Payment Method Switcher */}
                        <div className="grid grid-cols-2 gap-2 bg-zinc-150 dark:bg-zinc-900 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod("papara")}
                            className={`py-2 px-3 rounded-lg text-[10px] font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer ${
                              paymentMethod === "papara"
                                ? "bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-sm"
                                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700"
                            }`}
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            Papara
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod("iban")}
                            className={`py-2 px-3 rounded-lg text-[10px] font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer ${
                              paymentMethod === "iban"
                                ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm"
                                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700"
                            }`}
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            IBAN / Havale
                          </button>
                        </div>

                        <div className="space-y-3">
                          {paymentMethod === "papara" ? (
                            <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-zinc-150 dark:border-zinc-800 relative">
                              <span className="text-[9px] text-purple-500 font-bold tracking-widest uppercase block mb-1">ALICI PAPARA HESABI</span>
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300 text-sm">1553852811</span>
                                <button
                                  id="copy-papara-checkout"
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText("1553852811");
                                    setCopiedField("papara");
                                    setTimeout(() => setCopiedField(null), 2000);
                                  }}
                                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
                                >
                                  {copiedField === "papara" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                              <p className="text-[10px] text-zinc-400 mt-1">Alıcı: Canet Karabacak</p>
                            </div>
                          ) : (
                            <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-zinc-150 dark:border-zinc-800 relative">
                              <span className="text-[9px] text-blue-500 font-bold tracking-widest uppercase block mb-1">ALICI IBAN</span>
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300 text-xs truncate">TR40 0082 9000 0949 1553 8528 11</span>
                                <button
                                  id="copy-iban-checkout"
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText("TR40 0082 9000 0949 1553 8528 11");
                                    setCopiedField("iban");
                                    setTimeout(() => setCopiedField(null), 2000);
                                  }}
                                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer flex-shrink-0"
                                >
                                  {copiedField === "iban" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                              <p className="text-[10px] text-zinc-400 mt-1">Alıcı: Canet Karabacak (FAST Destekli)</p>
                            </div>
                          )}

                          {/* Coupon Code Section */}
                          <div className="bg-zinc-100/50 dark:bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-150 dark:border-zinc-800/85 space-y-2.5">
                            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-extrabold tracking-widest uppercase block">
                              PROMOSYON / KUPON KODU
                            </span>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={couponInput}
                                onChange={(e) => setCouponInput(e.target.value)}
                                placeholder="ÖRN: INDIRIM20"
                                className="flex-grow bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-800 dark:text-white placeholder-zinc-400 outline-none focus:ring-1 focus:ring-indigo-500 font-mono uppercase"
                                disabled={!!appliedCoupon}
                              />
                              {appliedCoupon ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAppliedCoupon(null);
                                    setCouponInput("");
                                    setCouponSuccess("");
                                    setCouponError("");
                                  }}
                                  className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl text-xs font-bold transition cursor-pointer"
                                >
                                  Kaldır
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleApplyCoupon}
                                  disabled={isCheckingCoupon || !couponInput.trim()}
                                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 text-white font-sans font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
                                >
                                  {isCheckingCoupon ? <Loader2 className="w-3 h-3 animate-spin" /> : "Uygula"}
                                </button>
                              )}
                            </div>
                            {couponError && (
                              <p className="text-[10px] text-rose-500 font-medium font-sans">
                                ⚠️ {couponError}
                              </p>
                            )}
                            {couponSuccess && (
                              <p className="text-[10px] text-emerald-500 font-bold font-sans">
                                ✓ {couponSuccess}
                              </p>
                            )}
                          </div>

                          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-900/30 p-3.5 rounded-2xl">
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-normal font-medium">
                              {appliedCoupon ? (
                                <>
                                  Lütfen seçtiğiniz hesaba kuponlu indirimli fiyat olan <strong className="font-mono font-black text-emerald-500 dark:text-emerald-400">{getFinalPrice().toFixed(2)} TL</strong> <span className="line-through text-zinc-400 dark:text-zinc-500 font-normal">({product.price.toFixed(2)} TL)</span> transfer edin. Ardından dekontu yükleyin.
                                </>
                              ) : (
                                <>
                                  Lütfen seçtiğiniz hesaba tam olarak <strong className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{product.price.toFixed(2)} TL</strong> transfer edin. Ardından aşağıdaki **Yapay Zeka ile Doğrula** kısmından dekontu yükleyebilir veya manuel onaya gönderebilirsiniz.
                                </>
                              )}
                            </p>
                          </div>

                          {/* Drag and Drop Dekont Yükleme Alanı */}
                          <div className="space-y-2 border-t border-zinc-150 dark:border-zinc-800/80 pt-3">
                            <span className="text-[9px] text-indigo-500 font-extrabold tracking-widest uppercase block mb-1">
                              ⚡ ANINDA AI DOĞRULAMA (YAPAY ZEKA AKTİF)
                            </span>
                            
                            <div 
                              onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                              onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                              onDrop={(e) => {
                                e.preventDefault();
                                setDragActive(false);
                                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                  handleReceiptUpload(e.dataTransfer.files[0]);
                                }
                              }}
                              onClick={() => document.getElementById("receipt-file-input")?.click()}
                              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                                dragActive 
                                  ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20" 
                                  : receiptImage 
                                    ? "border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10" 
                                    : "border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 bg-white dark:bg-zinc-900"
                              }`}
                            >
                              <input 
                                id="receipt-file-input"
                                type="file"
                                accept="image/*,application/pdf,text/plain"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleReceiptUpload(e.target.files[0]);
                                  }
                                }}
                              />
                              
                              {receiptImage ? (
                                <div className="space-y-2">
                                  <div className="flex justify-center">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full">
                                      <Check className="w-5 h-5" />
                                    </div>
                                  </div>
                                  <p className="text-xs font-bold text-zinc-800 dark:text-white truncate max-w-xs mx-auto">
                                    {receiptFileName || "dekont.png"}
                                  </p>
                                  <p className="text-[10px] text-zinc-400">
                                    Belge/Dekont başarıyla seçildi. Değiştirmek için tekrar tıklayın veya sürükleyin.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex justify-center">
                                    <div className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-full">
                                      <Smartphone className="w-5 h-5 animate-pulse" />
                                    </div>
                                  </div>
                                  <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                    Dekont / Belge Yükle
                                  </p>
                                  <p className="text-[10px] text-zinc-400 leading-normal max-w-[240px] mx-auto">
                                    Resim, PDF veya Metin dosyasını buraya sürükleyin ya da seçin (.png, .jpg, .jpeg, .pdf, .txt)
                                  </p>
                                </div>
                              )}
                            </div>

                            {receiptError && (
                              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/40 rounded-xl">
                                <p className="text-[10px] text-rose-500 leading-normal font-medium">
                                  ⚠️ {receiptError}
                                </p>
                              </div>
                            )}

                            {receiptImage && (
                              <button
                                id="ai-verify-btn"
                                type="button"
                                onClick={handleVerifyReceiptWithAi}
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-sans font-bold py-3 px-4 rounded-xl transition text-xs cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                                Dekontu Yapay Zeka ile Doğrula (Hızlı Onay)
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-zinc-150 dark:border-zinc-800/80">
                          <button
                            id="confirm-payment-btn"
                            type="button"
                            onClick={handleCompletePaparaPayment}
                            className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-sans font-bold py-3 px-4 rounded-2xl transition text-xs cursor-pointer shadow-md flex items-center justify-center gap-2"
                          >
                            Manuel Kontrole Gönder (Sıra Bekletir)
                          </button>

                          <a
                            href={getWhatsAppMessageUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-sans font-bold py-3 px-4 rounded-2xl transition text-xs cursor-pointer shadow-md flex items-center justify-center gap-2"
                            title="Tüm bilgileri otomatik olarak WhatsApp üzerinden ilet"
                          >
                            <MessageCircle className="w-4 h-4 text-white" />
                            WhatsApp ile Bildir & Hızlı Onay Al
                          </a>

                          <button
                            id="cancel-payment-btn"
                            type="button"
                            onClick={() => setPaparaStep("none")}
                            className="w-full text-center text-[10px] font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition cursor-pointer pt-1"
                          >
                            Ödemeyi İptal Et
                          </button>
                        </div>
                      </div>
                    )}

                    {paparaStep === "verifying" && (
                      <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                        <h4 className="font-sans font-extrabold text-zinc-800 dark:text-white text-base">Ödemeniz Kontrol Ediliyor...</h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs leading-normal">
                          Gönderim bilgileri ve tutar Canet Karabacak tarafından doğrulanıyor. Lütfen sayfayı kapatmayın...
                        </p>
                      </div>
                    )}

                    {paparaStep === "success" && (
                      <div className="space-y-4 text-center">
                        <div className="flex justify-center">
                          <div className="p-3 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full">
                            <CheckCircle2 className="w-10 h-10" />
                          </div>
                        </div>
                        <h4 className="font-sans font-black text-zinc-800 dark:text-white text-base">Ödeme Başarıyla Doğrulandı!</h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal max-w-sm mx-auto">
                          Harika! Ödemeniz alındı ve sistem onayladı. Satın aldığınız '{product.name}' ürünü hesabınıza tanımlandı ve teslimat dosyaları açıldı:
                        </p>

                        <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-4 rounded-2xl text-left space-y-3 shadow-sm">
                          {product.deliveryContent.apkUrl && (
                            <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Bypass APK Dosyası</span>
                              <a
                                href={product.deliveryContent.apkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-sans font-bold text-[10px] rounded-lg transition"
                              >
                                İndir
                              </a>
                            </div>
                          )}
                          {product.deliveryContent.zipUrl && (
                            <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Cheat Loader ZIP</span>
                              <a
                                href={product.deliveryContent.zipUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-sans font-bold text-[10px] rounded-lg transition"
                              >
                                İndir
                              </a>
                            </div>
                          )}
                          {product.deliveryContent.tutorialVideo && (
                            <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Video Kurulum Rehberi</span>
                              <a
                                href={product.deliveryContent.tutorialVideo}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-sans font-bold text-[10px] rounded-lg transition"
                              >
                                İzle
                              </a>
                            </div>
                          )}
                          {product.deliveryContent.textContent && (
                            <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                              <span className="text-[9px] text-indigo-500 font-bold block mb-1">LİSANS & KURULUM TALİMATI</span>
                              <p className="text-[11px] font-mono text-zinc-600 dark:text-zinc-300 whitespace-pre-line leading-relaxed max-h-24 overflow-y-auto">
                                {product.deliveryContent.textContent}
                              </p>
                            </div>
                          )}
                        </div>

                        <button
                          id="finish-checkout-btn"
                          type="button"
                          onClick={() => {
                            setPaparaStep("none");
                            setIsDetailOpen(false);
                          }}
                          className="w-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-sans font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                        >
                          Kapat ve Alışverişe Devam Et
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {/* Guard Verifier */}
                    <div className="mb-6">
                      <StockVerifier
                        currentUserId={currentUserId}
                        currentUserEmail={currentUserEmail}
                        fixedProductId={product.id}
                        fixedProduct={product}
                      />
                    </div>

                    {/* Comments Section */}
                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6">
                      <h4 className="font-sans font-bold text-sm text-zinc-800 dark:text-white mb-4 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-indigo-500" />
                        Müşteri Yorumları & Değerlendirmeler
                      </h4>

                      {/* Method Selector Tabs */}
                      <div className="flex gap-2 mb-4 bg-zinc-100 dark:bg-zinc-900/60 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setCommentMethod("itemsatis")}
                          className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition duration-150 cursor-pointer ${commentMethod === "itemsatis" ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"}`}
                        >
                          1. ItemSatış Değerlendirmesi
                        </button>
                        <button
                          type="button"
                          onClick={() => setCommentMethod("bayiistore")}
                          className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition duration-150 cursor-pointer ${commentMethod === "bayiistore" ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"}`}
                        >
                          2. BayiiStore Değerlendirmesi
                        </button>
                      </div>

                      {commentMethod === "itemsatis" ? (
                        <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-zinc-900/40 dark:to-orange-950/10 p-5 rounded-2xl border border-orange-100/50 dark:border-orange-950/20 mb-6 space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-[#ff5e00]/10 rounded-xl text-[#ff5e00] flex-shrink-0 mt-0.5">
                              <Star className="w-5 h-5 fill-current" />
                            </div>
                            <div>
                              <h5 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">ItemSatış Değerlendirmesi</h5>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1">
                                Satın aldığınız bu ürünün siparişini ItemSatış üzerinden onaylayıp 5 yıldızlı değerlendirme bırakarak bizlere destek olabilirsiniz.
                              </p>
                            </div>
                          </div>
                          
                          <div className="bg-white/80 dark:bg-zinc-900/40 p-3 rounded-xl border border-orange-100/30 dark:border-zinc-850/80 text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1.5">
                            <p className="font-bold text-orange-600 dark:text-orange-400">📝 Değerlendirme Adımları:</p>
                            <p>1. <span className="font-bold text-zinc-700 dark:text-zinc-300">"ItemSatış Profiline Git"</span> butonuna tıklayın.</p>
                            <p>2. Profilinizdeki <span className="font-bold text-zinc-700 dark:text-zinc-300">"Satın Aldıklarım"</span> sayfasına girip bu ilanı bulun.</p>
                            <p>3. Satışı onaylayın ve <span className="font-bold text-zinc-700 dark:text-zinc-300">"5 Yıldız ⭐"</span> vererek güzel yorumunuzu yazın.</p>
                          </div>

                          <a
                            href="https://www.itemsatis.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full inline-flex items-center justify-center gap-2 bg-[#ff5e00] hover:bg-[#e05300] text-white font-sans font-extrabold py-3 px-4 rounded-xl text-xs transition duration-150 shadow-md cursor-pointer"
                          >
                            <Star className="w-4 h-4 fill-current" />
                            ItemSatış Profiline Git & Değerlendir ↗
                          </a>
                        </div>
                      ) : (
                        /* Submit Comment Form */
                        <form id={`comment-form-${product.id}`} onSubmit={handleAddComment} className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 mb-6 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Bu İlana Puan Ver:</span>
                            <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 border border-zinc-150 dark:border-zinc-700 px-3 py-1 rounded-xl">
                              <span className="text-xs font-extrabold text-amber-500">{newRating} / 10</span>
                              <input
                                id={`rating-slider-${product.id}`}
                                type="range"
                                min="1"
                                max="10"
                                value={newRating}
                                onChange={(e) => setNewRating(parseInt(e.target.value))}
                                className="w-20 accent-amber-500"
                              />
                            </div>
                          </div>

                          <div className="relative">
                            <textarea
                              id={`comment-textarea-${product.id}`}
                              required
                              rows={2}
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Bu ürünü deneyimlediniz mi? Diğer alıcılara rehberlik edecek dürüst bir yorum yazın..."
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-xs text-zinc-800 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition resize-none"
                            />
                          </div>

                          {commentError && (
                            <div className="flex items-center gap-1.5 text-xs text-rose-500">
                              <AlertCircle className="w-4 h-4" />
                              <span>{commentError}</span>
                            </div>
                          )}

                          <div className="flex justify-end">
                            <button
                              id={`comment-submit-btn-${product.id}`}
                              type="submit"
                              disabled={isSubmittingComment || !newComment.trim()}
                              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 text-white font-sans font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                            >
                              {isSubmittingComment ? "Gönderiliyor..." : "Yorumu Gönder"}
                              <Send className="w-3 h-3" />
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Comments List */}
                      <div id={`comments-list-${product.id}`} className="space-y-4 max-h-56 overflow-y-auto pr-1">
                        {comments.length === 0 ? (
                          <div className="text-center py-6">
                            <p className="text-xs text-zinc-400 dark:text-zinc-500">Henüz değerlendirme yapılmamış. İlk yorumu siz yapın!</p>
                          </div>
                        ) : (
                          comments.map((c) => (
                            <div id={`comment-row-${c.id}`} key={c.id} className="bg-zinc-50/50 dark:bg-zinc-900/30 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                  {c.userEmail ? c.userEmail.split("@")[0] + "@..." : "Anonim"}
                                </span>
                                <div className="flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                  <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-100">{c.rating}/10</span>
                                </div>
                              </div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed italic">
                                "{c.comment}"
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// Simple absolute close SVG
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
