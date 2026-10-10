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
      console.warn(`[Places API] Network attempt ${attempt}/${maxRetries} failed: ${(err as Error).message}`);
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

function aggregateEvidence(
  _reviews: Array<any>,
  geminiOutput: { evidence?: Array<any>; aiInsight?: string }
) {
  const dims = ['accessibility', 'parking', 'facilities', 'cleanliness', 'crowding', 'services'] as const;
  const dimNames: Record<string, string> = {
    accessibility: 'Accessibility',
    parking: 'Parking',
    facilities: 'Facilities',
    cleanliness: 'Cleanliness',
    crowding: 'Crowding',
    services: 'Services',
  };

  const aggregated: Record<string, any> = {};
  for (const d of dims) {
    aggregated[d] = {
      dimension: d,
      name: dimNames[d],
      mentions: 0,
      positive: 0,
      mixed: 0,
      negative: 0,
      positivePct: 0,
      mixedPct: 0,
      negativePct: 0,
      evidenceTier: 'unobserved',
      evidenceLabel: 'Unobserved',
      headline: 'Unobserved in available reviews',
      subtext: 'No visitor mentions in sample',
      evidence: [],
    };
  }

  const evidenceList = geminiOutput.evidence || [];
  for (const item of evidenceList) {
    const d = item.dimension?.toLowerCase();
    if (aggregated[d]) {
      const s = item.sentiment?.toLowerCase();
      if (s === 'positive') aggregated[d].positive++;
      else if (s === 'negative') aggregated[d].negative++;
      else if (s === 'mixed') aggregated[d].mixed++;
      aggregated[d].mentions++;
      aggregated[d].evidence.push(item);
    }
  }

  let totalMentions = 0;

  for (const d of dims) {
    const item = aggregated[d];
    totalMentions += item.mentions;
    const m = item.mentions;
    if (m > 0) {
      item.positivePct = Math.round((item.positive / m) * 100);
      item.mixedPct = Math.round((item.mixed / m) * 100);
      item.negativePct = Math.round((item.negative / m) * 100);

      if (m <= 4) {
        item.evidenceTier = 'limited';
        item.evidenceLabel = 'Limited Evidence';
        item.headline = `Limited evidence — ${m} review${m > 1 ? 's' : ''} mention ${item.name.toLowerCase()}`;
        item.subtext = 'Insufficient volume for percentage share';
      } else if (m <= 14) {
        item.evidenceTier = 'moderate';
        item.evidenceLabel = 'Moderate Evidence';
      } else {
        item.evidenceTier = 'strong';
        item.evidenceLabel = 'Strong Evidence';
      }

      if (m >= 5) {
        if (item.negative >= item.positive && item.negative >= item.mixed) {
          item.headline = `${item.negative} of ${m} ${item.name.toLowerCase()} mentions were negative`;
          item.subtext = `${item.negativePct}% negative`;
        } else if (item.positive >= item.negative && item.positive >= item.mixed) {
          item.headline = `${item.positive} of ${m} ${item.name.toLowerCase()} mentions were positive`;
          item.subtext = `${item.positivePct}% positive`;
        } else {
          item.headline = `${item.mixed} of ${m} ${item.name.toLowerCase()} mentions were mixed`;
          item.subtext = `${item.mixedPct}% mixed`;
        }
      }
    }
  }

  return {
    dimensions: aggregated,
    totalMentions,
    aiInsight: geminiOutput.aiInsight || 'Analysis based on available visitor reviews.',
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const body = await parseBody(req);
    const query = (body.query || body.name || '').trim();
    let placeId = (body.placeId || '').trim();
    const stateName = (body.stateName || '').trim();

    if (!query && !placeId) {
      return sendJson(res, 400, { error: 'Either query or placeId is required' });
    }

    const cacheRelPath = '.cache/places_visitor_quality.json';
    const cacheMap = readCacheFile(cacheRelPath);
    const cacheKey = (placeId || query).toLowerCase();

    if (cacheMap[cacheKey]) {
      return sendJson(res, 200, { ...cacheMap[cacheKey], fromCache: true });
    }

    const creds = getGoogleCreds();
    let accessToken = await getGoogleAccessToken();

    // Step 1: Text Search to get place_id if not supplied
    if (!placeId) {
      const searchText = `${query} ${stateName} Malaysia`.trim();
      const searchRes = await fetchWithRetry('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
          'X-Goog-User-Project': creds.project_id,
        },
        body: JSON.stringify({
          textQuery: searchText,
          languageCode: 'en',
        }),
      });

      if (!searchRes.ok) {
        const errText = await searchRes.text();
        let clean = `Google Places Text Search failed (${searchRes.status}): ${errText}`;
        try {
          const j = JSON.parse(errText);
          if (j.error?.message) clean = j.error.message;
        } catch {}
        throw new Error(clean);
      }

      const searchData = (await searchRes.json()) as { places?: Array<{ id: string }> };
      if (!searchData.places || searchData.places.length === 0) {
        return sendJson(res, 404, {
          error: `No Google Place found for "${query}"`,
          place: null,
        });
      }
      placeId = searchData.places[0].id;
    }

    // Step 2: Fetch Place Details with Reviews
    const detailRes = await fetchWithRetry(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,rating,userRatingCount,reviews',
        'X-Goog-User-Project': creds.project_id,
      },
    });

    if (!detailRes.ok) {
      const errText = await detailRes.text();
      let clean = `Google Places Details failed (${detailRes.status}): ${errText}`;
      try {
        const j = JSON.parse(errText);
        if (j.error?.message) clean = j.error.message;
      } catch {}
      throw new Error(clean);
    }

    const detailData = (await detailRes.json()) as {
      id: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
      rating?: number;
      userRatingCount?: number;
      reviews?: Array<{
        authorAttribution?: { displayName?: string; photoUri?: string; uri?: string };
        rating?: number;
        relativePublishTimeDescription?: string;
        text?: { text?: string };
      }>;
    };

    const placeName = detailData.displayName?.text || query;
    const address = detailData.formattedAddress || '';
    const rating = detailData.rating || 0;
    const userRatingCount = detailData.userRatingCount || 0;
    const rawReviews = detailData.reviews || [];

    // Step 3: Format reviews with explicit reviewId audit trail
    const formattedReviews = rawReviews.map((r, idx) => ({
      reviewId: `rev_${idx + 1}`,
      author: r.authorAttribution?.displayName || 'Google Reviewer',
      authorPhotoUri: r.authorAttribution?.photoUri || '',
      authorUri: r.authorAttribution?.uri || '',
      rating: r.rating || 5,
      date: r.relativePublishTimeDescription || '',
      originalText: r.text?.text || '',
    }));

    // If no reviews exist, return empty dimension structure
    if (formattedReviews.length === 0) {
      const emptyPayload = {
        place: { id: placeId, name: placeName, address, rating, userRatingCount },
        dimensions: aggregateEvidence([], { evidence: [], aiInsight: 'No text reviews currently returned for this destination.' }).dimensions,
        totalMentions: 0,
        aiInsight: 'No text reviews currently returned by Google Places API for this destination.',
        reviews: [],
        cachedAt: new Date().toISOString(),
      };
      return sendJson(res, 200, emptyPayload);
    }

    // Step 4: Classify reviews into the 6 infrastructure dimensions using Gemini 2.5 Flash
    const systemInstruction = `You are an expert infrastructure auditor for Tourisma, evaluating visitor-perceived infrastructure quality at destinations in Malaysia.
Your task is to analyze visitor reviews and identify all statements discussing physical infrastructure conditions across EXACTLY these 6 dimensions:
1. accessibility: road condition, traffic ingress, congestion on approach road, parking ingress, public transit, steepness, walking steps/paths
2. parking: parking availability, congestion, ease of finding parking, parking fees
3. facilities: restrooms/toilets, directional signage, seating, shade, lighting, incline lifts/trams/cable cars, cleanliness of restrooms
4. cleanliness: rubbish, litter, grounds maintenance, environmental hygiene
5. crowding: queues, waiting times, overcrowding at bottleneck locations
6. services: restaurants, food stalls, souvenir shops, ticketing counters, visitor info desk

CRITICAL AUDIT REQUIREMENTS:
1. "exactQuote": You MUST extract an EXACT, VERBATIM substring copied directly from the review's originalText. DO NOT rewrite, paraphrase, or hallucinate words.
2. "sentiment": Must be strictly "positive", "negative", or "mixed".
3. "reviewId": Must be the exact reviewId (e.g. "rev_1") where that quote appears.
4. "aiInsight": Provide a 2-3 sentence executive synthesis explaining the key physical infrastructure strengths and bottlenecks observed across the reviews.
5. If a review discusses multiple dimensions, output a separate evidence item for each dimension. If a dimension is not discussed, do not generate an item for it.

Respond strictly in valid JSON conforming to this schema:
{
  "evidence": [
    {
      "reviewId": "rev_1",
      "dimension": "accessibility" | "parking" | "facilities" | "cleanliness" | "crowding" | "services",
      "sentiment": "positive" | "negative" | "mixed",
      "exactQuote": "verbatim substring sentence from originalText"
    }
  ],
  "aiInsight": "2-3 sentence analytical summary for tourism authorities"
}`;

    const vertexUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${creds.project_id}/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`;

    const requestPayload = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(formattedReviews, null, 2) }] }],
      generation_config: {
        temperature: 0.1,
        response_mime_type: 'application/json',
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

    if (vertexRes.status === 401) {
      console.warn('[Places API] Received 401, refreshing token and retrying...');
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
      throw new Error(`Vertex AI error (${vertexRes.status}): ${errBody}`);
    }

    const geminiData = (await vertexRes.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let parsedGemini: { evidence?: Array<any>; aiInsight?: string } = {};
    try {
      parsedGemini = JSON.parse(geminiText);
    } catch (pErr) {
      console.error('[Places API] Failed to parse Gemini response:', geminiText);
    }

    // Step 5: Aggregate mentions into defensible metrics & fraction headlines
    const aggregated = aggregateEvidence(formattedReviews, parsedGemini);

    const payload = {
      place: {
        id: placeId,
        name: placeName,
        address,
        rating,
        userRatingCount,
      },
      dimensions: aggregated.dimensions,
      totalMentions: aggregated.totalMentions,
      aiInsight: aggregated.aiInsight,
      reviews: formattedReviews,
      cachedAt: new Date().toISOString(),
    };

    // Cache payload
    cacheMap[cacheKey] = payload;
    if (placeId) cacheMap[placeId.toLowerCase()] = payload;
    writeCacheFile(cacheRelPath, cacheMap);

    return sendJson(res, 200, payload);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Visitor Quality API error:', errorMsg);
    return sendJson(res, 500, { error: errorMsg });
  }
}
