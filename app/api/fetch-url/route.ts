import { NextRequest, NextResponse } from 'next/server';

function stripHtml(html: string): string {
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  return text.replace(/\s+/g, ' ').trim();
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url?.trim()) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Only HTTP/HTTPS URLs are supported' }, { status: 400 });
    }

    const res = await fetch(url.trim(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PublicSoftTools-Summarizer/1.0)' },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Could not fetch URL (HTTP ${res.status})` }, { status: 400 });
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/')) {
      return NextResponse.json({ error: 'URL does not return readable text content' }, { status: 400 });
    }

    const html = await res.text();
    const text = stripHtml(html);

    if (text.length < 100) {
      return NextResponse.json({ error: 'Could not extract enough text from this URL' }, { status: 400 });
    }

    return NextResponse.json({ text: text.slice(0, 50000) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch URL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
