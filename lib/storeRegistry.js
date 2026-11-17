'use client'

import { allocateArtisanCode, mintProductSku, normalizeArtisanCode } from '@/lib/productCodes'

export const STORE_REGISTRY_KEY = 'crafthand_store_registry'
export const ACTIVE_STORE_KEY = 'crafthand_active_store_id'

const defaultUser = {
  id: 'artisan_local',
  name: 'Artisan Applicant',
  email: '',
  image: '',
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function readRegistry() {
  if (!canUseStorage()) return []
  try {
    const raw = localStorage.getItem(STORE_REGISTRY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRegistry(stores) {
  if (!canUseStorage()) return
  localStorage.setItem(STORE_REGISTRY_KEY, JSON.stringify(stores))
}

export function listStores() {
  return readRegistry()
}

export function listPendingStores() {
  return readRegistry().filter((store) => store.status === 'pending')
}

export function listLiveStores() {
  return readRegistry().filter((store) => store.status === 'approved' && store.isActive)
}

export function getStoreById(id) {
  return readRegistry().find((store) => store.id === id) || null
}

export function getStoreByUsername(username) {
  const needle = String(username || '').toLowerCase()
  return readRegistry().find((store) => store.username?.toLowerCase() === needle) || null
}

export function getActiveStore() {
  if (!canUseStorage()) return null
  const activeId = localStorage.getItem(ACTIVE_STORE_KEY)
  if (!activeId) return null
  return getStoreById(activeId)
}

export function setActiveStoreId(id) {
  if (!canUseStorage()) return
  if (!id) {
    localStorage.removeItem(ACTIVE_STORE_KEY)
    return
  }
  localStorage.setItem(ACTIVE_STORE_KEY, id)
}

/**
 * Upsert an artisan/workshop into the local registry and make it the active session.
 * Used for "log in" to an approved profile (no password auth in this MVP — browser session).
 */
export function enterArtisanSession(profile = {}) {
  const username = String(profile.username || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
  if (!username) {
    throw new Error("Workshop username is required to enter the artisan dashboard.")
  }

  const stores = readRegistry()
  const existing =
    stores.find((store) => store.username?.toLowerCase() === username) ||
    (profile.id ? stores.find((store) => store.id === profile.id) : null) ||
    (profile.email
      ? stores.find(
          (store) => store.email?.toLowerCase() === String(profile.email).toLowerCase()
        )
      : null)

  const artisanCode = normalizeArtisanCode(
    profile.artisanCode || existing?.artisanCode || allocateArtisanCode(stores.map((s) => s.artisanCode))
  )
  const now = new Date().toISOString()
  const status = profile.status || existing?.status || "approved"
  const isActive =
    profile.isActive !== undefined
      ? Boolean(profile.isActive)
      : status === "approved"

  const store = {
    ...(existing || {}),
    id: existing?.id || profile.id || `store_${Date.now()}`,
    userId: existing?.userId || profile.userId || `user_${Date.now()}`,
    name: profile.name || existing?.name || username,
    username,
    description: profile.description || existing?.description || "",
    email: profile.email || existing?.email || "",
    contact: profile.contact || existing?.contact || "",
    address: profile.address || existing?.address || "",
    logo: profile.logoUrl || profile.logo || existing?.logo || "",
    logoUrl: profile.logoUrl || existing?.logoUrl || "",
    artisanCode,
    nextSkuSeq: existing?.nextSkuSeq || profile.nextSkuSeq || 1,
    status,
    isActive,
    createdAt: existing?.createdAt || profile.createdAt || now,
    updatedAt: now,
    user: {
      ...(existing?.user || defaultUser),
      name: profile.name || existing?.user?.name || username,
      email: profile.email || existing?.user?.email || "",
      image: profile.logoUrl || profile.logo || existing?.user?.image || "",
    },
  }

  const next = existing
    ? stores.map((item) => (item.id === existing.id ? store : item))
    : [store, ...stores]
  writeRegistry(next)
  setActiveStoreId(store.id)
  return store
}

/**
 * Find a workshop by username or email in the local registry.
 */
export function findStoreByLogin(identifier) {
  const needle = String(identifier || "").trim().toLowerCase()
  if (!needle) return null
  return (
    readRegistry().find(
      (store) =>
        store.username?.toLowerCase() === needle || store.email?.toLowerCase() === needle
    ) || null
  )
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function submitStoreApplication(input) {
  const username = String(input.username || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
  const name = String(input.name || '').trim()
  const description = String(input.description || '').trim()
  const email = String(input.email || '').trim()
  const contact = String(input.contact || '').trim()
  const address = String(input.address || '').trim()

  if (!username || username.length < 3) {
    throw new Error('Choose a username with at least 3 letters or numbers.')
  }
  if (!name) throw new Error('Store / workshop name is required.')
  if (!description) throw new Error('Please describe your craft or workshop.')
  if (!email) throw new Error('Email is required.')
  if (!contact) throw new Error('Contact number is required.')
  if (!address) throw new Error('Workshop / store address is required.')
  if (!input.image) throw new Error('Please upload a store logo or workshop photo.')

  const existing = readRegistry()
  if (existing.some((store) => store.username.toLowerCase() === username)) {
    throw new Error('That username is already taken. Try another.')
  }
  if (existing.some((store) => store.email.toLowerCase() === email.toLowerCase() && store.status !== 'rejected')) {
    throw new Error('An application with this email is already on file.')
  }

  const logo = await fileToDataUrl(input.image)
  const now = new Date().toISOString()
  const artisanCode = allocateArtisanCode(existing.map((store) => store.artisanCode))
  const store = {
    id: `store_${Date.now()}`,
    userId: `user_${Date.now()}`,
    name,
    username,
    description,
    email,
    contact,
    address,
    logo,
    artisanCode,
    nextSkuSeq: 1,
    status: 'pending',
    isActive: false,
    createdAt: now,
    updatedAt: now,
    user: {
      ...defaultUser,
      name,
      email,
      image: logo,
    },
  }

  writeRegistry([store, ...existing])
  setActiveStoreId(store.id)
  return store
}

export function updateStoreStatus(storeId, status) {
  const stores = readRegistry()
  const next = stores.map((store) => {
    if (store.id !== storeId) return store
    return {
      ...store,
      status,
      isActive: status === 'approved',
      updatedAt: new Date().toISOString(),
    }
  })
  writeRegistry(next)
  return next.find((store) => store.id === storeId) || null
}

export function toggleStoreActive(storeId, isActive) {
  const stores = readRegistry()
  const next = stores.map((store) => {
    if (store.id !== storeId) return store
    return {
      ...store,
      isActive: Boolean(isActive),
      updatedAt: new Date().toISOString(),
    }
  })
  writeRegistry(next)
  return next.find((store) => store.id === storeId) || null
}

/**
 * Ensure the store has an artisanCode and claim the next product SKU sequence.
 * Returns { store, sku, skuSequence, artisanCode }.
 */
export function claimNextProductSku(storeId) {
  const stores = readRegistry()
  const index = stores.findIndex((store) => store.id === storeId)
  if (index < 0) throw new Error('Active workshop not found in registry.')

  const current = stores[index]
  let artisanCode = normalizeArtisanCode(current.artisanCode)
  if (!current.artisanCode || artisanCode === 'ART000') {
    artisanCode = allocateArtisanCode(stores.map((store) => store.artisanCode))
  }

  const minted = mintProductSku({
    artisanCode,
    nextSkuSeq: current.nextSkuSeq || 1,
  })

  const updated = {
    ...current,
    artisanCode,
    nextSkuSeq: minted.nextSkuSeq,
    updatedAt: new Date().toISOString(),
  }
  const next = [...stores]
  next[index] = updated
  writeRegistry(next)

  return {
    store: updated,
    artisanCode,
    sku: minted.sku,
    skuSequence: minted.skuSequence,
  }
}
