import { getConnection, saveConnection } from './storage';
import type { Connection } from '../types/connections';

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a token is expired (or will expire soon)
 */
function isTokenExpired(expiresAt?: number): boolean {
  if (!expiresAt) {
    // If we don't have expiry info, assume it might be expired
    return true;
  }
  
  const now = Date.now();
  const expiryWithBuffer = expiresAt - TOKEN_EXPIRY_BUFFER_MS;
  
  return now >= expiryWithBuffer;
}

/**
 * Refresh the Peloton access token using the refresh token
 */
async function refreshPelotonToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const formData = new FormData();
  formData.append('refreshToken', refreshToken);
  
  const response = await fetch('/api/peloton/refresh', {
    method: 'POST',
    body: formData,
  });
  
  const result = await response.json() as {
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    error?: string;
  };
  
  if (!result.success || !result.accessToken) {
    throw new Error(result.error || 'Failed to refresh Peloton token');
  }
  
  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresIn: result.expiresIn,
  };
}

/**
 * Get a valid Peloton access token, refreshing if necessary
 * 
 * This is the main utility function that should be used whenever you need
 * to make an authenticated request to the Peloton API.
 * 
 * @param service - The service name (e.g., 'peloton')
 * @returns A valid access token, or null if not connected/unable to refresh
 * 
 * @example
 * const token = await getValidAccessToken('peloton');
 * if (token) {
 *   // Make API request with token
 *   fetch('https://api.onepeloton.com/...', {
 *     headers: { Authorization: `Bearer ${token}` }
 *   });
 * }
 */
export async function getValidAccessToken(service: string): Promise<string | null> {
  const connection = getConnection(service);
  
  if (!connection) {
    console.warn(`[Token Manager] No connection found for service: ${service}`);
    return null;
  }
  
  // Check if we have a valid access token
  if (!isTokenExpired(connection.expiresAt)) {
    console.log(`[Token Manager] Using cached token for ${service}`);
    return connection.accessToken;
  }
  
  // Token is expired or expiring soon, try to refresh
  console.log(`[Token Manager] Token expired for ${service}, attempting refresh`);
  
  if (!connection.refreshToken) {
    console.error(`[Token Manager] No refresh token available for ${service}`);
    return null;
  }
  
  try {
    const refreshed = await refreshPelotonToken(connection.refreshToken);
    
    // Calculate new expiry time
    const expiresAt = refreshed.expiresIn 
      ? Date.now() + (refreshed.expiresIn * 1000)
      : undefined;
    
    // Update the connection with new tokens
    const updatedConnection: Connection = {
      ...connection,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken || connection.refreshToken,
      expiresAt,
    };
    
    saveConnection(service, updatedConnection);
    console.log(`[Token Manager] Successfully refreshed token for ${service}`);
    
    return refreshed.accessToken;
  } catch (error) {
    console.error(`[Token Manager] Failed to refresh token for ${service}:`, error);
    return null;
  }
}

/**
 * Check if a service is connected and has valid credentials
 */
export function hasValidConnection(service: string): boolean {
  const connection = getConnection(service);
  return !!connection && !!connection.accessToken;
}
