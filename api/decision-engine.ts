import dns from 'node:dns';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { Buffer } from 'node:buffer';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

interface GoogleCreds {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  [key: string]: any;
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

function getGoogleCreds(): GoogleCreds {
  let rawContent = '';

  const envCreds =
    process.env.GOOGLE_CREDENTIALS ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
    process.env.GCP_SERVICE_ACCOUNT_KEY;

  if (envCreds) {
    rawContent = envCreds.trim();
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const p = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (fs.existsSync(p)) {
      rawContent = fs.readFileSync(p, 'utf8');
    }
  } else {
    const defaultPath = path.resolve(process.cwd(), 'credentials', 'google.json');
    if (fs.existsSync(defaultPath)) {
      rawContent = fs.readFileSync(defaultPath, 'utf8');
    }
  }

  if (!rawContent) {
    throw new Error(
      'Google credentials not found. In Vercel, add an Environment Variable named GOOGLE_CREDENTIALS with the content of your google.json file.'
    );
  }

  // Handle accidental wrapping quotes around env var
  if (
    (rawContent.startsWith("'") && rawContent.endsWith("'")) ||
    (rawContent.startsWith('"') && rawContent.endsWith('"') && !rawContent.includes('\\"'))
  ) {
    rawContent = rawContent.slice(1, -1).trim();
  }

  let parsed: any;
  try {
    if (rawContent.startsWith('{')) {
      parsed = JSON.parse(rawContent);
    } else {
      const decoded = Buffer.from(rawContent, 'base64').toString('utf8');
      parsed = JSON.parse(decoded);
    }
  } catch (parseErr: any) {
    throw new Error(`Failed to parse Google credentials JSON: ${parseErr.message}`);
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('Google credentials JSON is missing client_email or private_key');
  }

  parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  return parsed;
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 28000);
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res;
    } catch (err: unknown) {
      lastError = err;
      console.warn(`[Decision Engine] Network attempt ${attempt}/${maxRetries} failed: ${(err as Error).message}`);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
      }
    }
  }
  throw lastError;
}

async function getGoogleAccessToken(forceRefresh = false): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (!forceRefresh && cachedAccessToken && now < tokenExpiresAt - 120) {
    return cachedAccessToken;
  }

  const creds = getGoogleCreds();

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const b64 = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsignedToken = `${b64(header)}.${b64(payload)}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsignedToken);
  const signature = sign.sign(creds.private_key, 'base64url');

  const jwt = `${unsignedToken}.${signature}`;

  const tokenRes = await fetchWithRetry('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    cachedAccessToken = null;
    throw new Error(`Failed to obtain Google access token (${tokenRes.status}): ${errText}`);
  }

  const json = (await tokenRes.json()) as { access_token: string; expires_in?: number };
  if (!json.access_token) {
    cachedAccessToken = null;
    throw new Error('Google OAuth token response missing access_token');
  }

  cachedAccessToken = json.access_token;
  tokenExpiresAt = now + (json.expires_in || 3600);
  return cachedAccessToken;
}

async function parseBody(req: any): Promise<any> {
  if ('body' in req && req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    if (typeof req.body === 'object') {
      return req.body;
    }
  }

  if (req.readableEnded || req.complete) {
    return {};
  }

  return new Promise((resolve) => {
    let bodyRaw = '';
    req.on('data', (chunk: any) => (bodyRaw += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(bodyRaw || '{}'));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
    setTimeout(() => resolve({}), 2000);
  });
}

function sendJson(res: any, statusCode: number, data: any) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(statusCode).json(data);
  } else {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const body = await parseBody(req);
    const userPrompt = body.prompt || body.message;
    const history = body.history || [];

    if (!userPrompt || typeof userPrompt !== 'string') {
      return sendJson(res, 400, { error: 'Prompt is required' });
    }

    const creds = getGoogleCreds();
    let accessToken = await getGoogleAccessToken();

    const systemInstruction = `You are Compass, the official Tourisma Decision Engine AI Copilot, an advanced spatial and strategic tourism intelligence platform for Malaysia.
