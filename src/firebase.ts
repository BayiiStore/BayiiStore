import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

// Firebase credentials from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyDBc0fzCGrshPXyvgjCuMyRyeD2LdSLY08",
  authDomain: "gen-lang-client-0732593079.firebaseapp.com",
  projectId: "gen-lang-client-0732593079",
  appId: "1:1002549398328:web:038c7e975e7129090d4fcd",
  storageBucket: "gen-lang-client-0732593079.firebasestorage.app",
  messagingSenderId: "1002549398328"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID if applicable
export const db = initializeFirestore(app, {}, "ai-studio-c9224651-7975-4628-9bc5-ec8a587a5c3b");

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
