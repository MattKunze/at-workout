import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export async function performOAuthLogin(
  username: string,
  password: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
  if (!username || !password) {
    throw new Error('Username and password are required');
  }

  console.log('[Peloton OAuth] Starting OAuth flow via Go binary for user:', username);

  // Path to the compiled Go binary
  const binaryPath = path.join(process.cwd(), 'bin', 'peloton-oauth');

  try {
    // Execute the Go binary with credentials as environment variables
    const { stdout, stderr } = await execAsync(binaryPath, {
      env: {
        ...process.env,
        PELOTON_LOGIN: username,
        PELOTON_PASSWORD: password,
      },
      timeout: 30000, // 30 second timeout
    });

    // Log stderr if present (for debugging)
    if (stderr) {
      console.log('[Peloton OAuth] Go binary stderr:', stderr);
    }

    // The Go binary outputs JSON with access_token, refresh_token, and expires_in
    const output = stdout.trim();
    
    if (!output) {
      throw new Error('No output returned from Go binary');
    }

    // Try to parse as JSON
    let tokens: { access_token: string; refresh_token?: string; expires_in?: number };
    try {
      tokens = JSON.parse(output);
    } catch {
      // Fallback: if not JSON, assume it's just the access token (backwards compatibility)
      console.log('[Peloton OAuth] Output is not JSON, treating as access token only');
      return { accessToken: output };
    }

    if (!tokens.access_token) {
      throw new Error('No access token returned from Go binary');
    }

    console.log('[Peloton OAuth] Successfully obtained access token');
    if (tokens.refresh_token) {
      console.log('[Peloton OAuth] Successfully obtained refresh token');
    }
    if (tokens.expires_in) {
      console.log(`[Peloton OAuth] Token expires in ${tokens.expires_in} seconds`);
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    };
  } catch (error) {
    console.error('[Peloton OAuth] Go binary execution failed:', error);

    if (error instanceof Error) {
      // Check if it's an execution error with stderr
      const execError = error as { stderr?: string };
      if (execError.stderr) {
        throw new Error(`Peloton OAuth failed: ${execError.stderr}`);
      }
      throw new Error(`Peloton OAuth failed: ${error.message}`);
    }

    throw new Error('Peloton OAuth failed: Unknown error');
  }
}

const PELOTON_AUTH_DOMAIN = 'auth.onepeloton.com';
const PELOTON_CLIENT_ID = 'WVoJxVDdPoFx4RNewvvg6ch2mZ7bwnsM';
const PELOTON_TOKEN_ENDPOINT = `/oauth/token`;

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
  if (!refreshToken) {
    throw new Error('Refresh token is required');
  }

  console.log('[Peloton Token Refresh] Starting token refresh');

  const url = `https://${PELOTON_AUTH_DOMAIN}${PELOTON_TOKEN_ENDPOINT}`;
  const payload = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: PELOTON_CLIENT_ID,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
    }

    const data = await response.json() as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (!data.access_token) {
      throw new Error('No access token in refresh response');
    }

    console.log('[Peloton Token Refresh] Successfully refreshed access token');
    if (data.refresh_token) {
      console.log('[Peloton Token Refresh] Received new refresh token');
    }
    if (data.expires_in) {
      console.log(`[Peloton Token Refresh] Token expires in ${data.expires_in} seconds`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    console.error('[Peloton Token Refresh] Failed:', error);

    if (error instanceof Error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }

    throw new Error('Token refresh failed: Unknown error');
  }
}
