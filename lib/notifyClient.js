'use client'

/**
 * Fire-and-report helper for store lifecycle emails.
 * Never blocks the main registration/approval UX if mail is misconfigured.
 */
export async function notifyStoreEvent(event, store) {
  try {
    const response = await fetch("/api/notify/store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        store: {
          id: store.id,
          name: store.name,
          username: store.username,
          email: store.email,
          contact: store.contact,
          address: store.address,
          description: store.description,
          status: store.status,
        },
      }),
    })
    const payload = await response.json().catch(() => ({}))
    return {
      ok: response.ok && payload.ok !== false,
      skipped: Boolean(payload.skipped),
      reason: payload.reason || payload.error || "",
      payload,
    }
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      reason: error?.message || "Network error while sending notification",
    }
  }
}
