import { NextRequest, NextResponse } from 'next/server';

const HF_MODELS = [
  'sshleifer/distilbart-cnn-12-6',
  'facebook/bart-large-cnn',
  'Falconsai/text_summarization',
];
const MAX_CHUNK_CHARS = 3000;

const LENGTH_PARAMS = {
  short:  { max_length: 80,  min_length: 20 },
  medium: { max_length: 180, min_length: 50 },
  long:   { max_length: 350, min_length: 100 },
};

// Target word counts per length — ensures clear difference between levels
const TARGET_WORDS = { short: 60, medium: 160, long: 320 };

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
  'is','was','are','were','be','been','being','it','its','this','that','these',
  'those','as','from','have','has','had','will','would','could','should','may',
  'might','do','does','did','not','no','so','if','then','than','when','where',
  'who','which','what','how','also','just','about','into','over','after','while',
]);

// ── Extractive fallback ───────────────────────────────────────────────
function extractiveSummarize(text: string, length: string): string {
  const targetWords = TARGET_WORDS[length as keyof typeof TARGET_WORDS] ?? 160;

  const sentences = text
    .replace(/\n+/g, ' ')
    .match(/[^.!?]+[.!?]+/g)
    ?.map(s => s.trim())
    .filter(s => s.split(/\s+/).length >= 6) // skip fragments
    ?? [];

  if (sentences.length === 0) return text.slice(0, targetWords * 6).trim();
  if (sentences.length <= 3) return sentences.join(' ').trim();

  // Word frequency (only meaningful words)
  const allWords = text.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
  const freq: Record<string, number> = {};
  for (const w of allWords) {
    if (!STOP_WORDS.has(w)) freq[w] = (freq[w] ?? 0) + 1;
  }

  const scored = sentences.map((s, i) => {
    const sWords = s.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
    const freqScore = sWords.reduce((sum, w) => sum + (freq[w] ?? 0), 0) / (sWords.length || 1);
    // Boost early sentences (topic/intro) and slightly boost final sentences (conclusion)
    const pos = i / sentences.length;
    const posBonus = pos < 0.2 ? 1.6 : pos < 0.4 ? 1.2 : pos > 0.85 ? 1.1 : 1.0;
    return { s, score: freqScore * posBonus, i, wc: sWords.length };
  });

  // Pick highest-scoring sentences until word target is met
  const selected: typeof scored = [];
  let wordCount = 0;
  for (const item of [...scored].sort((a, b) => b.score - a.score)) {
    if (wordCount >= targetWords) break;
    selected.push(item);
    wordCount += item.wc;
  }

  return selected
    .sort((a, b) => a.i - b.i)
    .map(x => x.s)
    .join(' ');
}

// ── Chunking ──────────────────────────────────────────────────────────
function splitIntoChunks(text: string): string[] {
  if (text.length <= MAX_CHUNK_CHARS) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > MAX_CHUNK_CHARS) {
    const slice = remaining.slice(0, MAX_CHUNK_CHARS);
    const lastBreak = Math.max(
      slice.lastIndexOf('. '),
      slice.lastIndexOf('! '),
      slice.lastIndexOf('? '),
      slice.lastIndexOf('\n'),
    );
    const cutAt = lastBreak > MAX_CHUNK_CHARS / 2 ? lastBreak + 1 : MAX_CHUNK_CHARS;
    chunks.push(remaining.slice(0, cutAt).trim());
    remaining = remaining.slice(cutAt).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

// ── HuggingFace ───────────────────────────────────────────────────────
async function callHuggingFaceModel(
  model: string,
  text: string,
  params: { max_length: number; min_length: number },
  retries = 1,
): Promise<string> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  const res = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ inputs: text, parameters: { ...params, do_sample: false } }),
    },
  );

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    if (res.status === 404) throw new Error('MODEL_NOT_FOUND');
    if (res.status === 401 || res.status === 403) throw new Error('INVALID_TOKEN');
    if (res.status === 429) throw new Error('RATE_LIMITED');
    throw new Error(`HF_HTTP_${res.status}`);
  }

  const data = await res.json();

  if (!res.ok) {
    if (res.status === 404) throw new Error('MODEL_NOT_FOUND');
    if (res.status === 401 || res.status === 403) throw new Error('INVALID_TOKEN');
    if (data?.estimated_time && retries > 0) {
      await new Promise(r => setTimeout(r, Math.min(data.estimated_time * 1000, 20000)));
      return callHuggingFaceModel(model, text, params, retries - 1);
    }
    throw new Error(data?.error || `HF_HTTP_${res.status}`);
  }

  return Array.isArray(data) ? (data[0]?.summary_text ?? '') : (data?.summary_text ?? '');
}

async function callHuggingFace(
  text: string,
  params: { max_length: number; min_length: number },
): Promise<string> {
  let tokenError = false;
  for (const model of HF_MODELS) {
    try {
      return await callHuggingFaceModel(model, text, params);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'INVALID_TOKEN') { tokenError = true; break; }
      if (msg === 'RATE_LIMITED') throw new Error('HuggingFace rate limit reached. Try again in a moment.');
      // MODEL_NOT_FOUND or other HTTP errors — try next model
    }
  }
  if (tokenError) {
    throw new Error(
      'HuggingFace token does not have Inference API permission. ' +
      'Go to huggingface.co/settings/tokens, create a new token, and enable "Make calls to the serverless Inference API".',
    );
  }
  throw new Error('HF_ALL_FAILED');
}

// ── OpenAI ────────────────────────────────────────────────────────────
async function callOpenAI(text: string, length: string): Promise<string> {
  const lengthHint =
    length === 'short' ? '2-3 sentences'
    : length === 'long' ? '3-4 paragraphs'
    : '1 concise paragraph';

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional summarizer. Summarize the provided text in ${lengthHint}. Be concise, accurate, and preserve key information.`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    }),
  });

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error(`OpenAI returned an unexpected response (HTTP ${res.status})`);
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI error (HTTP ${res.status})`);
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

// ── Handler ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { text, length = 'medium' } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const cleaned = text.trim().slice(0, 50000);
    if (cleaned.length < 50) {
      return NextResponse.json({ error: 'Text is too short to summarize' }, { status: 400 });
    }

    // OpenAI — best quality
    if (process.env.OPENAI_API_KEY) {
      const summary = await callOpenAI(cleaned, length);
      return NextResponse.json({ summary });
    }

    // HuggingFace — free AI summarization
    if (process.env.HUGGINGFACE_API_KEY) {
      try {
        const params = LENGTH_PARAMS[length as keyof typeof LENGTH_PARAMS] ?? LENGTH_PARAMS.medium;
        const chunks = splitIntoChunks(cleaned);
        let summary: string;
        if (chunks.length === 1) {
          summary = await callHuggingFace(chunks[0], params);
        } else {
          const parts = await Promise.all(chunks.map(c => callHuggingFace(c, LENGTH_PARAMS.medium)));
          const combined = parts.join(' ');
          summary = combined.length > MAX_CHUNK_CHARS
            ? await callHuggingFace(combined.slice(0, MAX_CHUNK_CHARS), params)
            : combined;
        }
        return NextResponse.json({ summary });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        // If it's a token/permission error, surface it clearly
        if (msg !== 'HF_ALL_FAILED') {
          return NextResponse.json({ error: msg }, { status: 500 });
        }
        // All HF models unavailable — fall through to extractive
      }
    }

    // Extractive fallback — no API key needed, works always
    const summary = extractiveSummarize(cleaned, length);
    return NextResponse.json({ summary, extractive: true });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Summarization failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
