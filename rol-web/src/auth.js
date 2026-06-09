import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, db, googleProvider } from "./firebase";

export const baseStats = {
  level: 1,
  hp: 10,
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10
};

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(result.user);
  return result.user;
}

export function logout() {
  return signOut(auth);
}

export async function ensureUserProfile(user) {
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
    await setDoc(userRef, sharedProfile, { merge: true });
    return { id: user.uid, ...snapshot.data(), ...sharedProfile };
  }

  const newProfile = {
    ...sharedProfile,
    role: "player",
    stats: baseStats,
    inventory: [],
    createdAt: serverTimestamp()
  };

  await setDoc(userRef, newProfile);
  return { id: user.uid, ...newProfile };
}

export async function getUserProfile(uid) {
  const snapshot = await getDoc(doc(db, "users", uid));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}
