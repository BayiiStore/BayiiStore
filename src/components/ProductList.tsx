import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { Product, Category } from "../types";
import ProductCard from "./ProductCard";
import { Search, SlidersHorizontal, PackageOpen, Sparkles } from "lucide-react";

interface ProductListProps {
  currentUserId: string;
  currentUserEmail: string;
  loyaltyTier: "Bronz" | "Gümüş" | "Altın";
  tierDiscountPercent: number;
}

export default function ProductList({ 
  currentUserId, 
  currentUserEmail,
  loyaltyTier,
  tierDiscountPercent
}: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Hepsi");
  const [isLoading, setIsLoading] = useState(true);

  // Read products in real-time from Firestore
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Product[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Product);
        });
        setProducts(list);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error listening to products:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Read categories in real-time from Firestore
  useEffect(() => {
    const q = query(collection(db, "categories"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: string[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as Category;
          if (data && data.name) {
            list.push(data.name);
          }
        });
        setDbCategories(list);
      },
      (error) => {
        console.error("Error listening to categories:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Calculate unique categories from products, merging with database categories to guarantee consistency
  const uniqueFromProducts = Array.from(new Set(products.map((p) => p.category))) as string[];
  const allCategoryNames = Array.from(new Set([...dbCategories, ...uniqueFromProducts]));
  const categories: string[] = ["Hepsi", ...allCategoryNames];

  // Filter products based on search and selected category
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === "Hepsi" || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div id="product-list-container" className="py-8">
      {/* Filters and Search Bar */}
      <div id="filter-bar" className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8 bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-3xl border border-zinc-200/60 dark:border-zinc-800">
        <div className="relative w-full md:w-96">
          <input
            id="product-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="İlan ara, bypass veya hile bul..."
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl pl-11 pr-4 py-3 text-sm text-zinc-800 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
          <Search className="w-5 h-5 text-zinc-400 absolute left-4 top-3.5" />
        </div>

        {/* Categories Horizontal Scroll */}
        <div id="category-scroller" className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-none py-1">
          <SlidersHorizontal className="w-4 h-4 text-zinc-400 mr-2 flex-shrink-0 hidden md:block" />
          {categories.map((cat) => (
            <button
              id={`cat-pill-${cat.replace(/\s+/g, "-")}`}
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition flex-shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/15"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid or Loading/Empty state */}
      {isLoading ? (
        <div id="products-loading" className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-zinc-400">Ürünler yükleniyor...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div id="products-empty" className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-16 text-center shadow-sm">
          <div className="flex justify-center mb-4 text-zinc-300 dark:text-zinc-600">
            <PackageOpen className="w-16 h-16" />
          </div>
          <h4 className="font-sans font-bold text-zinc-800 dark:text-white text-lg mb-1">
            Aradığınız Ürün Bulunamadı
          </h4>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-sm mx-auto">
            Arama kriterlerinize veya seçilen kategoriye uygun aktif bir ilan bulunmuyor. Farklı kelimelerle tekrar arayabilirsiniz.
          </p>
        </div>
      ) : (
        <div id="products-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              currentUserId={currentUserId}
              currentUserEmail={currentUserEmail}
              loyaltyTier={loyaltyTier}
              tierDiscountPercent={tierDiscountPercent}
            />
          ))}
        </div>
      )}
    </div>
  );
}
