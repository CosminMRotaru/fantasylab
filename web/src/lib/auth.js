const API = import.meta.env.VITE_API_BASE || "/api";

import { LS_KEYS } from "../constants/storageKeys.js";
const TOKEN_KEY = LS_KEYS.token;
const USER_KEY = LS_KEYS.user;

function ensureAuthMigration() {}
export function saveToken(t) {
  localStorage.setItem(TOKEN_KEY, t || "");
}
export function getToken() {
  ensureAuthMigration();
  return localStorage.getItem(TOKEN_KEY) || "";
}
export function isLoggedIn() {
  return !!getToken();
}

export function logout() {
  saveToken("");
  try {
    localStorage.removeItem(USER_KEY);
  } catch {}
}

export async function register(email, password) {
  const r = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await r.json();
  if (data.ok && data.token) saveToken(data.token);
  if (data.ok && data.user)
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } catch {}
  return data;
}

export async function login(email, password) {
  const r = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await r.json();
  if (data.ok && data.token) saveToken(data.token);
  if (data.ok && data.user)
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } catch {}
  return data;
}

export async function loadState() {
  const token = getToken();
  if (!token) return { ok: false };
  const r = await fetch(`${API}/auth/state`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return r.json();
}

export async function saveState(state) {
  const token = getToken();
  if (!token) return { ok: false };
  const r = await fetch(`${API}/auth/state`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ state }),
  });
  return r.json();
}

export async function registerWithUsername(username, email, password) {
  const r = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await r.json();
  if (data.ok && data.token) saveToken(data.token);
  if (data.ok && data.user)
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } catch {}
  return data;
}

export function getUser() {
  try {
    ensureAuthMigration();
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
