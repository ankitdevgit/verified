"use client";

import { useSyncExternalStore } from "react";
import { SESSION_KEY } from "@/lib/auth";

/**
 * The verified number for this tab. Session storage rather than local storage
 * on purpose — a shared device shouldn't leave someone else able to publish.
 *
 * Read through `useSyncExternalStore` so the server snapshot (always signed
 * out) and the client snapshot stay consistent through hydration.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): string | null {
  return window.sessionStorage.getItem(SESSION_KEY);
}

function getServerSnapshot(): string | null {
  return null;
}

export function usePhoneSession(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setPhoneSession(phone: string | null) {
  if (phone === null) {
    window.sessionStorage.removeItem(SESSION_KEY);
  } else {
    window.sessionStorage.setItem(SESSION_KEY, phone);
  }
  listeners.forEach((l) => l());
}
