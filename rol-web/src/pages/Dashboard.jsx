import React, { useEffect, useMemo, useState } from "react";
import {
  Crown,
  LogOut,
  Minus,
  Moon,
  Package,
  Plus,
  RotateCw,
  Save,
  Shield,
  Sparkles,
  Sun,
  UserRound,
  Users,
  Heart,
  PenLine
} from "lucide-react";
import {
  baseStats,
  raceBonuses,
  getAllUserProfiles,
  getFriendlyFirebaseError,
  logout,
  updateUserProfile
} from "../auth";

const statLabels = {
  level: "Level",
  hp: "Vida",
  strength: "Fuerza",
  dexterity: "Destreza",
  constitution: "Constitucion",
  intelligence: "Inteligencia",
  wisdom: "Sabiduria",
  charisma: "Carisma"
};

const raceOptions = [
  { id: "Humano", label: "Humano" },
  { id: "Elfo", label: "Elfo" },
  { id: "Enano", label: "Enano" },
  { id: "Orco", label: "Orco" },
  { id: "Mediano", label: "Mediano" }
];

const abilityStats = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
const modifierValues = [3, 2, 1, 0, -1, -2];
const defaultAssignments = abilityStats.reduce(
  (acc, stat) => ({ ...acc, [stat]: null }),
  {}
);

function createCharacterStats(race, assignments) {
  const raceBonus = raceBonuses[race] ?? raceBonuses.Humano;
  const stats = abilityStats.reduce(
    (acc, stat) => ({
      ...acc,
      [stat]: baseStats[stat] + (raceBonus[stat] ?? 0) + Number(assignments[stat] ?? 0)
    }),
    {}
  );

  const constitution = stats.constitution;
  const hpFromCon = 10 + Math.floor((constitution - 10) / 2);
  const hp = Math.max(baseStats.hp, hpFromCon);

  return {
    ...baseStats,
    ...stats,
    hp,
    maxHp: hp
  };
}

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

