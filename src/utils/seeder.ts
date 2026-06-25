import { collection, getDocs, doc, writeBatch, limit, query } from "firebase/firestore";
import { db } from "../firebase";

export async function seedInitialData() {
  try {
    const productsRef = collection(db, "products");
    const q = query(productsRef, limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      console.log("Database already seeded");
      return;
    }

    console.log("Seeding initial data...");
    const batch = writeBatch(db);

    // Initial products
    const sampleProducts: any[] = [];

    // Seed products
    sampleProducts.forEach((product) => {
      const pRef = doc(productsRef, product.id);
      batch.set(pRef, product);
    });

    // Sample active validation stock codes
    const sampleStockCodes: any[] = [];

    const codesRef = collection(db, "stock_codes");
    sampleStockCodes.forEach((sc) => {
      const cRef = doc(codesRef, sc.id);
      batch.set(cRef, sc);
    });

    // Sample comments
    const sampleComments: any[] = [];

    const commentsRef = collection(db, "comments");
    sampleComments.forEach((comm) => {
      const commRef = doc(commentsRef, comm.id);
      batch.set(commRef, comm);
    });

    // Sample notifications
    const sampleNotifications = [
      { id: "n-1", userId: "all", title: "BayiiStore E-pin Guard Aktif Edildi!", message: "BayiiStore güvencesiyle e-pin guard sitemiz yayına girdi! Artık aldığınız ürünleri anında sitemiz üzerinden doğrulayarak güvenli dosya/apk teslim alabilirsiniz.", type: "success", createdAt: Date.now() - 259200000, readBy: [] }
    ];

    const notifRef = collection(db, "notifications");
    sampleNotifications.forEach((notif) => {
      const nRef = doc(notifRef, notif.id);
      batch.set(nRef, notif);
    });

    // Sample categories
    const sampleCategories = [
      { id: "cat-1", name: "Bypass / Hack", createdAt: Date.now() - 500000 },
      { id: "cat-2", name: "Mobil Hile", createdAt: Date.now() - 400000 },
      { id: "cat-3", name: "E-Pin / Hesap", createdAt: Date.now() - 300000 },
      { id: "cat-4", name: "GTA Mod Menü", createdAt: Date.now() - 200000 },
      { id: "cat-5", name: "Premium APK", createdAt: Date.now() - 100000 }
    ];

    const categoriesRef = collection(db, "categories");
    sampleCategories.forEach((cat) => {
      const catRef = doc(categoriesRef, cat.id);
      batch.set(catRef, cat);
    });

    await batch.commit();
    console.log("Seeding initial data completed successfully!");
  } catch (error) {
    console.error("Seeding initial data failed:", error);
  }
}
