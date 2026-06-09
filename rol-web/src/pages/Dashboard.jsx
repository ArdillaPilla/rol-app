import React, { useEffect, useMemo, useState } from "react";
import {
  Crown,
  LogOut,
  Minus,
  Package,
  Plus,
  RotateCw,
  Save,
  Shield,
  Sparkles,
  UserRound,
  Users
} from "lucide-react";
import {
  baseStats,
  getAllUserProfiles,
  getFriendlyFirebaseError,
  logout,
  updateUserProfile
} from "../auth";

const statLabels = {
  level: "Nivel",
  hp: "Vida",
  maxHp: "Vida max.",
  strength: "Fuerza",
  dexterity: "Destreza",
  constitution: "Constitucion",
  intelligence: "Inteligencia",
  wisdom: "Sabiduria",
  charisma: "Carisma"
};

function normalizeInventory(value) {
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? item : item.name)).filter(Boolean).join("\n");
  }

  return "";
}

function createEditorState(target) {
  return {
    role: target?.role ?? "player",
    stats: { ...baseStats, ...(target?.stats ?? {}) },
    inventoryText: normalizeInventory(target?.inventory)
  };
}

function getHealth(userProfile) {
  const hp = Number(userProfile?.stats?.hp ?? 0);
  const maxHp = Math.max(Number(userProfile?.stats?.maxHp ?? hp ?? 1), 1);
  return {
    hp,
    maxHp,
    percentage: Math.max(0, Math.min(100, (hp / maxHp) * 100))
  };
}