export default function Dashboard({ user, profile, error, theme, onToggleTheme, onRetryProfile }) {
  const isMaster = profile?.role === "master";
  const stats = profile?.stats ?? {};
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(user.uid);
  const [tableError, setTableError] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(profile?.displayName ?? user.displayName);
  const isNewPlayer = profile?.characterCreated !== true;
  const [setupName, setSetupName] = useState(profile?.displayName ?? user.displayName ?? "");
  const [setupRace, setSetupRace] = useState(profile?.race ?? "Humano");
  const [setupModifiers, setSetupModifiers] = useState(() => ({ ...defaultAssignments }));
  const [setupError, setSetupError] = useState("");
  const [isSavingCharacter, setIsSavingCharacter] = useState(false);
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
    if (isNewPlayer) {
      setSetupName(profile?.displayName ?? user.displayName ?? "");
      setSetupRace(profile?.race ?? "Humano");
      setSetupModifiers({ ...defaultAssignments });
      setSetupError("");
    }
  }, [profile?.id, isNewPlayer, profile?.displayName, profile?.race, user.displayName]);

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

  const setupStats = React.useMemo(
    () => createCharacterStats(setupRace, setupModifiers),
    [setupRace, setupModifiers]
  );

  function setModifier(statKey, value) {
    setSetupModifiers((current) => ({
      ...current,
      [statKey]: current[statKey] === value ? null : Number(value)
    }));
  }

  async function handleCreateCharacter() {
    if (!setupName.trim()) {
      setSetupError("Debes indicar un nombre para tu personaje.");
      return;
    }

    setIsSavingCharacter(true);
    setSetupError("");

    try {
      await updateUserProfile(user.uid, {
        displayName: setupName.trim(),
        race: setupRace,
        stats: setupStats,
        characterCreated: true
      });

      if (typeof onRetryProfile === "function") {
        await onRetryProfile();
      }
    } catch (err) {
      setSetupError(getFriendlyFirebaseError(err));
    } finally {
      setIsSavingCharacter(false);
    }
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

      if (selectedUser.id === user.uid && typeof onRetryProfile === "function") {
        await onRetryProfile();
      }
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

      if (targetUser.id === user.uid && typeof onRetryProfile === "function") {
        await onRetryProfile();
      }
    } catch (err) {
      setTableError(getFriendlyFirebaseError(err));
    }
  }

  const saveName = async () => {
    await updateUserProfile(user.uid, {
      displayName: newName
    });

    setIsEditingName(false);
    if (typeof onRetryProfile === "function") {
      await onRetryProfile();
    }
  };

  if (isNewPlayer) {
    return (
      <main className="dashboard-page">
        <header className="topbar">
          <div>
            <p className="eyebrow">Primer registro</p>
            <h1>Crear tu personaje</h1>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button className="ghost-button" type="button" onClick={onToggleTheme} title="Cambiar tema">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              {theme === "dark" ? "Claro" : "Oscuro"}
            </button>
            <button className="ghost-button" type="button" onClick={logout} title="Cerrar sesion">
              <LogOut size={18} />
              Salir
            </button>
          </div>
        </header>

        {setupError && (
          <section className="status-panel">
            <p className="error-message">{setupError}</p>
          </section>
        )}

        <article className="panel">
          <div className="panel-heading">
            <Shield size={20} />
            <h2>Ficha inicial</h2>
          </div>

          <p>Elige el nombre, selecciona la raza y asigna los valores de tus capacidades.</p>

          <div className="field-label">
            <label htmlFor="setup-name">Nombre del personaje</label>
            <input
              id="setup-name"
              type="text"
              value={setupName}
              onChange={(event) => setSetupName(event.target.value)}
              placeholder="Ej. Aria, Borin, Lyra"
            />
          </div>

          <div className="field-label">
            <label htmlFor="setup-race">Raza</label>
            <select
              id="setup-race"
              value={setupRace}
              onChange={(event) => setSetupRace(event.target.value)}
            >
              {raceOptions.map((race) => (
                <option key={race.id} value={race.id}>
                  {race.label}
                </option>
              ))}
            </select>
          </div>

          <article className="panel editor-panel">
            <div className="panel-heading split-heading">
              <div className="inline-heading">
                <Sparkles size={20} />
                <h2>Asignar stats</h2>
              </div>
              <p>Raza: {setupRace}</p>
            </div>

            <div className="stats-grid">
              {abilityStats.map((stat) => (
                <div className="stat-tile" key={stat}>
                  <span>{statLabels[stat]}</span>
                  <strong>{setupStats[stat]}</strong>
                  <div className="modifier-row">
                    {modifierValues.map((value) => {
                      const alreadyUsedByOther = Object.entries(setupModifiers).some(
                        ([otherStat, otherValue]) =>
                          otherStat !== stat && otherValue !== null && Number(otherValue) === value
                      );

                      return (
                        <button
                          key={`${stat}-${value}`}
                          type="button"
                          className={`modifier-button ${setupModifiers[stat] === value ? "selected" : ""}`}
                          onClick={() => setModifier(stat, value)}
                          disabled={alreadyUsedByOther}
                        >
                          {value > 0 ? `+${value}` : value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="stat-tile" style={{ gridColumn: "span 2" }}>
                <span>Vida base</span>
                <strong>{setupStats.hp}</strong>
              </div>
            </div>
          </article>

          <button
            type="button"
            className="primary-button"
            onClick={handleCreateCharacter}
            disabled={isSavingCharacter}
          >
            {isSavingCharacter ? "Guardando..." : "Finalizar ficha"}
          </button>
        </article>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Mesa de rol</p>
          <h1>{isMaster ? "Panel del Master" : "Ficha de jugador"}</h1>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button className="ghost-button" type="button" onClick={onToggleTheme} title="Cambiar tema">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            {theme === "dark" ? "Claro" : "Oscuro"}
          </button>
          <button className="ghost-button" type="button" onClick={logout} title="Cerrar sesion">
            <LogOut size={18} />
            Salir
          </button>
        </div>
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
          <div>
            <p className="profile-name">
              {isEditingName ? (
                <>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                  />

                  <button
                    type="button"
                    onClick={saveName}
                  >
                    Guardar
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  {console.log(profile)}
                  {console.log(user)}
                  {profile?.displayName}

                  <button
                    className="name-button"
                    type="button"
                    onClick={() => {
                      setNewName(profile?.displayName ?? user.displayName);
                      setIsEditingName(true);
                    }}
                    title="Cambiar nombre"
                  >
                    <PenLine size={11} />
                  </button>
                </>
              )}
            </p>
          </div>
          <strong className="player-number">
            Lv. {profile?.stats?.level ?? 1}
          </strong>
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
              <Heart size={20} />
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
