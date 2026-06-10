import { onAuthStateChanged } from "firebase/auth";
import React, { useEffect, useState } from "react";
import { auth, isFirebaseConfigured, missingFirebaseConfig } from "./firebase";
import { ensureUserProfile, getFriendlyFirebaseError } from "./auth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const [session, setSession] = useState({ loading: true, user: null, profile: null });
  const [error, setError] = useState("");
  const [theme, setTheme] = useState("light");

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

      if (!user) {
        setSession({ loading: false, user: null, profile: null });
        return;
      }

      await syncProfile(user);
    });

    return unsubscribe;
  }, []);

  if (session.loading) {
    return <div className="loading-screen">Preparando la mesa...</div>;
  }

  if (!session.user) {
    return <Login error={error} missingFirebaseConfig={missingFirebaseConfig} />;
  }

  return (
    <Dashboard
      user={session.user}
      profile={session.profile}
      error={error}
      theme={theme}
      onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
      onRetryProfile={() => syncProfile(session.user)}
    />
  );
}
