import Constants from 'expo-constants';
import { format, parseISO } from 'date-fns';

import { SleepSession, WeeklyAiInsight, WeeklySummary } from '../types';
import { toAdjustedMinutes } from '../utils/timeUtils';

type ProviderName = 'gemini' | 'groq';

interface ProviderErrorLike {
  provider: ProviderName;
  status?: number;
  message: string;
}

interface WeeklyAiInput {
  weekSessions: SleepSession[];
  summary: WeeklySummary;
  goalMin: number;
}

const GEMINI_MODEL = 'gemini-2.0-flash';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const REQUEST_TIMEOUT_MS = 10000;

const cache = new Map<string, WeeklyAiInsight>();

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function getAiKeys(): { geminiKey: string | null; groqKey: string | null } {
  const envGemini = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim() ?? '';
  const envGroq = process.env.EXPO_PUBLIC_GROQ_API_KEY?.trim() ?? '';

  const extra = (Constants.expoConfig?.extra ?? {}) as {
    ai?: {
      geminiApiKey?: string;
      groqApiKey?: string;
    };
  };

  const appGemini = extra.ai?.geminiApiKey?.trim() ?? '';
  const appGroq = extra.ai?.groqApiKey?.trim() ?? '';

  const geminiKey = envGemini || appGemini || null;
  const groqKey = envGroq || appGroq || null;

  return { geminiKey, groqKey };
}

function toHoursText(minutes: number): string {
  return (minutes / 60).toFixed(1);
}

