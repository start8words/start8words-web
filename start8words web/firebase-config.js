// firebase-config.js

// 1. 引入 Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 【修正重點】：這裡補齊了所有需要用到的 Firestore 功能
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    getDocs, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. 你的 Firebase Config (請填回你自己的資料)
const firebaseConfig = {
  apiKey: "AIzaSyDBmCheQST0KAifH-VpmFnAbeE07lD_GTw",
  authDomain: "start8words-aaa91.firebaseapp.com",
  projectId: "start8words-aaa91",
  storageBucket: "start8words-aaa91.firebasestorage.app",
  messagingSenderId: "731313197468",
  appId: "1:731313197468:web:ed522a856068b130d93859",
  measurementId: "G-2DKLXVWNF6"
};

// 3. 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// 4. 導出所有功能 (這裡一定要包含 deleteDoc, query 等等)
export { 
    auth, 
    db, 
    provider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    getDocs, 
    deleteDoc 
};