import { getAnalytics } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDRYowjkbCL2-fbqBN1-KimpbNxlqFnZsQ",
  authDomain: "counter-haid.firebaseapp.com",
  projectId: "counter-haid",
  storageBucket: "counter-haid.firebasestorage.app",
  messagingSenderId: "792373141120",
  appId: "1:792373141120:web:db3c7f9a7c440527439065",
  measurementId: "G-YTY4WJC0ZX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const auth = getAuth(app);

// ✅ This ensures the login stays across refreshes
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error('Error setting auth persistence:', err);
});

const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };
