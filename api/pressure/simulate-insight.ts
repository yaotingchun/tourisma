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
      console.warn(`[Pressure API] Network attempt ${attempt}/${maxRetries} failed: ${(err as Error).message}`);
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

function readCacheFile(subPath: string): Record<string, any> {
  try {
    const localPath = path.resolve(process.cwd(), subPath);
    if (fs.existsSync(localPath)) {
      return JSON.parse(fs.readFileSync(localPath, 'utf8'));
    }
  } catch {}
  try {
    const tmpPath = path.resolve('/tmp', path.basename(subPath));
    if (fs.existsSync(tmpPath)) {
      return JSON.parse(fs.readFileSync(tmpPath, 'utf8'));
    }
  } catch {}
  return {};
}

function writeCacheFile(subPath: string, data: Record<string, any>): void {
  try {
    const localPath = path.resolve(process.cwd(), subPath);
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(localPath, JSON.stringify(data, null, 2), 'utf8');
    return;
  } catch {}

  try {
    const tmpPath = path.resolve('/tmp', path.basename(subPath));
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const body = await parseBody(req);
    const state = (body.state || 'Whole Malaysia').trim();
    const currentVisitors = Number(body.currentVisitors || 23161166);
    const scenarioVisitors = Number(body.scenarioVisitors || 27793399);
    const demandChangePct = Number(body.demandChangePct ?? 20);
    const currentRooms = Number(body.currentRooms || 34323);
    const scenarioRooms = Number(body.scenarioRooms || 34323);
    const currentVtr = Number(body.currentVisitorRoomRatio || 674.8);
    const scenarioVtr = Number(body.scenarioVisitorRoomRatio || 809.8);
    const aorPct = Number(body.aorPct || 75.6);
    const roadAccessRate = Number(body.roadAccessRate || 27.0);
    const ptAccessRate = Number(body.ptAccessRate || 29.2);
    const environmentalExposureRate = Number(body.environmentalExposureRate || 39.6);
    const demandCapacityGapPp = Number(body.demandCapacityGapPp ?? (demandChangePct - (Number(body.capacityChangePct) || 0)));
    const capacityChangePct = Number(body.capacityChangePct || 0);
    const scenarioSource = (body.scenarioSource || 'User-defined').trim();

    const cacheKey = `${state.toLowerCase()}_d${demandChangePct}_c${capacityChangePct}_${scenarioSource.toLowerCase()}`.replace(/[^a-z0-9_]/g, '_');
    const cacheRelPath = 'data/cache/pressure_insights_cache.json';
    const cacheMap = readCacheFile(cacheRelPath);

    if (cacheMap[cacheKey]) {
      return sendJson(res, 200, { ...cacheMap[cacheKey], cached: true });
    }

    // Structured fallback generator
    const generateFallback = () => {
      const curVisM = (currentVisitors / 1e6).toFixed(2);
      const scenVisM = (scenarioVisitors / 1e6).toFixed(2);
      const signD = demandChangePct >= 0 ? '+' : '';
      const signC = capacityChangePct >= 0 ? '+' : '';
      const signG = demandCapacityGapPp >= 0 ? '+' : '';

      const whatChanges = `Demand changes from ${curVisM}M to ${scenVisM}M (${signD}${demandChangePct.toFixed(1)}%) with room capacity changing by ${signC}${capacityChangePct.toFixed(1)}%, resulting in a Demand–Capacity Gap of ${signG}${demandCapacityGapPp.toFixed(1)} pp.`;
      const whatBecomesMorePressured = capacityChangePct === 0
        ? `With accommodation capacity unchanged, the visitor-to-room ratio increases from ${currentVtr.toFixed(1)} to ${scenarioVtr.toFixed(1)} (${signD}${demandChangePct.toFixed(1)}%). In ${state}, where current observed AOR is ${aorPct.toFixed(1)}% and road accessibility stands at ${roadAccessRate.toFixed(1)}% (PT access: ${ptAccessRate.toFixed(1)}%), peak throughput amplifies corridor strain, alongside potential proximity pressures on the ${environmentalExposureRate.toFixed(1)}% of assets near ecological reserves.`
        : `Under the combined adjustments, the visitor-to-room ratio shifts from ${currentVtr.toFixed(1)} to ${scenarioVtr.toFixed(1)}. With observed AOR at ${aorPct.toFixed(1)}%, the ${signG}${demandCapacityGapPp.toFixed(1)} pp gap indicates relative ${demandCapacityGapPp > 0 ? 'demand surplus over capacity expansion' : 'capacity buffer headroom'}. Existing connectivity constraints (${roadAccessRate.toFixed(1)}% road, ${ptAccessRate.toFixed(1)}% PT access) and ${environmentalExposureRate.toFixed(1)}% environmental proximity require coordinated monitoring.`;

      const whatShouldPlannersInvestigate = [
        `Assess accommodation pipeline and seasonal distribution against the scenario visitor-to-room ratio of ${scenarioVtr.toFixed(1)} (observed AOR: ${aorPct.toFixed(1)}%).`,
        `Monitor primary transit corridors and last-mile accessibility where road connectivity is currently ${roadAccessRate.toFixed(1)}% and PT access is ${ptAccessRate.toFixed(1)}%.`,
        `Safeguard environmental buffers around the ${environmentalExposureRate.toFixed(1)}% of tourism assets situated near protected reserves during high-demand windows.`
      ];

      return {
        whatChanges,
        whatBecomesMorePressured,
        whatShouldPlannersInvestigate,
        source: scenarioSource,
        generatedAt: new Date().toISOString()
      };
    };

    let insight = generateFallback();

    try {
      const creds = getGoogleCreds();
      let accessToken = await getGoogleAccessToken();

      const systemInstruction = `You are an expert tourism systems planning analyst working with the Tourisma Spatial Intelligence Platform.
Your role is to interpret which existing constraints become more pronounced under the selected scenario.

CRITICAL GUARDRAILS & METHODOLOGICAL RULES:
1. Identify the most notable changes shown by the supplied data.
2. Do NOT invent causal relationships, arbitrary thresholds, infrastructure failures, or ungrounded statistics.
3. Distinguish observed indicators (current AOR, current accessibility, environmental proximity) from scenario calculations (scenario visitors, scenario VTR, demand-capacity gap).
4. Recommend areas for investigation or monitoring rather than claiming that a destination will fail.
5. Provide your output strictly in JSON format matching this exact schema:
{
  "whatChanges": "A concise 1-2 sentence statement summarizing the demand and capacity shift and resulting demand-capacity gap in pp.",
  "whatBecomesMorePressured": "A factual 2-3 sentence interpretation of which existing physical constraints (VTR, observed AOR, road access, PT access, or reserve proximity) experience amplified strain under this scenario.",
  "whatShouldPlannersInvestigate": [
    "Investigation recommendation 1 focused on accommodation and capacity.",
    "Investigation recommendation 2 focused on transport or accessibility corridors.",
    "Investigation recommendation 3 focused on environmental or spatial monitoring."
  ]
}`;

      const dataPayload = {
        state,
        currentVisitors,
        scenarioVisitors,
        demandChangePct,
        currentRooms,
        scenarioRooms,
        currentVisitorRoomRatio: currentVtr,
        scenarioVisitorRoomRatio: scenarioVtr,
        aorPct,
        roadAccessRate,
        ptAccessRate,
        environmentalExposureRate,
        demandCapacityGapPp,
        capacityChangePct,
        scenarioSource
      };

      const vertexUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${creds.project_id}/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`;

      const requestPayload = {
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Interpret the following scenario data according to the 3-layer structure:\n${JSON.stringify(dataPayload, null, 2)}`
              }
            ]
          }
        ],
        generation_config: {
          temperature: 0.2,
          max_output_tokens: 4096,
          response_mime_type: 'application/json'
        }
      };

      let vertexRes = await fetchWithRetry(vertexUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      if (vertexRes.status === 401) {
        console.warn('[Pressure API] Received 401, refreshing token and retrying...');
        accessToken = await getGoogleAccessToken(true);
        vertexRes = await fetchWithRetry(vertexUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload)
        });
      }

      if (vertexRes.ok) {
        const vertexJson = await vertexRes.json();
        const rawText = vertexJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          let parsed: any = null;
          try {
            let cleaned = rawText.trim();
            if (cleaned.startsWith('```')) {
              cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
            }
            parsed = JSON.parse(cleaned);
          } catch (_parseErr) {
            const firstB = rawText.indexOf('{');
            const lastB = rawText.lastIndexOf('}');
            if (firstB !== -1 && lastB !== -1 && lastB > firstB) {
              try {
                const sub = rawText.substring(firstB, lastB + 1);
                parsed = JSON.parse(sub);
              } catch (_subErr) {
                console.warn('[Pressure API] Failed to parse sanitized AI response text');
              }
            }
          }

          if (parsed && parsed.whatChanges && parsed.whatBecomesMorePressured && Array.isArray(parsed.whatShouldPlannersInvestigate)) {
            insight = {
              whatChanges: parsed.whatChanges,
              whatBecomesMorePressured: parsed.whatBecomesMorePressured,
              whatShouldPlannersInvestigate: parsed.whatShouldPlannersInvestigate,
              source: scenarioSource,
              generatedAt: new Date().toISOString()
            };
          }
        }
      }
    } catch (aiErr) {
      console.warn('[Pressure API] Gemini interpretation fallback invoked:', aiErr);
    }

    // Cache result
    cacheMap[cacheKey] = insight;
    writeCacheFile(cacheRelPath, cacheMap);

    return sendJson(res, 200, insight);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Pressure API error:', errorMsg);
    return sendJson(res, 500, { error: errorMsg });
  }
}
