import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Firestore via the Admin SDK. Server-only: the service account key bypasses
 * security rules, which deny all browser access (see firestore.rules).
 */
function app() {
  const existing = getApps()[0];
  if (existing) return existing;
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!key) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
  return initializeApp({ credential: cert(JSON.parse(key)) });
}

export const db = () => getFirestore(app());

/** Firebase Auth via the Admin SDK: verifies the admin console's session cookies. */
export const auth = () => getAuth(app());
