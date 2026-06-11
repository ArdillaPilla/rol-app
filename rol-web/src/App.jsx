import { onAuthStateChanged } from "firebase/auth";
import React, { useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db, isFirebaseConfigured, missingFirebaseConfig } from "./firebase";
import { ensureUserProfile, getFriendlyFirebaseError } from "./auth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Sidebar from "./pages/Sidebar";

export default function App() {
  const [session, setSession] = useState({ loading: true, user: null, profile: null });
  const [error, setError] = useState("");
  const [theme, setTheme] = useState("light");
  const [activePage, setActivePage] = useState("dashboard");
  const profileUnsubscribe = useRef(null);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("theme");
    const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const currentTheme = storedTheme ?? preferredTheme;
    setTheme(currentTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  async function syncProfile(user) {
    try {
      const profile = await ensureUserProfile(user);
      console.log(profile)
      setError("");
      setSession({ loading: false, user, profile });
    } catch (err) {
      setError(getFriendlyFirebaseError(err));
      setSession({ loading: false, user, profile: null });
    }
  }

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setSession({ loading: false, user: null, profile: null });
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setError("");
      profileUnsubscribe.current?.();
      profileUnsubscribe.current = null;

      if (!user) {
        setSession({ loading: false, user: null, profile: null });
        return;
      }

      try {
        await ensureUserProfile(user);
      } catch (err) {
        setError(getFriendlyFirebaseError(err));
        setSession({ loading: false, user, profile: null });
        return;
      }

      const userRef = doc(db, "users", user.uid);
      profileUnsubscribe.current = onSnapshot(
        userRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            setSession({ loading: false, user, profile: null });
            return;
          }

          setError("");
          setSession({ loading: false, user, profile: { id: snapshot.id, ...snapshot.data() } });
        },
        (err) => {
          setError(getFriendlyFirebaseError(err));
          setSession({ loading: false, user, profile: null });
        }
      );
    });

    return () => {
      unsubscribe();
      profileUnsubscribe.current?.();
    };
  }, []);

  if (session.loading) {
    return <div className="loading-screen">Preparando la mesa...</div>;
  }

  if (!session.user) {
    return <Login error={error} missingFirebaseConfig={missingFirebaseConfig} />;
  }

  return (
    <div className="dashboard-layout">
      <Sidebar
        profile={session.profile}
        user={session.user}
        activePage={activePage}
        onNavigate={setActivePage}
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
      />
      <Dashboard
        user={session.user}
        profile={session.profile}
        error={error}
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
        onRetryProfile={() => syncProfile(session.user)}
        activePage={activePage}
      />
    </div>
  );
}
