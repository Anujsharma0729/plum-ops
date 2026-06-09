/**
 * geminiService.js
 * ─────────────────────────────────────────────────────────────────
 * Gemini 2.0 Flash integration for Plum OPS agents.
 * Features:
 *   • Automatic key rotation across 3 configured API keys
 *   • Per-key failure tracking (skips exhausted keys)
 *   • Safe fallback — if ALL keys fail, returns null so callers
 *     can fall back to the original synthetic logic
 * ─────────────────────────────────────────────────────────────────
 */

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Read keys from env (set in .env → REACT_APP_GEMINI_KEY_1/2/3)
const API_KEYS = [
  process.env.REACT_APP_GEMINI_KEY_1,
  process.env.REACT_APP_GEMINI_KEY_2,
  process.env.REACT_APP_GEMINI_KEY_3,
].filter(k => k && k !== "YOUR_GEMINI_API_KEY_1_HERE" &&
                   k !== "YOUR_GEMINI_API_KEY_2_HERE" &&
                   k !== "YOUR_GEMINI_API_KEY_3_HERE");

// Track which key index to start from (round-robin rotation)
let currentKeyIndex = 0;
// Track per-key failure counts
const keyFailures = {};

/**
 * Returns the next available API key using round-robin rotation.
 * Skips keys that have failed 3+ times in a row.
 * Returns null if no healthy keys are available.
 */
function getNextKey() {
  if (API_KEYS.length === 0) return null;
  const maxRetries = API_KEYS.length;
  for (let i = 0; i < maxRetries; i++) {
    const idx = (currentKeyIndex + i) % API_KEYS.length;
    const key = API_KEYS[idx];
    if ((keyFailures[key] || 0) < 3) {
      currentKeyIndex = (idx + 1) % API_KEYS.length; // advance for next call
      return key;
    }
  }
  return null; // all keys exhausted
}

/**
 * Core call to Gemini 2.0 Flash with automatic key rotation.
 * @param {string} prompt - The full prompt to send
 * @param {object} [options]
 * @param {number} [options.maxOutputTokens=1024]
 * @param {number} [options.temperature=0.3]
 * @returns {Promise<string|null>} - The text response, or null on failure
 */
export async function callGemini(prompt, options = {}) {
  const { maxOutputTokens = 1024, temperature = 0.3 } = options;

  // Try up to API_KEYS.length times (one per key)
  const attemptsAllowed = Math.max(API_KEYS.length, 1);

  for (let attempt = 0; attempt < attemptsAllowed; attempt++) {
    const key = getNextKey();
    if (!key) {
      console.warn("[Gemini] No available API keys — falling back to synthetic logic.");
      return null;
    }

    try {
      const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${key}`;
      const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens,
          temperature,
          candidateCount: 1,
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.warn(`[Gemini] Key ending ...${key.slice(-6)} returned HTTP ${res.status}:`, errText);
        keyFailures[key] = (keyFailures[key] || 0) + 1;
        continue; // try next key
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        console.warn("[Gemini] Empty response from model.");
        keyFailures[key] = (keyFailures[key] || 0) + 1;
        continue;
      }

      // Success — reset failure count for this key
      keyFailures[key] = 0;
      return text;

    } catch (err) {
      console.warn(`[Gemini] Network error on key ...${key.slice(-6)}:`, err.message);
      keyFailures[key] = (keyFailures[key] || 0) + 1;
    }
  }

  console.warn("[Gemini] All keys failed — falling back to synthetic logic.");
  return null;
}

/**
 * Returns true if at least one valid key is configured.
 */
export function isGeminiConfigured() {
  return API_KEYS.length > 0;
}

/**
 * Returns status info useful for the Settings page.
 */
export function getGeminiStatus() {
  return {
    configured: isGeminiConfigured(),
    keyCount: API_KEYS.length,
    keyStatuses: API_KEYS.map((k, i) => ({
      index: i + 1,
      suffix: `...${k.slice(-6)}`,
      failures: keyFailures[k] || 0,
      healthy: (keyFailures[k] || 0) < 3,
    })),
  };
}
