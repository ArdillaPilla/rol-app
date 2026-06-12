import React, { useState } from "react";
import {
  Crown,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  Sun,
  UserRound,
  ChevronLeft,
  ChevronRight,
  Swords
} from "lucide-react";
import { logout } from "../auth";

const navItems = [
  {
    id: "dashboard",
    label: "Tablero",
    icon: LayoutDashboard,
  },
  {
    id: "board-config",
    label: "Config. mesa",
    icon: Settings,
    masterOnly: false,
  },
];

export default function Sidebar({
  profile,
  user,
  activePage,
  onNavigate,
  theme,
  onToggleTheme,
  collapsed,
  setCollapsed
}) {
  const isMaster = profile?.role === "master";

  return (
    <nav className={collapsed ? "sidebar sidebar--collapsed" : "sidebar"}>
      {/* Logo / Brand */}
      <div className="sidebar-brand">
        {!collapsed && (
          <div className="sidebar-brand-inner">
            <button 
            type="button"
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expandir" : "Colapsar"}
          >
            <Swords size={18} />
          </button>
            <span className="sidebar-brand-name">Mesa de Rol</span>
          </div>
        )}
        {collapsed && (
          <button 
            type="button"
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expandir" : "Colapsar"}
          >
            <Swords size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              type="button"
              className={isActive ? "sidebar-nav-item sidebar-nav-item--active" : "sidebar-nav-item"}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} className="sidebar-nav-icon" />
              {!collapsed && <span>{item.label}</span>}
              {isActive && !collapsed && <span className="sidebar-nav-dot" />}
            </button>
          );
        })}
      </div>

      {/* Bottom section: user + theme + logout */}
      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-nav-item sidebar-theme-btn"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Cambiar a claro" : "Cambiar a oscuro"}
        >
          {theme === "dark" ? <Sun size={18} className="sidebar-nav-icon" /> : <Moon size={18} className="sidebar-nav-icon" />}
          {!collapsed && <span>{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>}
        </button>

        <div className={collapsed ? "sidebar-user sidebar-user--collapsed" : "sidebar-user"}>
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              className="sidebar-avatar"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="sidebar-avatar sidebar-avatar--fallback">
              {isMaster ? <Crown size={14} /> : <UserRound size={14} />}
            </span>
          )}
          {!collapsed && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">
                {profile?.displayName ?? user?.displayName ?? "Jugador"}
              </span>
              <span className={isMaster ? "sidebar-user-role sidebar-user-role--master" : "sidebar-user-role"}>
                {isMaster ? "Master" : "Jugador"}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="sidebar-nav-item sidebar-logout-btn"
          onClick={logout}
          title="Cerrar sesión"
        >
          <LogOut size={18} className="sidebar-nav-icon" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </nav>
  );
}

