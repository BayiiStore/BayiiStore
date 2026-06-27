import React, { useState } from "react";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ShieldCheck, User, Loader2, KeyRound } from "lucide-react";
import { motion } from "motion/react";
import AgreementModal from "./AgreementModal";
import { REGISTRATION_AGREEMENT, DIGITAL_CONTENT_AGREEMENT } from "../constants/agreements";

interface ProfileCompletionOverlayProps {
  currentUserId: string;
  currentUserEmail: string;
  userProfile: any;
  onComplete: (updatedProfile: any) => void;
}

export default function ProfileCompletionOverlay({
  currentUserId,
  currentUserEmail,
  userProfile,
  onComplete
}: ProfileCompletionOverlayProps) {
  const [bankFullName, setBankFullName] = useState(
    userProfile?.bankFullName && userProfile.bankFullName !== "Banka İsmi Belirtilmedi"
      ? userProfile.bankFullName
      : ""
  );
  const [itemsatisUsername, setItemsatisUsername] = useState(
    userProfile?.itemsatisUsername || ""
  );
  const [itemsatisFullName, setItemsatisFullName] = useState(
    userProfile?.itemsatisFullName || ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [agreeRegistration, setAgreeRegistration] = useState(false);
  const [agreeDigital, setAgreeDigital] = useState(false);
  const [activeAgreement, setActiveAgreement] = useState<'registration' | 'digital' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanBankName = bankFullName.trim();
    const cleanUsername = itemsatisUsername.trim();
    const cleanItemsatisFullName = itemsatisFullName.trim();

    if (!cleanBankName) {
      setErrorMsg("Lütfen banka/Papara hesabınızdaki isim ve soyisminizi girin.");
      return;
    }
    if (cleanBankName.split(" ").length < 2) {
      setErrorMsg("Lütfen hem adınızı hem de soyadınızı girin.");
      return;
    }
    if (!cleanUsername) {
      setErrorMsg("Lütfen İtemSatış kullanıcı adınızı girin.");
      return;
    }
    if (!cleanItemsatisFullName) {
      setErrorMsg("Lütfen İtemSatış hesabınızda kayıtlı olan ad ve soyadınızı girin.");
      return;
    }
    if (cleanItemsatisFullName.split(" ").length < 2) {
      setErrorMsg("Lütfen İtemSatış hesabınızdaki hem adınızı hem de soyadınızı girin.");
      return;
    }
    if (!agreeRegistration) {
      setErrorMsg("Lütfen Kayıt ve Gizlilik Sözleşmesi'ni onaylayın.");
      return;
    }
    if (!agreeDigital) {
      setErrorMsg("Lütfen Dijital İçerik ve Kullanım Sözleşmesi'ni onaylayın.");
      return;
    }

    setIsLoading(true);

    try {
      const userRef = doc(db, "users", currentUserId);
      const updateData = {
        bankFullName: cleanBankName,
        itemsatisUsername: cleanUsername,
        itemsatisFullName: cleanItemsatisFullName
      };
      
      await updateDoc(userRef, updateData);

      // Call onComplete with merged profile
      onComplete({
        ...userProfile,
        ...updateData
      });
    } catch (err: any) {
      console.error("Error updating user profile:", err);
      setErrorMsg("Bilgileriniz kaydedilirken bir sorun oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-600/10 border border-indigo-600/30 text-indigo-400 rounded-2xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white font-sans uppercase tracking-wider">
              Profilinizi Tamamlayın
            </h2>
            <p className="text-xs text-zinc-400">
              Devam etmeden önce zorunlu güvenlik bilgilerini girmelisiniz.
            </p>
          </div>
        </div>

        <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 text-zinc-300 rounded-2xl text-xs space-y-2 mb-6">
          <p className="font-bold text-indigo-400">🛡️ Güvenlik ve E-Pin Doğrulama Koruması</p>
          <p className="leading-relaxed">
            Google ile hızlı giriş yapmış olsanız dahi, İtemSatış sipariş eşleşmeleri ve Papara/EFT dekont kontrollerinin doğru yapılabilmesi için aşağıdaki bilgileri girmek <strong>zorunludur</strong>.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider ml-1">
              Banka / Papara Gerçek İsim Soyisim <span className="text-indigo-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-zinc-500" />
              </div>
              <input
                type="text"
                required
                value={bankFullName}
                onChange={(e) => setBankFullName(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
                className="w-full pl-11 pr-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs font-semibold text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
              />
            </div>
            <p className="text-[10px] text-zinc-500 leading-normal ml-1">
              ⚠️ Ödeme yaptığınız banka hesabının veya Papara cüzdanının sahibiyle birebir aynı olmalıdır.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider ml-1">
              İtemSatış Gerçek Kullanıcı Adınız <span className="text-indigo-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <KeyRound className="h-4 w-4 text-zinc-500" />
              </div>
              <input
                type="text"
                required
                value={itemsatisUsername}
                onChange={(e) => setItemsatisUsername(e.target.value)}
                placeholder="Örn: Kiwoo35"
                className="w-full pl-11 pr-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs font-semibold text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
              />
            </div>
            <p className="text-[10px] text-zinc-500 leading-normal ml-1">
              ⚠️ İtemSatış'tan satın aldığınız stok kodlarını doğrularken bu kullanıcı adı eşleştirilecektir.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider ml-1">
              İtemSatış Kayıtlı İsim Soyisminiz <span className="text-indigo-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-zinc-500" />
              </div>
              <input
                type="text"
                required
                value={itemsatisFullName}
                onChange={(e) => setItemsatisFullName(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
                className="w-full pl-11 pr-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs font-semibold text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
              />
            </div>
            <p className="text-[10px] text-zinc-500 leading-normal ml-1">
              ⚠️ İtemSatış hesabınızda kayıtlı olan gerçek isim ve soyisminiz ile birebir aynı olmalıdır.
            </p>
          </div>

          <div className="space-y-3 my-4 border-t border-b border-zinc-900 py-3 px-1">
            <label className="flex items-start gap-3 cursor-pointer group select-none">
              <input
                type="checkbox"
                checked={agreeRegistration}
                onChange={(e) => setAgreeRegistration(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-indigo-600 focus:ring-indigo-500/20 focus:ring-2 transition-all cursor-pointer accent-indigo-600"
              />
              <span className="text-[11px] leading-relaxed text-zinc-400 group-hover:text-zinc-300 transition-colors">
                <button
                  type="button"
                  onClick={() => setActiveAgreement('registration')}
                  className="font-black text-indigo-400 hover:text-indigo-300 underline cursor-pointer text-left mr-1 inline"
                >
                  Kayıt ve Gizlilik Sözleşmesi
                </button>
                şartlarını okudum, anladım ve verilerimin güvenlik amaçlı loglanmasını kabul ediyorum. <span className="text-red-500">*</span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group select-none">
              <input
                type="checkbox"
                checked={agreeDigital}
                onChange={(e) => setAgreeDigital(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-indigo-600 focus:ring-indigo-500/20 focus:ring-2 transition-all cursor-pointer accent-indigo-600"
              />
              <span className="text-[11px] leading-relaxed text-zinc-400 group-hover:text-zinc-300 transition-colors">
                <button
                  type="button"
                  onClick={() => setActiveAgreement('digital')}
                  className="font-black text-indigo-400 hover:text-indigo-300 underline cursor-pointer text-left mr-1 inline"
                >
                  Dijital İçerik ve Kullanım Sözleşmesi
                </button>
                şartlarını tamamen kabul ediyorum, aktivasyon sonrasında iade hakkımın olmadığını onaylıyorum. <span className="text-red-500">*</span>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading || !bankFullName.trim() || !itemsatisUsername.trim() || !itemsatisFullName.trim() || !agreeRegistration || !agreeDigital}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-sans font-extrabold py-4 px-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/10 text-xs flex items-center justify-center gap-2 cursor-pointer mt-6 uppercase tracking-wider"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              "Profilimi Güncelle ve Devam Et"
            )}
          </button>
        </form>
      </motion.div>

      <AgreementModal
        isOpen={activeAgreement === 'registration'}
        onClose={() => setActiveAgreement(null)}
        title={REGISTRATION_AGREEMENT.title}
        content={REGISTRATION_AGREEMENT.content}
      />

      <AgreementModal
        isOpen={activeAgreement === 'digital'}
        onClose={() => setActiveAgreement(null)}
        title={DIGITAL_CONTENT_AGREEMENT.title}
        content={DIGITAL_CONTENT_AGREEMENT.content}
      />
    </div>
  );
}
