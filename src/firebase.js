import { getAnalytics } from 'firebase/analytics';
// src/firebase.js
import { initializeApp } from 'firebase/app';
// Import the functions you need from the SDKs you need
import {
  getAuth,
  GoogleAuthProvider,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