function getLatestBedtimePattern(weekSessions: SleepSession[]): string | null {
  if (!weekSessions.length) return null;

  const candidate = weekSessions.reduce((latest, current) => {
    const latestMinutes = toAdjustedMinutes(parseISO(latest.sleep_start));
    const currentMinutes = toAdjustedMinutes(parseISO(current.sleep_start));
    return currentMinutes > latestMinutes ? current : latest;
  });

  const minutes = toAdjustedMinutes(parseISO(candidate.sleep_start));
  const displayMins = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour24 = Math.floor(displayMins / 60);
  const minute = displayMins % 60;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return `${format(parseISO(candidate.date), 'EEEE')} around ${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function buildRuleFallback(input: WeeklyAiInput): WeeklyAiInsight {
  const { summary, goalMin, weekSessions } = input;
  const latestPattern = getLatestBedtimePattern(weekSessions);

  const avgSummary =
    summary.avgDurationMin >= goalMin
      ? `You averaged ${toHoursText(summary.avgDurationMin)}h, which is above your ${toHoursText(goalMin)}h goal.`
      : `You averaged ${toHoursText(summary.avgDurationMin)}h, below your ${toHoursText(goalMin)}h goal.`;

  const pattern = latestPattern
    ? `Your latest bedtime was ${latestPattern}, and your bedtime variation was ±${summary.consistencyStdDevMin}m.`
    : `This week shows bedtime variation of ±${summary.consistencyStdDevMin}m.`;

  const nextStep =
    summary.sleepDebtMin > 120
      ? `You have ${Math.round(summary.sleepDebtMin / 60)}h of sleep debt. Recover gradually with 20-30 extra minutes for the next few nights.`
      : `Pick one anchor bedtime and keep it within 30 minutes across weekdays and weekends.`;

  return {
    summary: avgSummary,
    pattern,
    nextStep,
    provider: 'rule',
    fallbackUsed: true,
  };
}

function buildPrompt(input: WeeklyAiInput): string {
  const { summary, goalMin, weekSessions } = input;

  const compactNights = weekSessions.map((session) => ({
    day: format(parseISO(session.date), 'EEEE'),
    durationHours: Number(((session.duration_min ?? 0) / 60).toFixed(2)),
    bedtimeHour24Adjusted: Number((toAdjustedMinutes(parseISO(session.sleep_start)) / 60).toFixed(2)),
    mood: session.mood_on_wake,
  }));

  return [
    'You are a practical sleep coach for a student MVP app.',
    'Use ONLY the provided data. No diagnosis, no fear language, no medical claims.',
    'Find one specific weekly pattern and explain it in plain words.',
    'Then provide one realistic next step for the coming week.',
    'Return strict JSON with exactly these keys: summary, pattern, nextStep.',
    'Each value must be one sentence and under 200 characters.',
    'No markdown, no code fences, no extra keys.',
    '',
    `weekLabel: ${summary.weekLabel}`,
    `goalHours: ${toHoursText(goalMin)}`,
    `avgHours: ${toHoursText(summary.avgDurationMin)}`,
    `sleepDebtHours: ${toHoursText(summary.sleepDebtMin)}`,
    `goalHitDays: ${summary.goalHitDays}/7`,
    `bedtimeVariationMinutes: ${summary.consistencyStdDevMin}`,
    `moodAvgLongSleep: ${summary.moodAvgLongSleep ?? 'n/a'}`,
    `moodAvgShortSleep: ${summary.moodAvgShortSleep ?? 'n/a'}`,
    `nights: ${JSON.stringify(compactNights)}`,
  ].join('\n');
}

function truncateSentence(value: string, maxLen = 200): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLen) return compact;
  return `${compact.slice(0, maxLen - 1).trimEnd()}.`;
}

function parseJsonObjectFromText(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    // Some models include preface text. Try to extract the first JSON object.
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;

  const candidate = trimmed.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeInsight(payload: Record<string, unknown>): {
  summary: string;
  pattern: string;
  nextStep: string;
} | null {
  const summary = typeof payload.summary === 'string' ? truncateSentence(payload.summary) : '';
  const pattern = typeof payload.pattern === 'string' ? truncateSentence(payload.pattern) : '';
  const nextStep = typeof payload.nextStep === 'string' ? truncateSentence(payload.nextStep) : '';

  if (!summary || !pattern || !nextStep) return null;
  return { summary, pattern, nextStep };
}

function toProviderError(provider: ProviderName, status: number | undefined, message: string): ProviderErrorLike {
  return { provider, status, message };
}

function isProviderErrorLike(value: unknown): value is ProviderErrorLike {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ProviderErrorLike>;
  return (v.provider === 'gemini' || v.provider === 'groq') && typeof v.message === 'string';
}

async function callGeminiFlash(prompt: string, apiKey: string): Promise<{ summary: string; pattern: string; nextStep: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 260,
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      }),
    }),
    REQUEST_TIMEOUT_MS,
  );

  const raw = await response.text();
  if (!response.ok) {
    throw toProviderError('gemini', response.status, raw || `Gemini request failed (${response.status})`);
  }

  let text = '';
  try {
    const parsed = JSON.parse(raw) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    text =
      parsed.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('\n')
        .trim() ?? '';
  } catch {
    throw toProviderError('gemini', undefined, 'Gemini returned non-JSON payload');
  }

  const parsedObject = parseJsonObjectFromText(text);
  const normalized = parsedObject ? normalizeInsight(parsedObject) : null;

  if (!normalized) {
    throw toProviderError('gemini', undefined, 'Gemini response did not match expected schema');
  }

  return normalized;
}

async function callGroq(prompt: string, apiKey: string): Promise<{ summary: string; pattern: string; nextStep: string }> {
  const response = await withTimeout(
    fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.4,
        max_tokens: 260,
        messages: [
          {
            role: 'system',
            content:
              'You are a concise sleep coach. Output strict JSON with keys summary, pattern, nextStep only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    }),
    REQUEST_TIMEOUT_MS,
  );

  const raw = await response.text();
  if (!response.ok) {
    throw toProviderError('groq', response.status, raw || `Groq request failed (${response.status})`);
  }

  let text = '';
  try {
    const parsed = JSON.parse(raw) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    text = parsed.choices?.[0]?.message?.content?.trim() ?? '';
  } catch {
    throw toProviderError('groq', undefined, 'Groq returned non-JSON payload');
  }

  const parsedObject = parseJsonObjectFromText(text);
  const normalized = parsedObject ? normalizeInsight(parsedObject) : null;

  if (!normalized) {
    throw toProviderError('groq', undefined, 'Groq response did not match expected schema');
  }

  return normalized;
}

function buildCacheKey(input: WeeklyAiInput): string {
  const sessionPart = input.weekSessions
    .map((session) => `${session.id}:${session.updated_at}:${session.duration_min ?? -1}:${session.mood_on_wake ?? 0}`)
    .join('|');

  return [
    input.summary.weekLabel,
    input.summary.avgDurationMin,
    input.summary.consistencyStdDevMin,
    input.summary.sleepDebtMin,
    input.summary.goalHitDays,
    input.goalMin,
    sessionPart,
  ].join('::');
}

export async function generateWeeklyAiInsight(input: WeeklyAiInput): Promise<WeeklyAiInsight> {
  const cacheKey = buildCacheKey(input);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const fallback = buildRuleFallback(input);
  const { geminiKey, groqKey } = getAiKeys();

  if (!input.weekSessions.length) {
    cache.set(cacheKey, fallback);
    return fallback;
  }

  const prompt = buildPrompt(input);

  if (geminiKey) {
    try {
      const parsed = await callGeminiFlash(prompt, geminiKey);
      const result: WeeklyAiInsight = {
        ...parsed,
        provider: 'gemini',
        fallbackUsed: false,
      };
      cache.set(cacheKey, result);
      return result;
    } catch (error: unknown) {
      if (!groqKey) {
        cache.set(cacheKey, fallback);
        return fallback;
      }

      if (!isProviderErrorLike(error)) {
        cache.set(cacheKey, fallback);
        return fallback;
      }
    }
  }

  if (groqKey) {
    try {
      const parsed = await callGroq(prompt, groqKey);
      const result: WeeklyAiInsight = {
        ...parsed,
        provider: 'groq',
        fallbackUsed: Boolean(geminiKey),
      };
      cache.set(cacheKey, result);
      return result;
    } catch {
      cache.set(cacheKey, fallback);
      return fallback;
    }
  }

  cache.set(cacheKey, fallback);
  return fallback;
}
