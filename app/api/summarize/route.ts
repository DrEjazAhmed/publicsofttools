import { NextRequest, NextResponse } from 'next/server';

// Target word counts per length
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
    .filter(s => s.split(/\s+/).length >= 6)
    ?? [];

  if (sentences.length === 0) return text.slice(0, targetWords * 6).trim();
  if (sentences.length <= 3) return sentences.join(' ').trim();

  const allWords = text.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
  const freq: Record<string, number> = {};
  for (const w of allWords) {
    if (!STOP_WORDS.has(w)) freq[w] = (freq[w] ?? 0) + 1;
  }

  const scored = sentences.map((s, i) => {
    const sWords = s.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
    const freqScore = sWords.reduce((sum, w) => sum + (freq[w] ?? 0), 0) / (sWords.length || 1);
    const pos = i / sentences.length;
    const posBonus = pos < 0.2 ? 1.6 : pos < 0.4 ? 1.2 : pos > 0.85 ? 1.1 : 1.0;
    return { s, score: freqScore * posBonus, i, wc: sWords.length };
  });

  const selected: typeof scored = [];
  let wordCount = 0;
  for (const item of [...scored].sort((a, b) => b.score - a.score)) {
    if (wordCount >= targetWords) break;
    selected.push(item);
    wordCount += item.wc;
  }

  return selected.sort((a, b) => a.i - b.i).map(x => x.s).join(' ');
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

    if (process.env.OPENAI_API_KEY) {
      const summary = await callOpenAI(cleaned, length);
      return NextResponse.json({ summary });
    }

    // Extractive fallback when no API key is configured
    const summary = extractiveSummarize(cleaned, length);
    return NextResponse.json({ summary, extractive: true });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Summarization failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
