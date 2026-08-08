import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyD7P0Y-aoTsVZTdC2qGQnDL7hkiu25jx40",
  authDomain: "katrexapp-83cde.firebaseapp.com",
  projectId: "katrexapp-83cde",
  storageBucket: "katrexapp-83cde.firebasestorage.app",
  messagingSenderId: "925831475855",
  appId: "1:925831475855:android:148dca70973afa9ca0f6fa",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, "us-central1");
export default app;
