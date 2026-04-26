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
    throw new Error(
      res.status === 429
        ? 'Rate limit reached. Try again shortly or add a HUGGINGFACE_API_KEY.'
        : `HuggingFace error (HTTP ${res.status})`,
    );
  }

  const data = await res.json();

  if (!res.ok) {
    if (data?.estimated_time && retries > 0) {
      const waitMs = Math.min(data.estimated_time * 1000, 20000);
      await new Promise(r => setTimeout(r, waitMs));
      return callHuggingFaceModel(model, text, params, retries - 1);
    }
    throw new Error(data?.error || `HuggingFace error (HTTP ${res.status})`);
  }

  return Array.isArray(data) ? (data[0]?.summary_text ?? '') : (data?.summary_text ?? '');
}

async function callHuggingFace(
  text: string,
  params: { max_length: number; min_length: number },
): Promise<string> {
  let lastError = '';
  for (const model of HF_MODELS) {
    try {
      return await callHuggingFaceModel(model, text, params);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(`All summarization models failed. Last error: ${lastError}`);
}

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

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY && !process.env.HUGGINGFACE_API_KEY) {
      return NextResponse.json(
        { error: 'No API key configured. Add HUGGINGFACE_API_KEY or OPENAI_API_KEY in your environment variables.' },
        { status: 503 },
      );
    }

    const { text, length = 'medium' } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const cleaned = text.trim().slice(0, 50000);

    if (cleaned.length < 50) {
      return NextResponse.json({ error: 'Text is too short to summarize' }, { status: 400 });
    }

    let summary: string;

    if (process.env.OPENAI_API_KEY) {
      summary = await callOpenAI(cleaned, length);
    } else {
      const params = LENGTH_PARAMS[length as keyof typeof LENGTH_PARAMS] ?? LENGTH_PARAMS.medium;
      const chunks = splitIntoChunks(cleaned);

      if (chunks.length === 1) {
        summary = await callHuggingFace(chunks[0], params);
      } else {
        const chunkSummaries = await Promise.all(
          chunks.map(c => callHuggingFace(c, LENGTH_PARAMS.medium)),

        );
        const combined = chunkSummaries.join(' ');
        summary = combined.length > MAX_CHUNK_CHARS
          ? await callHuggingFace(combined.slice(0, MAX_CHUNK_CHARS), params)
          : combined;
      }
    }

    return NextResponse.json({ summary });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Summarization failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
