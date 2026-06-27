import React, { useState, useEffect } from "react";
import { Claim, UserProfile } from "../types";
import { User } from "firebase/auth";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { 
  ShieldCheck, 
  LockKeyhole, 
  Clock, 
  Download, 
  Play, 
  FileText, 
  Copy, 
  Check, 
  Sparkles, 
  Receipt, 
  UserCheck, 
  TrendingUp, 
  ChevronRight,
  Gift
} from "lucide-react";

interface OrderLibraryProps {
  user: User | null;
  userProfile: UserProfile | null;
  userClaims: Claim[];
  copiedCode: string | null;
  handleCopyCode: (code: string) => void;
}

export default function OrderLibrary({ 
  user, 
  userProfile, 
  userClaims, 
  copiedCode, 
  handleCopyCode 
}: OrderLibraryProps) {
  const [now, setNow] = useState(Date.now());

  // Update countdown timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate successful purchases total spent
  const successfulClaims = userClaims.filter(
    (c) => c.status === "approved" || c.stockCode !== "MANUAL_PENDING"
  );
  
  const totalSpent = successfulClaims.reduce(
    (sum, c) => sum + (c.paidPrice || c.originalPrice || 0), 0
  );

  // Determine Loyalty Tier
  let loyaltyTier: "Bronz" | "Gümüş" | "Altın" = "Bronz";
  let tierDiscountPercent = 0;
  let nextTierSpentLimit = 500;
  let nextTierName = "Gümüş";
  let tierBadgeColor = "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400";
  let tierIcon = "🥉";

  if (totalSpent >= 1500) {
    loyaltyTier = "Altın";
    tierDiscountPercent = 5;
    nextTierSpentLimit = 1500;
    nextTierName = "";
    tierBadgeColor = "bg-amber-500/10 border-amber-500/30 text-amber-500 dark:text-amber-400 font-bold";
    tierIcon = "🥇";
  } else if (totalSpent >= 500) {
    loyaltyTier = "Gümüş";
    tierDiscountPercent = 2;
    nextTierSpentLimit = 1500;
    nextTierName = "Altın";
    tierBadgeColor = "bg-slate-300/10 border-slate-300/30 text-slate-500 dark:text-slate-300 font-bold";
    tierIcon = "🥈";
  }

  const remainingForNextTier = nextTierSpentLimit - totalSpent;
  const progressPercent = nextTierName 
    ? Math.min(100, (totalSpent / nextTierSpentLimit) * 100) 
    : 100;

  // Confirm Delivery manually
  const handleConfirmOrder = async (claimId: string) => {
    try {
      const claimRef = doc(db, "claims", claimId);
      await updateDoc(claimRef, {
        isConfirmedByUser: true,
        confirmedAt: Date.now()
      });
    } catch (error) {
      console.error("Error confirming order in history:", error);
    }
  };

  // Format 24-hour countdown
  const getCountdownText = (claimedAt: number) => {
    const expireTime = claimedAt + 24 * 60 * 60 * 1000;
    const remainingMs = expireTime - now;

    if (remainingMs <= 0) {
      return "Süre Doldu (Otomatik Onay)";
    }

    const totalSeconds = Math.floor(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours}sa ${minutes}dk ${seconds}sn kaldı`;
  };

  return (
    <div id="unlocked-dashboard" className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-md flex flex-col justify-between h-full">
      <div>
        {/* Title */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <LockKeyhole className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-sm text-zinc-800 dark:text-white">Dosyalarım ve Sipariş Kütüphanesi</h3>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Satın aldığınız tüm lisanslar, teslimat detayları ve sadakat programınız.</p>
            </div>
          </div>
        </div>

        {user && (
          <div className="space-y-4 mb-6">
            {/* Loyalty & Profile Widget */}
            <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800/60">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-base shadow-md flex-shrink-0">
                    {userProfile?.bankFullName ? userProfile.bankFullName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : "?")}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-sans font-black text-zinc-800 dark:text-white leading-tight">
                        {userProfile?.bankFullName || "Kullanıcı"}
                      </p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] rounded-full border ${tierBadgeColor} uppercase tracking-wider`}>
                        <span className="text-xs">{tierIcon}</span> {loyaltyTier} Üye
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-mono mt-1">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider">Toplam Başarılı Harcama</p>
                  <p className="text-sm font-sans font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {totalSpent.toFixed(2)} TL
                  </p>
                </div>
              </div>

              {/* Progress to Next Tier */}
              <div className="space-y-1.5 pt-3 border-t border-zinc-200/50 dark:border-zinc-800/40">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-500 font-bold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    % {tierDiscountPercent} Otomatik Sepet İndirimi Aktif
                  </span>
                  {nextTierName ? (
                    <span className="text-zinc-400">
                      <strong className="text-zinc-700 dark:text-zinc-300">{remainingForNextTier.toFixed(2)} TL</strong> harcama sonra <strong className="text-amber-500">{nextTierName}</strong>
                    </span>
                  ) : (
                    <span className="text-amber-500 font-extrabold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 fill-current" />
                      En Üst Seviye Altın Üyelik!
                    </span>
                  )}
                </div>

                <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* List of Claims */}
        {!user ? (
          <div className="text-center py-12 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
            <Gift className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-sm mx-auto leading-relaxed">
              Sahip olduğunuz teslimat kodlarını kalıcı olarak saklamak, fatura detaylarını görmek ve seviyenizi yükseltmek için lütfen giriş yapın.
            </p>
          </div>
        ) : userClaims.length === 0 ? (
          <div className="text-center py-12 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
            <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-normal">
              Henüz bu hesapla doğrulanmış bir e-pin bulunmuyor. <br />
              Sitenin sol üstündeki doğrulama kutusundan kodunuzu onaylayabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
            {userClaims.map((claim) => {
              const isConfirmed = claim.isConfirmedByUser;
              
              return (
                <div 
                  id={`claim-row-${claim.id}`} 
                  key={claim.id} 
                  className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-800 flex flex-col gap-3.5 hover:border-zinc-300 dark:hover:border-zinc-700 transition"
                >
                  {/* Top Bar: Product details & Date */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-zinc-800 dark:text-zinc-100">{claim.productName}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 text-[9px] font-mono rounded-md border border-zinc-200 dark:border-zinc-800/80">
                          ID: {claim.id.slice(0, 8)}
                        </span>
                        <div className="flex items-center gap-1">
                          <p className="text-[10px] text-zinc-500 font-mono font-bold">E-Pin: {claim.stockCode}</p>
                          {claim.stockCode !== "MANUAL_PENDING" && (
                            <button
                              onClick={() => handleCopyCode(claim.stockCode)}
                              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition text-zinc-400 hover:text-indigo-500 cursor-pointer"
                              title="Kopyala"
                            >
                              {copiedCode === claim.stockCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] text-zinc-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {new Date(claim.claimedAt).toLocaleDateString("tr-TR")}
                    </span>
                  </div>

                  {/* Invoice Details section */}
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-150 dark:border-zinc-850 text-[10px] text-zinc-500 dark:text-zinc-400 space-y-1.5 font-sans">
                    <div className="flex items-center gap-1 pb-1 border-b border-zinc-100 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">
                      <Receipt className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Fatura & Sipariş Detayı</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-1 pt-0.5">
                      <div>Alıcı Hesap Adı:</div>
                      <div className="text-right font-bold text-zinc-700 dark:text-zinc-300 truncate">{claim.customerName || "Otomatik Entegrasyon"}</div>
                      
                      <div>Ürün Satış Fiyatı:</div>
                      <div className="text-right font-mono font-bold">{claim.originalPrice ? `${claim.originalPrice.toFixed(2)} TL` : "Bilinmiyor"}</div>

                      {claim.status === "pending" ? (
                        <>
                          <div>Sipariş Durumu:</div>
                          <div className="text-right font-bold text-amber-500">Yönetici Onayı Bekliyor</div>
                        </>
                      ) : (
                        <>
                          <div>Sipariş Durumu:</div>
                          <div className="text-right font-bold text-emerald-500">Onaylandı & Teslim Edildi</div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Countdown Timer Badge */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                    {/* Countdown Status */}
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      <div className="text-[10px] leading-tight">
                        <p className="text-zinc-400 font-medium">Sistem Otomatik Onay Geri Sayımı:</p>
                        <p className={`font-mono font-black mt-0.5 ${isConfirmed ? "text-emerald-500" : "text-amber-500 animate-pulse"}`}>
                          {isConfirmed ? "Teslimat Müşteri Tarafından Onaylandı ✓" : getCountdownText(claim.claimedAt)}
                        </p>
                      </div>
                    </div>

                    {/* Quick Manual Approval Button */}
                    {!isConfirmed && claim.stockCode !== "MANUAL_PENDING" && (
                      <button
                        onClick={() => handleConfirmOrder(claim.id)}
                        className="flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-[10px] py-1.5 px-3 rounded-lg transition shadow-sm cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Teslimatı Onayla
                      </button>
                    )}
                  </div>

                  {/* Download action links */}
                  {claim.stockCode !== "MANUAL_PENDING" && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-150 dark:border-zinc-800">
                      {claim.deliveryContent.apkUrl && (
                        <a
                          href={claim.deliveryContent.apkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white font-sans font-bold text-[10px] rounded-lg transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          APK İndir
                        </a>
                      )}
                      {claim.deliveryContent.zipUrl && (
                        <a
                          href={claim.deliveryContent.zipUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-sans font-bold text-[10px] rounded-lg transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          ZIP İndir
                        </a>
                      )}
                      {claim.deliveryContent.tutorialVideo && (
                        <a
                          href={claim.deliveryContent.tutorialVideo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-sans font-bold text-[10px] rounded-lg transition"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Kurulum Videosu
                        </a>
                      )}
                      {claim.deliveryContent.textContent && (
                        <button
                          onClick={() => alert(`Lisans & Metin Bilgisi:\n\n${claim.deliveryContent.textContent}`)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-zinc-600 hover:bg-zinc-700 text-white font-sans font-bold text-[10px] rounded-lg transition cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Metni Göster
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-[9px] text-zinc-400 font-semibold uppercase tracking-wider">
        <span>GÜVENLİK STANDARTI</span>
        <span className="text-indigo-500 flex items-center gap-1">
          <ShieldCheck className="w-4 h-4" />
          SECURE EPIN GUARD ACTIVE
        </span>
      </div>
    </div>
  );
}
