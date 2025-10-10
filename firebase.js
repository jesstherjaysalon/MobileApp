// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database"; // Only import what you use
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCJ-fDTESYYArDEc65xV9VMO2_bxXfgihk",
  authDomain: "menroweb-d2b1e.firebaseapp.com",
  databaseURL: "https://menroweb-d2b1e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "menroweb-d2b1e",
  storageBucket: "menroweb-d2b1e.firebasestorage.app",
  messagingSenderId: "139974681461",
  appId: "1:139974681461:web:b562e6cb5984d4d2a0693c",
  measurementId: "G-J5S4ZEZTG5"
};

// Initialize Firebase
// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Initialize Realtime Database
export const db = getDatabase(app);