function formatLogDate(value) {
  const date = value?.toDate ? value.toDate() : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export default function Dashboard({ user, profile, error, onRetryProfile }) {
  const isMaster = profile?.role === "master";
  const stats = profile?.stats ?? {};
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(user.uid);
  const [tableError, setTableError] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const selectedUser = useMemo(
    () => users.find((tableUser) => tableUser.id === selectedUserId) ?? profile,
    [profile, selectedUserId, users]
  );
  const [editor, setEditor] = useState(() => createEditorState(selectedUser));

  async function loadUsers() {
    setIsLoadingUsers(true);
    setTableError("");

    try {
      const profiles = await getAllUserProfiles();
      setUsers(profiles);

      if (!profiles.some((tableUser) => tableUser.id === selectedUserId)) {
        setSelectedUserId(profiles[0]?.id ?? user.uid);
      }
    } catch (err) {
      setTableError(getFriendlyFirebaseError(err));
    } finally {
      setIsLoadingUsers(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    setEditor(createEditorState(selectedUser));
  }, [selectedUser?.id]);

  function updateStat(statKey, value) {
    setEditor((current) => ({
      ...current,
      stats: {
        ...current.stats,
        [statKey]: Number(value)
      }
    }));
  }

  async function handleSave() {
    if (!isMaster || !selectedUser) {
      return;
    }

    setIsSaving(true);
    setTableError("");

    try {
      const inventory = editor.inventoryText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);

      await updateUserProfile(selectedUser.id, {
        role: editor.role,
        stats: editor.stats,
        inventory
      });

      await loadUsers();
    } catch (err) {
      setTableError(getFriendlyFirebaseError(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleHealthChange(targetUser, amount) {
    if (!isMaster || !targetUser) {
      return;
    }

    const targetStats = { ...baseStats, ...(targetUser.stats ?? {}) };
    const currentHp = Number(targetStats.hp ?? 0);
    const maxHp = Math.max(Number(targetStats.maxHp ?? currentHp ?? 1), 1);
    const nextHp = Math.max(0, Math.min(maxHp, currentHp + amount));
    const realAmount = nextHp - currentHp;

    if (realAmount === 0) {
      return;
    }

    const healthLog = [
      {
        amount: realAmount,
        from: currentHp,
        to: nextHp,
        by: profile?.displayName ?? user.displayName ?? "Master",
        at: new Date().toISOString()
      },
      ...(targetUser.healthLog ?? [])
    ].slice(0, 10);

    setTableError("");

    try {
      await updateUserProfile(targetUser.id, {
        stats: {
          ...targetStats,
          hp: nextHp,
          maxHp
        },
        healthLog
      });

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === targetUser.id
            ? { ...currentUser, stats: { ...targetStats, hp: nextHp, maxHp }, healthLog }
            : currentUser
        )
      );

      if (targetUser.id === selectedUserId) {
        setEditor((current) => ({
          ...current,
          stats: {
            ...current.stats,
            hp: nextHp,
            maxHp
          }
        }));
      }
    } catch (err) {
      setTableError(getFriendlyFirebaseError(err));
    }
  }

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

      {error && (
        <section className="status-panel">
          <p className="error-message">{error}</p>
          <button className="ghost-button" type="button" onClick={onRetryProfile}>
            <RotateCw size={18} />
            Reintentar guardar perfil
          </button>
        </section>
      )}

      <section className="profile-summary">
        <img src={user.photoURL} alt="" className="avatar" referrerPolicy="no-referrer" />
        <div>
          <p className="profile-name">{profile?.displayName ?? user.displayName}</p>
        </div>
        <span className={isMaster ? "role-badge master" : "role-badge"}>
          {isMaster ? <Crown size={16} /> : <UserRound size={16} />}
          {isMaster ? "Master" : "Jugador"}
        </span>
      </section>

      <section className="table-layout">
        <div className="left-column">
          <article className="panel">
            <div className="panel-heading">
              <Shield size={20} />
              <h2>Tu ficha</h2>
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
              <h2>Tu inventario</h2>
            </div>
            {profile?.inventory?.length ? (
              <ul className="inventory-list">
                {profile.inventory.map((item, index) => (
                  <li key={`${item.name ?? item}-${index}`}>{item.name ?? item}</li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">Todavia no hay objetos asignados.</p>
            )}
          </article>
        </div>

        <aside className="right-column">
          <article className="panel roster-panel">
            <div className="panel-heading split-heading">
              <div>
                <div className="inline-heading">
                  <Users size={20} />
                  <h2>Jugadores</h2>
                </div>
                <p>{isMaster ? "Selecciona un usuario para editarlo." : "Vista general de la mesa."}</p>
              </div>
              <button className="icon-button" type="button" onClick={loadUsers} title="Actualizar jugadores">
                <RotateCw size={18} />
              </button>
            </div>

            {tableError && <p className="inline-error">{tableError}</p>}
            {isLoadingUsers && <p className="empty-state">Cargando jugadores...</p>}

            <div className="users-table" role="table" aria-label="Jugadores de la mesa">
              <div className={isMaster ? "users-row users-head master-health-row" : "users-row users-head"} role="row">
                <span>Jugador</span>
                <span>Vida</span>
                <span>Rol</span>
                {isMaster && <span>Acciones</span>}
              </div>
              {users.map((tableUser) => {
                const health = getHealth(tableUser);

                return (
                  <div
                    className={
                      tableUser.id === selectedUserId
                        ? "users-row health-user-row selected"
                        : "users-row health-user-row"
                    }
                    key={tableUser.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedUserId(tableUser.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        setSelectedUserId(tableUser.id);
                      }
                    }}
                  >
                    <span className="health-name">{tableUser.displayName ?? "Jugador"}</span>
                    <span className="health-cell">
                      <span className="health-meta">
                        {health.hp}/{health.maxHp}
                      </span>
                      <span className="health-bar" aria-hidden="true">
                        <span style={{ width: `${health.percentage}%` }} />
                      </span>
                    </span>
                    <span>{tableUser.role === "master" ? "Master" : "Player"}</span>
                    {isMaster && (
                      <span className="health-actions">
                        <button
                          className="health-button"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleHealthChange(tableUser, -1);
                          }}
                          title="Quitar vida"
                        >
                          <Minus size={14} />
                        </button>
                        <button
                          className="health-button"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleHealthChange(tableUser, 1);
                          }}
                          title="Poner vida"
                        >
                          <Plus size={14} />
                        </button>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <Shield size={20} />
              <h2>Log de vida</h2>
            </div>
            {selectedUser?.healthLog?.length ? (
              <ol className="health-log">
                {selectedUser.healthLog.slice(0, 10).map((entry, index) => (
                  <li key={`${entry.at}-${index}`}>
                    <span className={entry.amount > 0 ? "log-positive" : "log-negative"}>
                      {entry.amount > 0 ? "+" : ""}
                      {entry.amount}
                    </span>
                    <strong>
                      {entry.from} {"->"} {entry.to}
                    </strong>
                    <small>
                      {entry.by} {formatLogDate(entry.at)}
                    </small>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty-state">Todavia no hay cambios de vida.</p>
            )}
          </article>

          {selectedUser && (
            <article className={isMaster ? "panel editor-panel" : "panel editor-panel readonly"}>
              <div className="panel-heading">
                <Sparkles size={20} />
                <h2>{isMaster ? "Editar perfil" : "Perfil seleccionado"}</h2>
              </div>
              <p className="selected-name">{selectedUser.displayName ?? "Jugador"}</p>

              {isMaster ? (
                <>
                  <label className="field-label">
                    Rol
                    <select value={editor.role} onChange={(event) => setEditor({ ...editor, role: event.target.value })}>
                      <option value="player">Player</option>
                      <option value="master">Master</option>
                    </select>
                  </label>

                  <div className="editor-stats">
                    {Object.entries(statLabels).map(([key, label]) => (
                      <label className="field-label" key={key}>
                        {label}
                        <input
                          min="0"
                          type="number"
                          value={editor.stats[key] ?? 0}
                          onChange={(event) => updateStat(key, event.target.value)}
                        />
                      </label>
                    ))}
                  </div>

                  <label className="field-label">
                    Inventario
                    <textarea
                      rows="5"
                      value={editor.inventoryText}
                      onChange={(event) => setEditor({ ...editor, inventoryText: event.target.value })}
                      placeholder="Un objeto por linea"
                    />
                  </label>

                  <button className="primary-button" type="button" onClick={handleSave} disabled={isSaving}>
                    <Save size={18} />
                    {isSaving ? "Guardando..." : "Guardar cambios"}
                  </button>
                </>
              ) : (
                <div className="readonly-grid">
                  {Object.entries(statLabels).map(([key, label]) => (
                    <div className="readonly-stat" key={key}>
                      <span>{label}</span>
                      <strong>{selectedUser.stats?.[key] ?? "-"}</strong>
                    </div>
                  ))}
                </div>
              )}
            </article>
          )}
        </aside>
      </section>
    </main>
  );
}
