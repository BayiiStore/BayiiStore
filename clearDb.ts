import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDBc0fzCGrshPXyvgjCuMyRyeD2LdSLY08",
  authDomain: "gen-lang-client-0732593079.firebaseapp.com",
  projectId: "gen-lang-client-0732593079",
  appId: "1:1002549398328:web:038c7e975e7129090d4fcd",
  storageBucket: "gen-lang-client-0732593079.firebasestorage.app",
  messagingSenderId: "1002549398328"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, "ai-studio-c9224651-7975-4628-9bc5-ec8a587a5c3b");

async function clear() {
  const cols = ["products", "stock_codes", "claims", "comments", "notifications"];
  for (const c of cols) {
    const snap = await getDocs(collection(db, c));
    for (const d of snap.docs) {
      await deleteDoc(doc(db, c, d.id));
    }
  }
  console.log("Cleared db");
  process.exit(0);
}
clear();
