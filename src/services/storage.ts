import type { Connection } from "../types/connections";

const STORAGE_PREFIX = "@workout:connections:";

export function saveConnection(service: string, connection: Connection): void {
  if (typeof window === "undefined") return;

  try {
    const key = `${STORAGE_PREFIX}${service}`;
    localStorage.setItem(key, JSON.stringify(connection));
  } catch (error) {
    console.error(`Failed to save connection for ${service}:`, error);
  }
}

export function getConnection(service: string): Connection | null {
  if (typeof window === "undefined") return null;

  try {
    const key = `${STORAGE_PREFIX}${service}`;
    const data = localStorage.getItem(key);

    if (!data) return null;

    return JSON.parse(data) as Connection;
  } catch (error) {
    console.error(`Failed to get connection for ${service}:`, error);
    return null;
  }
}

export function removeConnection(service: string): void {
  if (typeof window === "undefined") return;

  try {
    const key = `${STORAGE_PREFIX}${service}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove connection for ${service}:`, error);
  }
}

export function listConnections(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const connections: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        const service = key.substring(STORAGE_PREFIX.length);
        connections.push(service);
      }
    }

    return connections;
  } catch (error) {
    console.error("Failed to list connections:", error);
    return [];
  }
}

export function clearAllConnections(): void {
  if (typeof window === "undefined") return;

  try {
    const keys: string[] = [];

    // Collect all connection keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keys.push(key);
      }
    }

    // Remove them all
    keys.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error("Failed to clear all connections:", error);
  }
}
