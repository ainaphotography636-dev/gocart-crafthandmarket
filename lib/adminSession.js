'use client'

import {
  ADMIN_PERMISSIONS_COOKIE,
  ADMIN_PERMISSIONS_STORAGE_KEY,
  ADMIN_ROLE_COOKIE,
  ADMIN_ROLE_STORAGE_KEY,
  AdminRole,
  decodePermissionsCookie,
  encodePermissionsCookie,
  normalizeAdminRole,
  resolveEffectivePermissions,
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

export function getClientAdminPermissions() {
  const fromStorage =
    typeof localStorage !== "undefined"
      ? localStorage.getItem(ADMIN_PERMISSIONS_STORAGE_KEY)
      : ""
  const fromCookie = readCookie(ADMIN_PERMISSIONS_COOKIE)
  return decodePermissionsCookie(fromStorage || fromCookie || "")
}

export function setClientAdminSession({ role, permissions } = {}) {
  const normalized = normalizeAdminRole(role)
  const effective = resolveEffectivePermissions({
    role: normalized,
    permissions: permissions || [],
  })

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(ADMIN_ROLE_STORAGE_KEY, normalized)
    localStorage.setItem(
      ADMIN_PERMISSIONS_STORAGE_KEY,
      encodePermissionsCookie(effective.includes("*") ? ["*"] : effective)
    )
  }

  writeCookie(ADMIN_ROLE_COOKIE, normalized)
  writeCookie(
    ADMIN_PERMISSIONS_COOKIE,
    encodePermissionsCookie(effective.includes("*") ? ["*"] : effective)
  )

  return { role: normalized, permissions: effective }
}

/** @deprecated use setClientAdminSession */
export function setClientAdminRole(role) {
  return setClientAdminSession({ role, permissions: [] }).role
}
