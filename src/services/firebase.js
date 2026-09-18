import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, child, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyD_ROaVGAbJep3gp4BgnBnyRceAxjtX2tw",
  authDomain: "aplikasi-pkh-tapin.firebaseapp.com",
  databaseURL: "https://aplikasi-pkh-tapin-default-rtdb.firebaseio.com",
  projectId: "aplikasi-pkh-tapin",
  storageBucket: "aplikasi-pkh-tapin.firebasestorage.app",
  messagingSenderId: "553098582321",
  appId: "1:553098582321:web:32d14598d98ed0c5c87810"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Simpan/Update data ke Firebase
export const saveToFirebase = async (path, data) => {
  try {
    await set(ref(db, path), data);
  } catch (error) {
    console.error("Firebase Save Error:", error);
  }
};

// Baca data sekali dari Firebase
export const getFromFirebase = async (path) => {
  try {
    const snapshot = await get(child(ref(db), path));
    if (snapshot.exists()) return snapshot.val();
    return null;
  } catch (error) {
    console.error("Firebase Get Error:", error);
    return null;
  }
};

// Realtime Listener (UI ter-update otomatis dalam 0ms saat data di Firebase berubah)
export const listenFirebase = (path, callback) => {
  const dbRef = ref(db, path);
  return onValue(dbRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  });
};