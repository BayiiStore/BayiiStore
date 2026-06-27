import { collection, query, where, getDocs, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export const triggerProductAlerts = async (
  productId: string,
  productName: string,
  oldPrice: number,
  newPrice: number,
  oldStockStatus: string,
  newStockStatus: string
) => {
  try {
    // 1. Check Stock Alerts: if went from 'yok' to 'var'
    if (oldStockStatus === "yok" && newStockStatus === "var") {
      const q = query(
        collection(db, "alerts"),
        where("productId", "==", productId),
        where("type", "==", "stock"),
        where("active", "==", true)
      );
      const snap = await getDocs(q);
      
      for (const d of snap.docs) {
        const alertData = d.data();
        const notifRef = doc(collection(db, "notifications"));
        await setDoc(notifRef, {
          id: notifRef.id,
          userId: alertData.userId,
          title: `Stok Geldi: ${productName} 🎉`,
          message: `'${productName}' ürünü tekrar stoklarımızda! Hemen tükenmeden satın almak için web sitemizi ziyaret edin.`,
          type: "success",
          createdAt: Date.now(),
          readBy: []
        });
        
        // Deactivate alert
        await updateDoc(doc(db, "alerts", d.id), { active: false });
      }
    }

    // 2. Check Price Alerts: if price decreased
    if (newPrice < oldPrice) {
      const q = query(
        collection(db, "alerts"),
        where("productId", "==", productId),
        where("type", "==", "price"),
        where("active", "==", true)
      );
      const snap = await getDocs(q);
      
      for (const d of snap.docs) {
        const alertData = d.data();
        const notifRef = doc(collection(db, "notifications"));
        await setDoc(notifRef, {
          id: notifRef.id,
          userId: alertData.userId,
          title: `İndirim Alarmı: ${productName} 📉`,
          message: `'${productName}' ürününün fiyatı düştü! Eski fiyat: ${oldPrice.toFixed(2)} TL iken şimdi sadece ${newPrice.toFixed(2)} TL!`,
          type: "info",
          createdAt: Date.now(),
          readBy: []
        });
        
        // Deactivate alert
        await updateDoc(doc(db, "alerts", d.id), { active: false });
      }
    }
  } catch (error) {
    console.error("Error triggering product alerts:", error);
  }
};
