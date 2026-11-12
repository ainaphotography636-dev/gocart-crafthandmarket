'use client'

import {
  ADMIN_ROLE_COOKIE,
  ADMIN_ROLE_STORAGE_KEY,
  AdminRole,
  normalizeAdminRole,
} from "@/lib/adminPermissions"

function readCookie(name) {
  if (typeof document === "undefined") return ""
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : ""
}

function writeCookie(name, value) {
  if (typeof document === "undefined") return
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax`
}

export function getClientAdminRole() {
  const fromStorage =
    typeof localStorage !== "undefined"
      ? localStorage.getItem(ADMIN_ROLE_STORAGE_KEY)
      : ""
  const fromCookie = readCookie(ADMIN_ROLE_COOKIE)
  return normalizeAdminRole(fromStorage || fromCookie || AdminRole.SUPER_ADMIN)
}

export function setClientAdminRole(role) {
  const normalized = normalizeAdminRole(role)
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(ADMIN_ROLE_STORAGE_KEY, normalized)
  }
  writeCookie(ADMIN_ROLE_COOKIE, normalized)
  return normalized
}
