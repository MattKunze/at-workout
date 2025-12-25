import {
  configureOAuth,
  createAuthorizationUrl,
  finalizeAuthorization,
  getSession,
  deleteStoredSession,
  listStoredSessions,
  type Session,
} from "@atcute/oauth-browser-client";
import { identityResolver } from "./identity";
import { type ActorIdentifier } from "@atcute/lexicons";

// Initialize the OAuth client
if (typeof window !== "undefined") {
  configureOAuth({
    metadata: {
      client_id: import.meta.env.VITE_OAUTH_CLIENT_ID,
      redirect_uri: import.meta.env.VITE_OAUTH_REDIRECT_URI,
    },
    identityResolver,
  });
}

export async function signIn(handle: string) {
  try {
    const authUrl = await createAuthorizationUrl({
      target: {
        type: "account",
        identifier: handle as ActorIdentifier,
      },
      scope: "atproto",
    });

    window.location.href = authUrl.toString();
  } catch (err) {
    console.error("Failed to start authorization flow:", err);
    throw err;
  }
}

export async function handleCallback(params: URLSearchParams) {
  try {
    const result = await finalizeAuthorization(params);
    return result.session;
  } catch (err) {
    console.error("Failed to finalize authorization:", err);
    throw err;
  }
}

export async function getCurrentSession(): Promise<Session | undefined> {
  try {
    const dids = listStoredSessions();
    if (dids.length === 0) return undefined;

    // Return the first session found
    return await getSession(dids[0]);
  } catch (err) {
    console.error("Failed to get session:", err);
    return undefined;
  }
}

export async function signOut() {
  try {
    const dids = listStoredSessions();
    for (const did of dids) {
      deleteStoredSession(did);
    }
  } catch (err) {
    console.error("Failed to sign out:", err);
  }
}
