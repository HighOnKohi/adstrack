// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD4NDwSkrAa0Sb9rIR-_PGPag4JmaTOXog",
  authDomain: "adstrack-14f7b.firebaseapp.com",
  projectId: "adstrack-14f7b",
  storageBucket: "adstrack-14f7b.firebasestorage.app",
  messagingSenderId: "67178095226",
  appId: "1:67178095226:web:ed71cd1952bd863f2351c3",
  measurementId: "G-BPT1Z8PWJK"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);