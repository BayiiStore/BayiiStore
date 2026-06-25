import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, writeBatch, query, orderBy, onSnapshot, where, setDoc } from "firebase/firestore";
import { Product, StockCode, Claim, Comment, Notification, Category, SupportRequest } from "../types";
import {
  ShieldCheck,
  Plus,
  Package,
  KeyRound,
  BellRing,
  Sparkles,
  Trash2,
  Edit3,
  MessageCircle,
  ShoppingCart,
  Loader2,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  BarChart3,
  MessageSquare,
  Activity,
  DollarSign,
  Award,
  Clock,
  UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";

export default function AdminPanel() {
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem("isAdmin") === "true";
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [activeTab, setActiveTab] = useState<"dashboard" | "products" | "codes" | "notifications" | "claims" | "comments" | "support" | "users">("dashboard");
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  // Collections state
  const [products, setProducts] = useState<Product[]>([]);
  const [stockCodes, setStockCodes] = useState<StockCode[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]); // Any type since we didn't export UserProfile

  // Form states - Products
  const [pName, setPName] = useState("");
  const [pCategory, setPCategory] = useState("Bypass / Hack");
  const [pDescription, setPDescription] = useState("");
  const [pImageUrl, setPImageUrl] = useState("");
  const [pItemSatisUrl, setPItemSatisUrl] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pStockStatus, setPStockStatus] = useState<"var" | "yok">("var");
  const [pDelivType, setPDelivType] = useState<"file" | "text" | "both">("both");
  const [pApkUrl, setPApkUrl] = useState("");
  const [pZipUrl, setPZipUrl] = useState("");
  const [pVideoUrl, setPVideoUrl] = useState("");
  const [pTextContent, setPTextContent] = useState("");

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formStep, setFormStep] = useState<1 | 2>(1);

  // Category Form State
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categorySuccessMsg, setCategorySuccessMsg] = useState("");

  // UI States
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState("");
  const [productSuccessMsg, setProductSuccessMsg] = useState("");

  // Form states - Stock Codes
  const [selectedProductId, setSelectedProductId] = useState("");
  const [rawCodes, setRawCodes] = useState(""); // Comma separated codes
  const [codesSuccessMsg, setCodesSuccessMsg] = useState("");

  // Form states - Notifications
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifType, setNotifType] = useState<"info" | "success" | "alert">("info");
  const [notifSuccessMsg, setNotifSuccessMsg] = useState("");

  // Real-time data streams
  useEffect(() => {
    if (!isAdmin) return;

    // Stream Products
    const unsubProd = onSnapshot(query(collection(db, "products"), orderBy("createdAt", "desc")), (snap) => {
      const list: Product[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          ...data,
          id: data.id || d.id,
          firestoreId: d.id
        } as Product);
      });
      setProducts(list);
      if (list.length > 0 && !selectedProductId) {
        setSelectedProductId(list[0].id);
      }
    });

    // Stream Stock Codes
    const unsubCodes = onSnapshot(collection(db, "stock_codes"), (snap) => {
      const list: StockCode[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as StockCode));
      setStockCodes(list);
    });

    // Stream Claims
    const unsubClaims = onSnapshot(query(collection(db, "claims"), orderBy("claimedAt", "desc")), (snap) => {
      const list: Claim[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Claim));
      setClaims(list);
    });

    // Stream Comments
    const unsubComments = onSnapshot(query(collection(db, "comments"), orderBy("createdAt", "desc")), (snap) => {
      const list: Comment[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Comment));
      setComments(list);
    });

    // Stream Categories
    const unsubCats = onSnapshot(query(collection(db, "categories"), orderBy("createdAt", "asc")), (snap) => {
      const list: Category[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Category));
      setCategories(list);
    });

    // Stream Support Requests
    const unsubSupport = onSnapshot(query(collection(db, "support_requests"), orderBy("createdAt", "desc")), (snap) => {
      const list: SupportRequest[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as SupportRequest));
      setSupportRequests(list);
    });

    // Stream Users
    const unsubUsers = onSnapshot(query(collection(db, "users"), orderBy("createdAt", "desc")), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push(d.data()));
      setUsersList(list);
    });

    // Stream Settings
    const unsubSettings = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) {
        setIsMaintenanceMode(snap.data().maintenanceMode || false);
      }
    });

    return () => {
      unsubProd();
      unsubCodes();
      unsubClaims();
      unsubComments();
      unsubCats();
      unsubSupport();
      unsubUsers();
      unsubSettings();
    };
  }, [isAdmin]);

  const toggleMaintenanceMode = async () => {
    try {
      const newMode = !isMaintenanceMode;
      await setDoc(doc(db, "settings", "global"), { maintenanceMode: newMode }, { merge: true });
    } catch (err) {
      console.error("Error toggling maintenance mode:", err);
      alert("Bakım modu güncellenirken hata oluştu.");
    }
  };

  // Handle Admin Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "admin" && password === "admin52") {
      setIsAdmin(true);
      localStorage.setItem("isAdmin", "true");
      setLoginError("");
    } else {
      setLoginError("Hatalı kullanıcı adı veya şifre!");
    }
  };

  // Add Custom Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setCategorySuccessMsg("");
    try {
      const catId = "cat-" + Date.now();
      await addDoc(collection(db, "categories"), {
        id: catId,
        name: newCategoryName.trim(),
        createdAt: Date.now()
      });
      setNewCategoryName("");
      setCategorySuccessMsg("Kategori başarıyla eklendi!");
      setTimeout(() => setCategorySuccessMsg(""), 3000);
    } catch (err) {
      console.error("Error adding category:", err);
      alert("Kategori eklenirken bir hata oluştu.");
    }
  };

  // Delete Custom Category
  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!confirm(`'${catName}' kategorisini silmek istediğinize emin misiniz?`)) return;
    try {
      const q = query(collection(db, "categories"), where("id", "==", catId));
      const querySnap = await getDocs(q);
      const batch = writeBatch(db);
      querySnap.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (err) {
      console.error("Error deleting category:", err);
    }
  };

  // Support Request Handlers
  const handleResolveSupport = async (id: string, currentStatus: string) => {
    try {
      const q = query(collection(db, "support_requests"), where("id", "==", id));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach((d) => {
        batch.update(d.ref, { status: currentStatus === "bekliyor" ? "cozuldu" : "bekliyor" });
      });
      await batch.commit();
    } catch (err) {
      console.error("Error resolving support request:", err);
    }
  };

  const handleDeleteSupport = async (id: string) => {
    if (!confirm("Bu destek talebini silmek istediğinize emin misiniz?")) return;
    try {
      const q = query(collection(db, "support_requests"), where("id", "==", id));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    } catch (err) {
      console.error("Error deleting support request:", err);
    }
  };

  // Recharts Sales Trend (Timeline of 7 Days)
  const getSalesTrendData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return {
        dateString: d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
        timestampStart: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
        timestampEnd: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime(),
        salesCount: 0,
        revenue: 0
      };
    }).reverse();

    claims.forEach((claim) => {
      const claimDate = claim.claimedAt;
      const matchingDay = last7Days.find(
        (day) => claimDate >= day.timestampStart && claimDate <= day.timestampEnd
      );
      if (matchingDay) {
        matchingDay.salesCount += 1;
        const prod = products.find((p) => p.id === claim.productId);
        if (prod) {
          matchingDay.revenue += prod.price;
        }
      }
    });

    return last7Days.map((day) => ({
      Tarih: day.dateString,
      "Satış Adedi": day.salesCount,
      "Ciro (TL)": parseFloat(day.revenue.toFixed(1))
    }));
  };

  // Recharts Popular Listings (Claims volume per product)
  const getPopularListingsData = () => {
    const counts: { [key: string]: { name: string; sales: number; revenue: number } } = {};
    
    products.forEach((p) => {
      counts[p.id] = { name: p.name.length > 20 ? p.name.substring(0, 20) + "..." : p.name, sales: 0, revenue: 0 };
    });

    claims.forEach((claim) => {
      if (counts[claim.productId]) {
        counts[claim.productId].sales += 1;
        const prod = products.find((p) => p.id === claim.productId);
        if (prod) {
          counts[claim.productId].revenue += prod.price;
        }
      } else {
        counts[claim.productId] = {
          name: claim.productName.length > 20 ? claim.productName.substring(0, 20) + "..." : claim.productName,
          sales: 1,
          revenue: 0
        };
      }
    });

    return Object.values(counts)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5)
      .map((item) => ({
        Ürün: item.name,
        "Satış Adedi": item.sales,
        "Toplam Gelir (TL)": parseFloat(item.revenue.toFixed(1))
      }));
  };

  // AI Description Generator
  const generateAiDescription = async () => {
    if (!pName) {
      setAiError("Açıklama üretmek için lütfen önce ürün adını girin.");
      return;
    }
    setIsGeneratingAi(true);
    setAiError("");
    try {
      const response = await fetch("/api/gemini/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: pName,
          category: pCategory,
          price: pPrice
        })
      });
      const data = await response.json();
      if (response.ok && data.description) {
        setPDescription(data.description);
      } else {
        setAiError(data.error || "Yapay zeka açıklaması oluşturulamadı.");
      }
    } catch (error) {
      console.error(error);
      setAiError("Bağlantı hatası: Yapay zeka sunucusuna ulaşılamadı.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // AI Listing Image Designer (Nano Banana 2)
  const [imageTemplate, setImageTemplate] = useState<"cyberpunk" | "minimalist" | "promo">("promo");
  const [isDesigningImage, setIsDesigningImage] = useState(false);
  const [imageDesignError, setImageDesignError] = useState("");

  const handleGenerateListingImage = async () => {
    if (!pName) {
      setImageDesignError("Görsel tasarlamak için lütfen önce ürün adını girin.");
      return;
    }
    setIsDesigningImage(true);
    setImageDesignError("");
    try {
      const response = await fetch("/api/gemini/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: pName,
          category: pCategory,
          template: imageTemplate
        })
      });
      const data = await response.json();
      if (response.ok && data.imageUrl) {
        setPImageUrl(data.imageUrl);
      } else {
        setImageDesignError(data.error || "Görsel tasarlanamadı. Lütfen tekrar deneyin.");
      }
    } catch (error) {
      console.error(error);
      setImageDesignError("Bağlantı hatası: Yapay zeka sunucusuna ulaşılamadı.");
    } finally {
      setIsDesigningImage(false);
    }
  };

  // Add or Edit Product in Firestore
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductSuccessMsg("");

    try {
      const priceNum = parseFloat(pPrice);
      if (isNaN(priceNum)) {
        alert("Geçersiz fiyat!");
        return;
      }

      if (editingProductId) {
        // Find existing product to update
        const q = query(collection(db, "products"), where("id", "==", editingProductId));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          const docId = querySnap.docs[0].id;
          await updateDoc(doc(db, "products", docId), {
            name: pName,
            category: pCategory,
            description: pDescription,
            imageUrl: pImageUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=600",
            itemSatisUrl: pItemSatisUrl,
            price: priceNum,
            stockStatus: pStockStatus,
            deliveryContent: {
              type: pDelivType,
              apkUrl: (pDelivType !== "text" && pApkUrl) ? pApkUrl : "",
              zipUrl: (pDelivType !== "text" && pZipUrl) ? pZipUrl : "",
              tutorialVideo: pVideoUrl || "",
              textContent: pTextContent || ""
            }
          });
          setProductSuccessMsg("Ürün başarıyla güncellendi!");
          setEditingProductId(null);
        } else {
          alert("Ürün bulunamadı!");
        }
      } else {
        const newId = "prod-" + Date.now();
        const productPayload: Product = {
          id: newId,
          name: pName,
          category: pCategory,
          description: pDescription,
          imageUrl: pImageUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=600",
          itemSatisUrl: pItemSatisUrl,
          price: priceNum,
          stockStatus: pStockStatus,
          deliveryContent: {
            type: pDelivType,
            apkUrl: (pDelivType !== "text" && pApkUrl) ? pApkUrl : "",
            zipUrl: (pDelivType !== "text" && pZipUrl) ? pZipUrl : "",
            tutorialVideo: pVideoUrl || "",
            textContent: pTextContent || ""
          },
          rating: 10,
          ratingCount: 0,
          createdAt: Date.now()
        };

        await addDoc(collection(db, "products"), productPayload);
        setProductSuccessMsg("Ürün başarıyla eklendi!");
      }

      // Clear Form
      setPName("");
      setPDescription("");
      setPImageUrl("");
      setPItemSatisUrl("");
      setPPrice("");
      setPApkUrl("");
      setPZipUrl("");
      setPVideoUrl("");
      setPTextContent("");
      setFormStep(1);

      setTimeout(() => setProductSuccessMsg(""), 4000);
    } catch (error) {
      console.error("Add product failed:", error);
      alert("Ürün eklenirken hata oluştu.");
    }
  };

  // Update inline properties (stock status, price)
  const toggleStockStatus = async (productId: string, currentStatus: "var" | "yok") => {
    try {
      const q = query(collection(db, "products"), where("id", "==", productId));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const docRef = doc(db, "products", querySnap.docs[0].id);
        await updateDoc(docRef, {
          stockStatus: currentStatus === "var" ? "yok" : "var"
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePrice = async (productId: string, newPriceStr: string) => {
    const parsed = parseFloat(newPriceStr);
    if (isNaN(parsed)) return;
    try {
      const q = query(collection(db, "products"), where("id", "==", productId));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const docRef = doc(db, "products", querySnap.docs[0].id);
        await updateDoc(docRef, {
          price: parsed
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id: string, firestoreId?: string) => {
    if (!window.confirm("Bu ürünü silmek istediğinize emin misiniz? Tüm detayları ve yorumları kaybolacaktır.")) return;
    try {
      if (firestoreId) {
        await deleteDoc(doc(db, "products", firestoreId));
      } else {
        const q = query(collection(db, "products"), where("id", "==", id));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          await deleteDoc(doc(db, "products", querySnap.docs[0].id));
        } else {
          await deleteDoc(doc(db, "products", id));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete All Products
  const handleDeleteAllProducts = async () => {
    if (products.length === 0) {
      alert("Silinecek hiçbir ürün bulunamadı.");
      return;
    }
    if (!window.confirm("Sitedeki TÜM ürünleri (ilanları) tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz!")) return;
    
    try {
      const batch = writeBatch(db);
      for (const p of products) {
        if (p.firestoreId) {
          batch.delete(doc(db, "products", p.firestoreId));
        } else {
          const q = query(collection(db, "products"), where("id", "==", p.id));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            batch.delete(doc(db, "products", querySnap.docs[0].id));
          }
        }
      }
      await batch.commit();
      alert("Tüm ürünler başarıyla silindi!");
    } catch (err) {
      console.error(err);
      alert("Hata oluştu, tüm ürünler silinemedi.");
    }
  };

  const handleEditProductClick = (p: Product) => {
    setEditingProductId(p.id);
    setFormStep(1);
    setPName(p.name);
    setPCategory(p.category);
    setPDescription(p.description);
    setPImageUrl(p.imageUrl);
    setPItemSatisUrl(p.itemSatisUrl);
    setPPrice(p.price.toString());
    setPStockStatus(p.stockStatus);
    setPDelivType(p.deliveryContent.type);
    setPApkUrl(p.deliveryContent.apkUrl || "");
    setPZipUrl(p.deliveryContent.zipUrl || "");
    setPVideoUrl(p.deliveryContent.tutorialVideo || "");
    setPTextContent(p.deliveryContent.textContent || "");
    
    // Switch to Add Product tab
    setActiveTab("products");
    
    // Scroll to form smoothly
    setTimeout(() => {
      document.getElementById("add-product-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // Add Stock Codes
  const handleAddStockCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodesSuccessMsg("");
    if (!selectedProductId || !rawCodes.trim()) return;

    try {
      const codeList = rawCodes
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      const batch = writeBatch(db);
      const codesColRef = collection(db, "stock_codes");

      codeList.forEach((code) => {
        const cRef = doc(codesColRef);
        batch.set(cRef, {
          id: cRef.id,
          code: code,
          productId: selectedProductId,
          used: false
        });
      });

      await batch.commit();
      setCodesSuccessMsg(`${codeList.length} adet stok kodu başarıyla yüklendi!`);
      setRawCodes("");
      setTimeout(() => setCodesSuccessMsg(""), 4000);
    } catch (err) {
      console.error(err);
      alert("Kodlar eklenirken hata oluştu.");
    }
  };

  // Broadcast Notification
  const handleBroadcastNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifSuccessMsg("");
    if (!notifTitle.trim() || !notifMessage.trim()) return;

    try {
      const notifRef = doc(collection(db, "notifications"));
      await addDoc(collection(db, "notifications"), {
        id: notifRef.id,
        userId: "all",
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        type: notifType,
        createdAt: Date.now(),
        readBy: []
      });

      setNotifSuccessMsg("Sistem bildirimi başarıyla yayınlandı!");
      setNotifTitle("");
      setNotifMessage("");
      setTimeout(() => setNotifSuccessMsg(""), 4000);
    } catch (err) {
      console.error(err);
      alert("Bildirim yayınlanırken hata oluştu.");
    }
  };

  // Delete Comment
  const handleDeleteComment = async (id: string) => {
    if (!window.confirm("Bu yorumu silmek istediğinize emin misiniz?")) return;
    try {
      await deleteDoc(doc(db, "comments", id));
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAdmin) {
    return (
      <div id="admin-login-screen" className="max-w-md mx-auto my-16 bg-white dark:bg-zinc-800 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-700 shadow-xl">
        <div className="text-center mb-6">
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-2xl w-fit mx-auto mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="font-sans font-black text-xl text-zinc-800 dark:text-white">Yönetici Girişi</h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            BayiiStore E-pin Guard sistemini yönetmek için bilgilerinizi girin.
          </p>
        </div>

        <form id="admin-login-form" onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 block mb-1">KULLANICI ADI</label>
            <input
              id="admin-username-input"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Kullanıcı adı girin..."
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500/15"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 block mb-1">ŞİFRE</label>
            <input
              id="admin-password-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifrenizi girin..."
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500/15"
            />
          </div>

          {loginError && (
            <p className="text-xs text-rose-500 font-medium">{loginError}</p>
          )}

          <button
            id="admin-submit-btn"
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-sans font-bold py-3 px-4 rounded-xl transition duration-155 cursor-pointer shadow-md shadow-red-500/10 text-sm"
          >
            Yönetim Paneline Giriş Yap
          </button>
        </form>
      </div>
    );
  }

  return (
    <div id="admin-panel-container" className="my-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xl min-h-[600px] flex flex-col md:flex-row">
      
      {/* Sidebar Tabs */}
      <div id="admin-sidebar" className="w-full md:w-64 bg-zinc-50 dark:bg-zinc-950 p-5 border-r border-zinc-200 dark:border-zinc-800 space-y-2 flex-shrink-0">
        <div className="flex items-center gap-2 mb-6 px-2">
          <ShieldCheck className="w-5 h-5 text-red-500" />
          <span className="font-sans font-black text-sm text-zinc-800 dark:text-white uppercase tracking-wider">GUARD PANEL</span>
        </div>

        <button
          id="tab-dashboard"
          onClick={() => setActiveTab("dashboard")}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "dashboard"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-900"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Gösterge Paneli
        </button>

        <button
          id="tab-products"
          onClick={() => setActiveTab("products")}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "products"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-900"
          }`}
        >
          <Package className="w-4 h-4" />
          Ürün Ekle & Yönet
        </button>

        <button
          id="tab-codes"
          onClick={() => setActiveTab("codes")}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "codes"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-900"
          }`}
        >
          <KeyRound className="w-4 h-4" />
          Stok Doğrulama Kodları
        </button>

        <button
          id="tab-notifications"
          onClick={() => setActiveTab("notifications")}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "notifications"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-900"
          }`}
        >
          <BellRing className="w-4 h-4" />
          Özel Bildirim Gönder
        </button>

        <button
          id="tab-claims"
          onClick={() => setActiveTab("claims")}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "claims"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-900"
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Doğrulanan Teslimatlar
        </button>

        <button
          id="tab-comments"
          onClick={() => setActiveTab("comments")}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "comments"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-900"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          Yorum Değerlendirmeleri
        </button>

        <button
          id="tab-users"
          onClick={() => setActiveTab("users")}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "users"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-900"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Kayıtlı Müşteriler
        </button>

        <button
          id="tab-support"
          onClick={() => setActiveTab("support")}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "support"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-900"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Destek Talepleri
        </button>

        <div className="pt-4 mt-2 border-t border-zinc-200 dark:border-zinc-850 space-y-2">
          <button
            onClick={toggleMaintenanceMode}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              isMaintenanceMode 
                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-900 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4" />
              Bakım Modu
            </div>
            <div className={`w-8 h-4 rounded-full p-0.5 flex items-center transition-colors ${isMaintenanceMode ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
              <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${isMaintenanceMode ? 'tranzinc-x-4' : 'tranzinc-x-0'}`}></div>
            </div>
          </button>

          <button
            id="admin-logout-btn"
            type="button"
            onClick={() => {
              setIsAdmin(false);
              localStorage.removeItem("isAdmin");
            }}
            className="w-full text-left text-[11px] font-bold text-red-500 dark:text-red-400 hover:underline px-4 py-2 cursor-pointer"
          >
            Panelden Güvenli Çıkış
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <div id="admin-main-content" className="flex-1 p-6 overflow-x-auto">
        <AnimatePresence mode="wait">

          {/* TAB 0: Dashboard (Charts & KPIs) */}
          {activeTab === "dashboard" && (
            <motion.div
              id="admin-tab-dashboard"
              key="tab-dashboard-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div>
                <h3 className="font-sans font-black text-lg text-zinc-800 dark:text-white">Genel Durum ve Analitikler</h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Guard sitemizin satış performansını, popüler ürünleri ve finansal verileri buradan takip edebilirsiniz.</p>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 dark:from-indigo-950/20 dark:to-indigo-900/10 p-5 rounded-2xl border border-indigo-150 dark:border-indigo-900/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase">TOPLAM CİRO</span>
                    <h4 className="font-sans font-black text-2xl text-zinc-800 dark:text-white font-mono mt-1">
                      {claims.reduce((sum, c) => {
                        const p = products.find(prod => prod.id === c.productId);
                        return sum + (p ? p.price : 0);
                      }, 0).toLocaleString("tr-TR", { minimumFractionDigits: 1 })} TL
                    </h4>
                  </div>
                  <div className="w-10 h-10 bg-indigo-500/20 dark:bg-indigo-950 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 dark:from-emerald-950/20 dark:to-emerald-900/10 p-5 rounded-2xl border border-emerald-150 dark:border-emerald-900/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">DOĞRULANAN TESLİMATLAR</span>
                    <h4 className="font-sans font-black text-2xl text-zinc-800 dark:text-white mt-1">
                      {claims.length} Adet
                    </h4>
                  </div>
                  <div className="w-10 h-10 bg-emerald-500/20 dark:bg-emerald-950 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 dark:from-purple-950/20 dark:to-purple-900/10 p-5 rounded-2xl border border-purple-150 dark:border-purple-900/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-purple-600 dark:text-purple-400 uppercase">YAYINDAKİ İLANLAR</span>
                    <h4 className="font-sans font-black text-2xl text-zinc-800 dark:text-white mt-1">
                      {products.length} Ürün
                    </h4>
                  </div>
                  <div className="w-10 h-10 bg-purple-500/20 dark:bg-purple-950 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Package className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 dark:from-amber-950/20 dark:to-amber-900/10 p-5 rounded-2xl border border-amber-150 dark:border-amber-900/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-amber-600 dark:text-amber-400 uppercase">MÜŞTERİ YORUMLARI</span>
                    <h4 className="font-sans font-black text-2xl text-zinc-800 dark:text-white mt-1">
                      {comments.length} Yorum
                    </h4>
                  </div>
                  <div className="w-10 h-10 bg-amber-500/20 dark:bg-amber-950 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Sales & Revenue Trend Chart */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div>
                    <h4 className="font-sans font-bold text-sm text-zinc-800 dark:text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-500" />
                      Son 7 Günlük Satış Trendi (Ciro)
                    </h4>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Günlük tamamlanan teslimatlardan elde edilen gelir akışı.</p>
                  </div>
                  <div className="h-72 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getSalesTrendData()} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCiro" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-100 dark:stroke-zinc-800/50" />
                        <XAxis dataKey="Tarih" stroke="#888888" fontSize={11} tickLine={false} />
                        <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#fff", borderRadius: "12px" }} />
                        <Legend />
                        <Area type="monotone" dataKey="Ciro (TL)" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCiro)" />
                        <Area type="monotone" dataKey="Satış Adedi" stroke="#10b981" strokeWidth={1.5} fillOpacity={0} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Popular Listings Bar Chart */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div>
                    <h4 className="font-sans font-bold text-sm text-zinc-800 dark:text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-500" />
                      En Popüler İlanlar (Top 5)
                    </h4>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Kullanıcılar tarafından en çok doğrulanan/teslim alınan ürünler.</p>
                  </div>
                  <div className="h-72 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getPopularListingsData()} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-100 dark:stroke-zinc-800/50" />
                        <XAxis dataKey="Ürün" stroke="#888888" fontSize={10} tickLine={false} />
                        <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#fff", borderRadius: "12px" }} />
                        <Legend />
                        <Bar dataKey="Satış Adedi" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Toplam Gelir (TL)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 1: Products */}
          {activeTab === "products" && (
            <motion.div
              id="admin-tab-products"
              key="tab-products-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div>
                <h3 className="font-sans font-black text-lg text-zinc-800 dark:text-white">Ürün Ekleme ve Mağaza Yönetimi</h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Sitenizde listelenecek bypass hilelerini veya e-pin ürünlerini bu ekrandan ekleyin.</p>
              </div>

              {/* Add Product Form */}
              <form id="add-product-form" onSubmit={handleAddProduct} className="bg-zinc-50 dark:bg-zinc-950/40 p-6 rounded-3xl border border-zinc-150 dark:border-zinc-800/80 space-y-6">
                
                {/* Step Progress Tabs */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-6">
                    <button
                      type="button"
                      onClick={() => setFormStep(1)}
                      className={`flex items-center gap-2.5 pb-2 transition-all border-b-2 font-sans font-extrabold text-xs tracking-wider uppercase cursor-pointer ${
                        formStep === 1
                          ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                          : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${
                        formStep === 1 ? "bg-indigo-600 text-white" : "bg-zinc-250 dark:bg-zinc-800 text-zinc-650"
                      }`}>1</div>
                      Genel Ürün Bilgileri
                    </button>
                    <div className="hidden sm:block w-8 h-[1px] bg-zinc-200 dark:bg-zinc-800" />
                    <button
                      type="button"
                      onClick={() => setFormStep(2)}
                      className={`flex items-center gap-2.5 pb-2 transition-all border-b-2 font-sans font-extrabold text-xs tracking-wider uppercase cursor-pointer ${
                        formStep === 2
                          ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                          : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${
                        formStep === 2 ? "bg-indigo-600 text-white" : "bg-zinc-250 dark:bg-zinc-800 text-zinc-650"
                      }`}>2</div>
                      Teslimat ve Dosya İçeriği
                    </button>
                  </div>
                  {productSuccessMsg && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold bg-emerald-500/10 px-3 py-1 rounded-lg animate-pulse">
                      <Check className="w-3.5 h-3.5" />
                      <span>{productSuccessMsg}</span>
                    </div>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {formStep === 1 ? (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-5"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block mb-1">ÜRÜN ADI</label>
                          <input
                            id="p-name-input"
                            type="text"
                            required
                            value={pName}
                            onChange={(e) => setPName(e.target.value)}
                            placeholder="Örn: Pubg VIP ESP Cheat"
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-zinc-850 dark:text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block mb-1">KATEGORİ</label>
                          <select
                            id="p-category-select"
                            value={pCategory}
                            onChange={(e) => setPCategory(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-zinc-850 dark:text-white outline-none"
                          >
                            {Array.from(new Set([
                              "Bypass / Hack",
                              "Mobil Hile",
                              "E-Pin / Hesap",
                              "GTA Mod Menü",
                              "Premium APK",
                              ...categories.map(c => c.name)
                            ])).map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block mb-1">SATIŞ FİYATI (TL)</label>
                          <input
                            id="p-price-input"
                            type="number"
                            step="0.01"
                            required
                            value={pPrice}
                            onChange={(e) => setPPrice(e.target.value)}
                            placeholder="Örn: 150"
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-zinc-850 dark:text-white outline-none font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block mb-1">STOK DURUMU</label>
                          <select
                            id="p-stock-select"
                            value={pStockStatus}
                            onChange={(e) => setPStockStatus(e.target.value as "var" | "yok")}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-zinc-850 dark:text-white outline-none font-bold"
                          >
                            <option value="var" className="text-emerald-500">Stokta Var</option>
                            <option value="yok" className="text-rose-500">Stokta Yok</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block mb-1">ÖDEME İLAN LİNKİ (ITEMSATİŞ)</label>
                          <input
                            id="p-itemsatis-input"
                            type="url"
                            required
                            value={pItemSatisUrl}
                            onChange={(e) => setPItemSatisUrl(e.target.value)}
                            placeholder="Örn: https://www.itemsatis.com/p/..."
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-zinc-850 dark:text-white outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block mb-1">ÜRÜN GÖRSEL URL'Sİ (RESİM LİNKİ)</label>
                          <input
                            id="p-image-input"
                            type="url"
                            value={pImageUrl}
                            onChange={(e) => setPImageUrl(e.target.value)}
                            placeholder="Görsel linki yapıştırın (Örn: https://images.unsplash.com/...)"
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-zinc-850 dark:text-white outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">ÜRÜN AÇIKLAMASI</label>
                          <button
                            id="ai-generate-desc-btn"
                            type="button"
                            onClick={generateAiDescription}
                            disabled={isGeneratingAi || !pName}
                            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {isGeneratingAi ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Açıklama Üretiliyor...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3 text-yellow-500" />
                                AI ile Açıklama Yaz
                              </>
                            )}
                          </button>
                        </div>
                        {aiError && <p className="text-[10px] text-rose-500 mb-1">{aiError}</p>}
                        <textarea
                          id="p-desc-textarea"
                          required
                          rows={4}
                          value={pDescription}
                          onChange={(e) => setPDescription(e.target.value)}
                          placeholder="Ürün ayrıntılarını girin veya AI butonuna tıklayın..."
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-xs text-zinc-850 dark:text-white placeholder-zinc-400 outline-none resize-none"
                        />
                      </div>

                      <div className="pt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setFormStep(2)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold py-2.5 px-6 rounded-xl transition duration-150 cursor-pointer shadow-md text-xs flex items-center gap-1.5"
                        >
                          Sonraki Adım: Teslimat Bilgileri
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-5"
                    >
                      <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-150 dark:border-zinc-800 space-y-4">
                        <span className="text-xs font-black text-zinc-800 dark:text-white uppercase tracking-wider block border-b border-zinc-100 dark:border-zinc-800 pb-2">
                          Premium Teslimat İçeriği
                        </span>

                        <div>
                          <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block mb-1">TESLİMAT TÜRÜ</label>
                          <select
                            id="p-delivery-type-select"
                            value={pDelivType}
                            onChange={(e) => setPDelivType(e.target.value as "file" | "text" | "both")}
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-zinc-800 dark:text-white outline-none font-bold"
                          >
                            <option value="both">Tümü (Dosya + Öğretici Video + Metin)</option>
                            <option value="file">Sadece Dosya İndirme Linki (APK veya ZIP)</option>
                            <option value="text">Sadece Metin / Lisans / Hesap Bilgisi</option>
                          </select>
                        </div>

                        {pDelivType !== "text" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block mb-1">APK İNDİRME URL</label>
                              <input
                                id="p-apk-input"
                                type="url"
                                value={pApkUrl}
                                onChange={(e) => setPApkUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-zinc-800 dark:text-white outline-none font-mono"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block mb-1">ZIP İNDİRME URL</label>
                              <input
                                id="p-zip-input"
                                type="url"
                                value={pZipUrl}
                                onChange={(e) => setPZipUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-zinc-800 dark:text-white outline-none font-mono"
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block mb-1">KURULUM / ANLATIM VİDEOSU URL</label>
                          <input
                            id="p-video-input"
                            type="url"
                            value={pVideoUrl}
                            onChange={(e) => setPVideoUrl(e.target.value)}
                            placeholder="Örn: YouTube veya Drive izleme linki..."
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-zinc-800 dark:text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block mb-1">TALİMAT METNİ / DETAYLAR / HESAP BİLGİLERİ</label>
                          <textarea
                            id="p-text-input"
                            rows={4}
                            value={pTextContent}
                            onChange={(e) => setPTextContent(e.target.value)}
                            placeholder="Kullanıcıya teslim edilecek metin içeriği..."
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-xs text-zinc-800 dark:text-white placeholder-zinc-400 outline-none resize-none font-mono"
                          />
                        </div>
                      </div>

                      <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-between">
                        <button
                          type="button"
                          onClick={() => setFormStep(1)}
                          className="bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-sans font-bold py-2.5 px-6 rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          Önceki Adım: Genel Bilgiler
                        </button>

                        <div className="flex gap-3">
                          {editingProductId && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProductId(null);
                                setFormStep(1);
                                setPName("");
                                setPCategory("Bypass / Hack");
                                setPDescription("");
                                setPImageUrl("");
                                setPItemSatisUrl("");
                                setPPrice("");
                                setPStockStatus("var");
                                setPDelivType("both");
                                setPApkUrl("");
                                setPZipUrl("");
                                setPVideoUrl("");
                                setPTextContent("");
                              }}
                              className="bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-sans font-bold py-2.5 px-6 rounded-xl transition duration-150 cursor-pointer text-xs flex items-center gap-1.5"
                            >
                              İptal
                            </button>
                          )}
                          <button
                            id="save-product-btn"
                            type="submit"
                            className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold py-2.5 px-6 rounded-xl transition duration-150 cursor-pointer shadow-md text-xs flex items-center justify-center gap-2"
                          >
                            {editingProductId ? <><Edit3 className="w-4 h-4" /> Ürünü Güncelle</> : <><Plus className="w-4 h-4" /> Kaydet ve Yayınla</>}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </form>

              {/* Products Table to manage Price & Stock easily */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-sans font-extrabold text-sm text-zinc-800 dark:text-white block">Mevcut Ürünler ve Kolay Yönetim</span>
                  {products.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeleteAllProducts}
                      className="px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-600/20 rounded-xl text-[10px] font-bold tracking-wider uppercase transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Tüm İlanları Kaldır
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto bg-zinc-50 dark:bg-zinc-950/20 rounded-2xl border border-zinc-250 dark:border-zinc-800">
                  <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-left text-xs">
                    <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-500">
                      <tr>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Görsel & Ürün Adı</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Kategori</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Fiyat (TL)</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Stok</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {products.map((p) => (
                        <tr id={`admin-row-p-${p.id}`} key={p.id}>
                          <td className="px-4 py-3 flex items-center gap-3">
                            <img src={p.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                            <span className="font-bold text-zinc-800 dark:text-white">{p.name}</span>
                          </td>
                          <td className="px-4 py-3">{p.category}</td>
                          <td className="px-4 py-3">
                            <input
                              id={`price-edit-${p.id}`}
                              type="number"
                              defaultValue={p.price}
                              onBlur={(e) => handleUpdatePrice(p.id, e.target.value)}
                              className="w-20 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-700 rounded px-2 py-1 text-xs font-mono font-bold"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <button
                              id={`stock-toggle-${p.id}`}
                              onClick={() => toggleStockStatus(p.id, p.stockStatus)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[10px] transition cursor-pointer ${
                                p.stockStatus === "var"
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                                  : "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400"
                              }`}
                            >
                              {p.stockStatus === "var" ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4 text-rose-400" />}
                              {p.stockStatus === "var" ? "Var (Aktif)" : "Yok (Kapalı)"}
                            </button>
                          </td>
                          <td className="px-4 py-3 flex items-center gap-1">
                            <button
                              onClick={() => handleEditProductClick(p)}
                              className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-lg transition cursor-pointer"
                              title="Ürünü Düzenle"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              id={`delete-product-btn-${p.id}`}
                              onClick={() => handleDeleteProduct(p.id, p.firestoreId)}
                              className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg transition cursor-pointer"
                              title="Ürünü Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Category Management Subsection */}
              <div className="bg-zinc-50 dark:bg-zinc-950/40 p-6 rounded-3xl border border-zinc-150 dark:border-zinc-800/80 space-y-4">
                <div>
                  <h4 className="font-sans font-extrabold text-sm text-zinc-800 dark:text-white">Kategori Yönetimi</h4>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">Yeni kategoriler oluşturun veya mevcut özel kategorileri düzenleyin.</p>
                </div>
                <form onSubmit={handleAddCategory} className="flex gap-3 max-w-md">
                  <input
                    type="text"
                    required
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Örn: Bypass / Hack"
                    className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-xs text-zinc-800 dark:text-white outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold px-4 py-2 rounded-xl transition duration-150 cursor-pointer text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/10"
                  >
                    <Plus className="w-4 h-4" /> Kategori Ekle
                  </button>
                </form>
                {categorySuccessMsg && (
                  <p className="text-xs text-emerald-500 font-bold">{categorySuccessMsg}</p>
                )}
                
                <div className="flex flex-wrap gap-2 pt-2">
                  {/* Default / Core system categories */}
                  {["Bypass / Hack", "Mobil Hile", "E-Pin / Hesap", "GTA Mod Menü", "Premium APK"].map((cat) => (
                    <div key={cat} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-200/50 dark:bg-zinc-900 border border-zinc-300/40 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                      <span>{cat}</span>
                      <span className="text-[10px] text-zinc-400 font-mono tracking-tight">(Sistem)</span>
                    </div>
                  ))}
                  {/* Custom user-defined categories */}
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/50 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      <span>{cat.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="p-0.5 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-500 rounded transition cursor-pointer"
                        title="Kategoriyi Sil"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: Stock Codes */}
          {activeTab === "codes" && (
            <motion.div
              id="admin-tab-codes"
              key="tab-codes-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div>
                <h3 className="font-sans font-black text-lg text-zinc-800 dark:text-white">Doğrulama ve Stok Kodları Yükle</h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Müşterilerin ItemSatış'tan aldıktan sonra sitemizde doğrulayabileceği stok kodlarını buraya girin.</p>
              </div>

              <form id="add-stock-codes-form" onSubmit={handleAddStockCodes} className="bg-zinc-50 dark:bg-zinc-950/40 p-6 rounded-3xl border border-zinc-150 dark:border-zinc-800/80 space-y-4 max-w-xl">
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block mb-1">STOK KODU HANGİ ÜRÜNE BAĞLANACAK?</label>
                  <select
                    id="code-product-select"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-zinc-800 dark:text-white outline-none"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block mb-1">STOK KODLARI (VİRGÜLLE AYIRIN)</label>
                  <textarea
                    id="raw-codes-textarea"
                    required
                    rows={4}
                    value={rawCodes}
                    onChange={(e) => setRawCodes(e.target.value)}
                    placeholder="Örn: STOK-KGB-100, STOK-KGB-101, STOK-KGB-102"
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-xs text-zinc-800 dark:text-white placeholder-zinc-400 outline-none font-mono resize-none"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">İstediğiniz kadar kodu virgülle ayırarak tek seferde yükleyebilirsiniz.</p>
                </div>

                {codesSuccessMsg && (
                  <p className="text-xs text-emerald-500 font-bold">{codesSuccessMsg}</p>
                )}

                <button
                  id="submit-stock-codes-btn"
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-xs px-5 py-2.5 rounded-xl transition duration-150 cursor-pointer shadow-md"
                >
                  Kodları Sisteme Yükle
                </button>
              </form>

              {/* Codes Listing table */}
              <div className="space-y-4">
                <span className="font-sans font-extrabold text-sm text-zinc-800 dark:text-white block">Sistemdeki Aktif ve Kullanılan Kodlar</span>
                <div className="overflow-x-auto bg-zinc-50 dark:bg-zinc-950/20 rounded-2xl border border-zinc-250 dark:border-zinc-800">
                  <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-left text-xs">
                    <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-500">
                      <tr>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Kod</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Bağlı Ürün</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Durum</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Doğrulayan Müşteri</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {stockCodes.map((sc) => {
                        const linkedProd = products.find((p) => p.id === sc.productId);
                        return (
                          <tr id={`admin-row-sc-${sc.id}`} key={sc.id}>
                            <td className="px-4 py-3 font-mono font-semibold text-zinc-800 dark:text-white">{sc.code}</td>
                            <td className="px-4 py-3">{linkedProd?.name || "Bilinmeyen Ürün"}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sc.used ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400" : "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"}`}>
                                {sc.used ? "Kullanıldı" : "Aktif (Bekliyor)"}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-[10px]">{sc.usedBy || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: Notifications */}
          {activeTab === "notifications" && (
            <motion.div
              id="admin-tab-notifications"
              key="tab-notifications-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div>
                <h3 className="font-sans font-black text-lg text-zinc-800 dark:text-white">Genel Sistem Bildirimi Gönder</h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Sitedeki tüm kullanıcılara veya aktif alıcılara anında bildirim gönderin.</p>
              </div>

              <form id="broadcast-notif-form" onSubmit={handleBroadcastNotification} className="bg-zinc-50 dark:bg-zinc-950/40 p-6 rounded-3xl border border-zinc-150 dark:border-zinc-800/80 space-y-4 max-w-xl">
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block mb-1">BİLDİRİM BAŞLIĞI</label>
                  <input
                    id="notif-title-input"
                    type="text"
                    required
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="Örn: Bypass Yaması Güncellendi!"
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-xs text-zinc-800 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block mb-1">BİLDİRİM METNİ / MESAJI</label>
                  <textarea
                    id="notif-msg-textarea"
                    required
                    rows={3}
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                    placeholder="Bildirim içeriğini buraya yazın..."
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-xs text-zinc-800 dark:text-white placeholder-zinc-400 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block mb-1">BİLDİRİM TÜRÜ / RENGİ</label>
                  <select
                    id="notif-type-select"
                    value={notifType}
                    onChange={(e) => setNotifType(e.target.value as "info" | "success" | "alert")}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-xs text-zinc-800 dark:text-white outline-none"
                  >
                    <option value="info">Mavi Bilgilendirme (Info)</option>
                    <option value="success">Yeşil Başarı (Success)</option>
                    <option value="alert">Kırmızı Kritik Uyarı (Alert)</option>
                  </select>
                </div>

                {notifSuccessMsg && (
                  <p className="text-xs text-emerald-500 font-bold">{notifSuccessMsg}</p>
                )}

                <button
                  id="broadcast-notif-btn"
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-xs px-5 py-2.5 rounded-xl transition duration-150 cursor-pointer shadow-md"
                >
                  Bildirimi Tüm Sitede Yayınla
                </button>
              </form>
            </motion.div>
          )}

          {/* TAB 4: Claims */}
          {activeTab === "claims" && (
            <motion.div
              id="admin-tab-claims"
              key="tab-claims-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="font-sans font-black text-lg text-zinc-800 dark:text-white">Başarıyla Doğrulanan ve Açılan Teslimatlar</h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Müşterilerin ödemeleri ve teslim edilen ürünler listesi.</p>
              </div>

              <div className="overflow-x-auto bg-zinc-50 dark:bg-zinc-950/20 rounded-2xl border border-zinc-250 dark:border-zinc-800">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-left text-xs">
                  <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Müşteri (Banka İsim)</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Ürün</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Kod / Durum</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Dekont Görseli</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Tarih</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                    {claims.map((c) => (
                      <tr id={`admin-row-claim-${c.id}`} key={c.id}>
                        <td className="px-4 py-3">
                          <p className="font-bold text-zinc-800 dark:text-white">{c.customerName || "Bilinmeyen"}</p>
                          <p className="font-mono text-[9px] text-zinc-400">{c.userEmail}</p>
                        </td>
                        <td className="px-4 py-3 font-bold text-zinc-800 dark:text-white">{c.productName}</td>
                        <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {c.stockCode === "MANUAL_PENDING" ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-md text-[10px]">Onay Bekliyor</span>
                          ) : (
                            c.stockCode
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {c.receiptImage ? (
                            <a
                              href={`data:image/png;base64,${c.receiptImage}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold rounded-lg hover:underline"
                            >
                              Dekont Gör
                            </a>
                          ) : (
                            <span className="text-[10px] text-zinc-400 italic">Yok</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{new Date(c.claimedAt).toLocaleString("tr-TR")}</td>
                        <td className="px-4 py-3 text-right">
                          {c.stockCode === "MANUAL_PENDING" ? (
                            <button
                              onClick={async () => {
                                const newCode = "PAPARA-" + (c.customerName?.toUpperCase().replace(/\s+/g, "_") || "MANUAL") + "-" + Math.floor(1000 + Math.random() * 9000);
                                await updateDoc(doc(db, "claims", c.id), {
                                  stockCode: newCode,
                                  status: 'approved'
                                });
                                await addDoc(collection(db, "notifications"), {
                                  id: "notif-" + Date.now(),
                                  userId: c.userId,
                                  title: "Papara Ödemeniz Onaylandı!",
                                  message: `'${c.productName}' adlı ürün için yaptığınız ödeme yöneticiler tarafından onaylandı. Teslimatınız sağlandı.`,
                                  type: "success",
                                  createdAt: Date.now(),
                                  readBy: []
                                });
                              }}
                              className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold shadow-md hover:bg-indigo-700 cursor-pointer"
                            >
                              Onayla
                            </button>
                          ) : (
                            <span className="text-[10px] text-zinc-400">Tamamlandı</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* TAB 5: Comments */}
          {activeTab === "comments" && (
            <motion.div
              id="admin-tab-comments"
              key="tab-comments-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="font-sans font-black text-lg text-zinc-800 dark:text-white">Müşteri Değerlendirmeleri ve Yorum Yönetimi</h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Alıcıların ilanlara yaptığı 10 üzerinden değerlendirme yorumlarını takip edip düzenleyin.</p>
              </div>

              <div className="overflow-x-auto bg-zinc-50 dark:bg-zinc-950/20 rounded-2xl border border-zinc-250 dark:border-zinc-800">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-left text-xs">
                  <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Yorumcu</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Ürün</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Puan</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Yorum</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                    {comments.map((c) => {
                      const prod = products.find((p) => p.id === c.productId);
                      return (
                        <tr id={`admin-row-comm-${c.id}`} key={c.id}>
                          <td className="px-4 py-3 font-mono text-[11px]">{c.userEmail}</td>
                          <td className="px-4 py-3 font-bold">{prod?.name || "Silinmiş Ürün"}</td>
                          <td className="px-4 py-3 font-bold text-amber-500">{c.rating} / 10</td>
                          <td className="px-4 py-3 italic break-all max-w-[250px]">"{c.comment}"</td>
                          <td className="px-4 py-3">
                            <button
                              id={`delete-comment-btn-${c.id}`}
                              onClick={() => handleDeleteComment(c.id)}
                              className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded transition cursor-pointer"
                              title="Yorumu Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* TAB 7: Support Requests */}
          {activeTab === "support" && (
            <motion.div
              id="admin-tab-support"
              key="tab-support-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div>
                <h3 className="font-sans font-black text-lg text-zinc-800 dark:text-white">Gelen Destek Talepleri</h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Müşterilerin şikayet ve destek bildirimlerini buradan inceleyip durumunu güncelleyebilirsiniz.</p>
              </div>

              {supportRequests.length === 0 ? (
                <div className="bg-zinc-50 dark:bg-zinc-950/20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl py-12 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                  Henüz bir destek talebi bulunmuyor.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {supportRequests.map((req) => (
                    <div
                      id={`support-card-${req.id}`}
                      key={req.id}
                      className={`p-5 rounded-3xl border transition duration-150 ${
                        req.status === "cozuldu"
                          ? "bg-zinc-50/50 dark:bg-zinc-950/10 border-zinc-200 dark:border-zinc-850 opacity-75"
                          : "bg-amber-500/5 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-900/40"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-sans font-extrabold text-sm text-zinc-800 dark:text-white">{req.name}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            req.status === "cozuldu"
                              ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                          }`}>
                            {req.status === "cozuldu" ? "Çözüldü" : "Bekliyor"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(req.createdAt).toLocaleString("tr-TR")}
                        </div>
                      </div>

                      <div className="bg-white/50 dark:bg-zinc-900/60 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 mb-4 whitespace-pre-wrap">
                        {req.message}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-4 text-xs font-semibold text-zinc-500">
                          <span className="flex items-center gap-1.5">
                            <span className="text-[10px] text-zinc-400 uppercase font-bold">TELEFON:</span>
                            <a href={`tel:${req.phone}`} className="hover:underline text-indigo-600 dark:text-indigo-400 font-mono">{req.phone}</a>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleResolveSupport(req.id, req.status)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              req.status === "cozuldu"
                                ? "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/10"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            {req.status === "cozuldu" ? "Tekrar Aç" : "Çözüldü"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSupport(req.id)}
                            className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl transition cursor-pointer"
                            title="Talebi Sil"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 8: Registered Users */}
          {activeTab === "users" && (
            <motion.div
              id="admin-tab-users"
              key="tab-users-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div>
                <h3 className="font-sans font-black text-lg text-zinc-800 dark:text-white">Kayıtlı Müşteriler</h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Sisteme kayıtlı kullanıcıların banka isimlerini ve e-postalarını buradan görebilirsiniz.</p>
              </div>

              {usersList.length === 0 ? (
                <div className="bg-zinc-50 dark:bg-zinc-950/20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl py-12 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                  Sistemde kayıtlı müşteri bulunmuyor.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {usersList.map((usr) => (
                    <div
                      key={usr.uid}
                      className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-black text-xl flex-shrink-0">
                          {usr.bankFullName ? usr.bankFullName.charAt(0).toUpperCase() : "?"}
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="font-sans font-bold text-sm text-zinc-800 dark:text-white truncate">
                            {usr.bankFullName || "İsim Yok"}
                          </h4>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 truncate font-mono">
                            {usr.email}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg text-[9px] font-bold uppercase tracking-wider">
                              {usr.role || 'MÜŞTERİ'}
                            </span>
                            <span className="text-[9px] text-zinc-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(usr.createdAt).toLocaleDateString("tr-TR")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
