import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, db, googleProvider } from "./firebase";

export const baseStats = {
  level: 1,
  hp: 10,
  maxHp: 10,
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10
};

export async function signInWithGoogle() {
  if (!auth || !googleProvider) {
    throw new Error("Firebase no esta configurado. Revisa las variables VITE_FIREBASE_*.");
  }

  const result = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(result.user);
  return result.user;
}

export function getFriendlyFirebaseError(error) {
  const message = error?.message ?? "";
  const code = error?.code ?? "";

  if (
    code === "unavailable" ||
    message.includes("client is offline") ||
    message.includes("ERR_BLOCKED_BY_CLIENT")
  ) {
    return "No puedo conectar con Firestore. Suele pasar si un bloqueador del navegador esta bloqueando firestore.googleapis.com. Prueba a desactivar extensiones de privacidad/adblock para esta pagina o abre la web en una ventana sin extensiones.";
  }

  if (code === "permission-denied" || message.includes("Missing or insufficient permissions")) {
    return "Firestore esta rechazando la lectura/escritura. Revisa que la base de datos exista y que las reglas esten publicadas.";
  }

  return message || "Ha ocurrido un error con Firebase.";
}

export function logout() {
  if (!auth) {
    return Promise.resolve();
  }

  return signOut(auth);
}

export async function ensureUserProfile(user) {
  if (!db) {
    throw new Error("Firestore no esta configurado. Revisa las variables VITE_FIREBASE_*.");
  }

  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);
  const sharedProfile = {
    uid: user.uid,
    displayName: user.displayName ?? "Jugador",
    email: user.email ?? "",
    photoURL: user.photoURL ?? "",
    updatedAt: serverTimestamp()
  };

  if (snapshot.exists()) {
    const data = snapshot.data();
    const completedProfile = {
      ...data,
      role: data.role ?? "player",
      stats: { ...baseStats, ...(data.stats ?? {}), maxHp: data.stats?.maxHp ?? data.stats?.hp ?? baseStats.maxHp },
      inventory: data.inventory ?? [],
      healthLog: data.healthLog ?? []
    };

    await setDoc(userRef, completedProfile, { merge: true });
    return { id: user.uid, ...completedProfile, ...sharedProfile };
  }

  const newProfile = {
    ...sharedProfile,
    role: "player",
    stats: baseStats,
    inventory: [],
    healthLog: [],
    createdAt: serverTimestamp()
  };

  await setDoc(userRef, newProfile);
  return { id: user.uid, ...newProfile };
}

export async function getUserProfile(uid) {
  if (!db) {
    throw new Error("Firestore no esta configurado. Revisa las variables VITE_FIREBASE_*.");
  }

  const snapshot = await getDoc(doc(db, "users", uid));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function getAllUserProfiles() {
  if (!db) {
    throw new Error("Firestore no esta configurado. Revisa las variables VITE_FIREBASE_*.");
  }

  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs
    .map((userDoc) => ({ id: userDoc.id, ...userDoc.data() }))
    .sort((a, b) => (a.displayName ?? "").localeCompare(b.displayName ?? ""));
}

export async function updateUserProfile(uid, updates) {
  if (!db) {
    throw new Error("Firestore no esta configurado. Revisa las variables VITE_FIREBASE_*.");
  }

  await setDoc(
    doc(db, "users", uid),
    {
      ...updates,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}
