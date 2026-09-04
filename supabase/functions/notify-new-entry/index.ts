import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { importPKCS8, SignJWT } from 'npm:jose@5.10.0';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

interface FirebaseServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

interface EntryRecord {
  id: string;
  author_key: 'a' | 'b';
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function getServiceAccount(): FirebaseServiceAccount {
  const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured');
  }

  let serviceAccount: Partial<FirebaseServiceAccount>;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
  }

  if (!serviceAccount.client_email || !serviceAccount.private_key || !serviceAccount.project_id) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is missing required fields');
  }

  return serviceAccount as FirebaseServiceAccount;
}

function isAuthorizedWebhook(req: Request) {
  const expectedSecret = Deno.env.get('NOTIFY_WEBHOOK_SECRET');
  return Boolean(expectedSecret && req.headers.get('x-webhook-secret') === expectedSecret);
}

async function getFirebaseAccessToken(serviceAccount: FirebaseServiceAccount) {
  const privateKey = await importPKCS8(serviceAccount.private_key, 'RS256');
  const assertion = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(serviceAccount.client_email)
    .setSubject(serviceAccount.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Firebase OAuth token request failed (${tokenResponse.status})`);
  }

  const tokenPayload = await tokenResponse.json();
  if (typeof tokenPayload.access_token !== 'string') {
    throw new Error('Firebase OAuth response did not contain an access token');
  }

  return tokenPayload.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (!isAuthorizedWebhook(req)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await req.json();
    const entry = payload?.record as Partial<EntryRecord> | undefined;

    if (!entry?.id || (entry.author_key !== 'a' && entry.author_key !== 'b')) {
      return jsonResponse({ error: 'Invalid entry payload' }, 400);
    }

    const serviceAccount = getServiceAccount();
    const accessToken = await getFirebaseAccessToken(serviceAccount);
    const authorName = entry.author_key === 'a' ? 'Partenaire A' : 'Partenaire B';

    const firebaseResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            topic: 'journal_updates',
            notification: {
              title: 'Nouveau souvenir !',
              body: `${authorName} a ajouté une nouvelle page au journal.`,
            },
            android: {
              priority: 'HIGH',
              notification: {
                channel_id: 'journal_notifications',
                default_vibrate_timings: true,
              },
            },
          },
        }),
      },
    );

    if (!firebaseResponse.ok) {
      console.error('Firebase notification failed:', firebaseResponse.status);
      return jsonResponse({ error: 'Firebase notification failed' }, 502);
    }

    console.log('Notification sent for entry:', entry.id);
    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Notification function failed:', error);
    return jsonResponse({ error: 'Notification service unavailable' }, 500);
  }
});
