import { Chrome, ShieldCheck } from "lucide-react";
import React, { useState } from "react";
import { getFriendlyFirebaseError, signInWithGoogle } from "../auth";

export default function Login({ error, missingFirebaseConfig = [] }) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [localError, setLocalError] = useState("");

  async function handleGoogleLogin() {
    setIsSigningIn(true);
    setLocalError("");

    try {
      await signInWithGoogle();
    } catch (err) {
      setLocalError(getFriendlyFirebaseError(err));
      setIsSigningIn(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="brand-mark" aria-hidden="true">
          <ShieldCheck size={32} />
        </div>
        <p className="eyebrow">Mesa privada</p>
        <h1>Rol con tus companeros</h1>
        <p className="auth-copy">
          Entra con Google para crear tu perfil de jugador. El master se asigna desde Firebase.
        </p>

        <button className="primary-button" type="button" onClick={handleGoogleLogin} disabled={isSigningIn}>
          <Chrome size={20} />
          {isSigningIn ? "Conectando..." : "Entrar con Google"}
        </button>

        {missingFirebaseConfig.length > 0 && (
          <p className="warning-message">
            Faltan variables de Firebase en .env: {missingFirebaseConfig.join(", ")}
          </p>
        )}

        {(localError || error) && <p className="error-message">{localError || error}</p>}
      </section>
    </main>
  );
}
