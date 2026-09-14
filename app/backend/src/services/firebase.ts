import { readFileSync } from 'fs';
import { join } from 'path';

let initialized = false;
let firebaseApp: any = null;

export async function initFirebase() {
  if (initialized) return;

  try {
    // Dynamic import to handle ESM/CJS compatibility
    const firebaseAdmin = await import('firebase-admin/app');
    const { cert } = await import('firebase-admin/app');

    const serviceAccountPath = join(process.cwd(), 'firebase-adminsdk.json');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
    console.log('Found Firebase config');

    firebaseApp = firebaseAdmin.initializeApp({
      credential: cert(serviceAccount),
    });

    initialized = true;
    console.log('Firebase Admin SDK initialized');
  } catch (err: any) {
    console.warn('Firebase Admin SDK initialization failed:', err.message || err);
    console.warn('Push notifications will be disabled');
  }
}

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  if (!initialized || !firebaseApp) {
    console.warn('Firebase not initialized, skipping push notification');
    return null;
  }

  try {
    const { getMessaging } = await import('firebase-admin/messaging');
    const messaging = getMessaging(firebaseApp);
    const result = await messaging.send({
      token,
      notification: { title, body },
      data,
      android: { priority: 'high' },
      apns: { payload: { aps: { 'content-available': 1 } } },
    });
    return result;
  } catch (err: any) {
    console.error('Push notification failed:', err.message);
    return null;
  }
}

export async function sendToTopic(
  topic: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  if (!initialized || !firebaseApp) return null;

  try {
    const { getMessaging } = await import('firebase-admin/messaging');
    const messaging = getMessaging(firebaseApp);
    return await messaging.send({
      topic,
      notification: { title, body },
      data,
    });
  } catch (err: any) {
    console.error('Topic notification failed:', err.message);
    return null;
  }
}