Your role is to empower tourism policymakers, urban planners, state authorities, and tourism investment boards to make data-driven decisions.

CRITICAL DOMAIN RESTRICTIONS & GUARDRAILS:
1. You ONLY answer questions directly related to the Tourisma system, Malaysia tourism, spatial intelligence, destination analytics, tourism infrastructure (such as healthcare access, accommodation capacity, transport corridors, protected ecological reserves, heritage assets), and tourism planning or policy in Malaysia.
2. If an inquiry, prompt, or question is NOT directly related to the Tourisma system or Malaysian tourism planning (for example: money laundering, financial crime, general programming, trivia, general definitions, unrelated finance/crypto, health diagnoses, entertainment, etc.):
   - DO NOT answer the question.
   - DO NOT provide general definitions, explanations, historical context, or informational summaries for the unrelated topic under ANY circumstances.
   - Politely and concisely decline to answer. State clearly: "As Compass, the Tourisma Decision Engine Copilot, my expertise is strictly restricted to Malaysia tourism intelligence, destination analytics, and spatial planning. I cannot assist with topics outside this domain."
   - Suggest relevant Malaysian tourism topics they can explore instead (e.g., destination diagnosis, regional healthcare access, accommodation density, or ecological buffer analysis).

When analyzing any valid destination, state, sector, or national tourism inquiry, you MUST synthesize your answer using the official Tourisma 4-step Decision Framework:

### 1. Tourism Diagnosis ("What is happening?")
- Clear executive summary of the current operating situation, visitor demand velocity, and infrastructure dynamics.

### 2. Key Pressure Areas ("Where is the problem?")
- Pinpoint specific spatial hotspots, infrastructure bottlenecks (e.g. healthcare catchment deficits, bed occupancy stress, lodging concentration, ecological buffer encroachment).

### 3. Evidence ("Why does Tourisma say this?")
- Cite concrete Tourisma spatial metrics, official MOH healthcare statistics (e.g. 5km primary care access rates, bed occupancy rate BOR), accommodation capacity limits, or protected park buffer data.

### 4. Planning Focus ("What should planners investigate?")
- Direct actionable recommendations for state planners, infrastructure intervention priorities, or policy mitigations.

Format your responses with clear markdown, bold key figures, and concise bullet points. Be professional, analytical, and authoritative.`;

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // Add previous conversational context if provided
    if (Array.isArray(history) && history.length > 0) {
      for (const msg of history.slice(-6)) {
        if (msg.role === 'user' || msg.role === 'model') {
          contents.push({
            role: msg.role,
            parts: [{ text: msg.text }],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: userPrompt }],
    });

    const vertexUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${creds.project_id}/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`;

    const requestPayload = {
      system_instruction: {
        parts: [{ text: systemInstruction }],
      },
      contents,
      generation_config: {
        temperature: 0.35,
        max_output_tokens: 1800,
        top_p: 0.9,
      },
    };

    let vertexRes = await fetchWithRetry(vertexUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    // If token expired, refresh and retry once
    if (vertexRes.status === 401) {
      console.warn('[Decision Engine] Received 401, refreshing token and retrying...');
      accessToken = await getGoogleAccessToken(true);
      vertexRes = await fetchWithRetry(vertexUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });
    }

    if (!vertexRes.ok) {
      const errBody = await vertexRes.text();
      let cleanMsg = `Vertex AI error (${vertexRes.status}): ${errBody}`;
      try {
        const errJson = JSON.parse(errBody);
        if (errJson.error?.message) {
          cleanMsg = errJson.error.message;
        }
      } catch {}
      return sendJson(res, vertexRes.status, {
        error: cleanMsg,
      });
    }

    const data = (await vertexRes.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const candidateText =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No response generated by Tourisma Decision Engine.';

    return sendJson(res, 200, {
      response: candidateText,
      model: 'gemini-2.5-flash',
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Decision Engine API error:', errorMsg);
    return sendJson(res, 500, { error: errorMsg });
  }
}
