import React from "react";
import { Crown, LogOut, Package, Shield, Sparkles, UserRound } from "lucide-react";
import { logout } from "../auth";

const statLabels = {
  level: "Nivel",
  hp: "Vida",
  strength: "Fuerza",
  dexterity: "Destreza",
  constitution: "Constitucion",
  intelligence: "Inteligencia",
  wisdom: "Sabiduria",
  charisma: "Carisma"
};

export default function Dashboard({ user, profile, error }) {
  const isMaster = profile?.role === "master";
  const stats = profile?.stats ?? {};

  return (
    <main className="dashboard-page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Mesa de rol</p>
          <h1>{isMaster ? "Panel del Master" : "Ficha de jugador"}</h1>
        </div>
        <button className="ghost-button" type="button" onClick={logout} title="Cerrar sesion">
          <LogOut size={18} />
          Salir
        </button>
      </header>

      {error && <p className="error-message">{error}</p>}

      <section className="profile-summary">
        <img src={user.photoURL} alt="" className="avatar" referrerPolicy="no-referrer" />
        <div>
          <p className="profile-name">{profile?.displayName ?? user.displayName}</p>
          <p className="profile-email">{profile?.email ?? user.email}</p>
        </div>
        <span className={isMaster ? "role-badge master" : "role-badge"}>
          {isMaster ? <Crown size={16} /> : <UserRound size={16} />}
          {isMaster ? "Master" : "Jugador"}
        </span>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <Shield size={20} />
            <h2>Estadisticas base</h2>
          </div>
          <div className="stats-grid">
            {Object.entries(statLabels).map(([key, label]) => (
              <div className="stat-tile" key={key}>
                <span>{label}</span>
                <strong>{stats[key] ?? "-"}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <Package size={20} />
            <h2>Inventario</h2>
          </div>
          {profile?.inventory?.length ? (
            <ul className="inventory-list">
              {profile.inventory.map((item, index) => (
                <li key={`${item.name}-${index}`}>{item.name ?? item}</li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Todavia no hay objetos asignados.</p>
          )}
        </article>

        {isMaster && (
          <article className="panel master-panel">
            <div className="panel-heading">
              <Sparkles size={20} />
              <h2>Control del Master</h2>
            </div>
            <p>
              Rol detectado desde Firebase. En la siguiente tarea podemos listar jugadores y editar nivel,
              estadisticas e inventario desde aqui.
            </p>
          </article>
        )}
      </section>
    </main>
  );
}
