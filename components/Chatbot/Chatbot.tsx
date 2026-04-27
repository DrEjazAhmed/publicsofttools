'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Chatbot.module.css';

// ── Types ─────────────────────────────────────────────────────────────

interface Message {
  from: 'bot' | 'user';
  text: string;
  quickReplies?: string[];
}

type ConvState =
  | 'idle'
  | 'browsing_categories'
  | 'browsing_tools'
  | 'awaiting_suggestion'
  | 'awaiting_issue';

// ── Category + tool registry ──────────────────────────────────────────

interface Tool {
  label: string;
  description: string;
  path: string;
  keywords: string[];
}

interface Category {
  label: string;
  emoji: string;
  description: string;
  tools: Tool[];
  keywords: string[];
}

const CATEGORIES: Category[] = [
  {
    label: 'File Tools',
    emoji: '📁',
    description: 'Work with PDFs and images',
    keywords: ['file', 'pdf', 'image', 'document', 'convert', 'photo', 'picture'],
    tools: [
      {
        label: 'PDF Editor',
        description: 'View, annotate and edit PDF files in your browser',
        path: '/tools/pdf-editor',
        keywords: ['pdf', 'pdf editor', 'edit pdf', 'document', 'annotate'],
      },
      {
        label: 'Image Converter',
        description: 'Convert images between PNG, JPG, WebP and more',
        path: '/tools/image-converter',
        keywords: ['image', 'image converter', 'convert image', 'photo', 'picture', 'jpg', 'png', 'webp'],
      },
    ],
  },
  {
    label: 'Text Tools',
    emoji: '✏️',
    description: 'Count, convert and encode text',
    keywords: ['text', 'word', 'case', 'encode', 'decode', 'base64', 'url', 'json', 'formatter'],
    tools: [
      {
        label: 'Word Counter',
        description: 'Count words, characters, sentences and reading time',
        path: '/tools/text-tools',
        keywords: ['word', 'word count', 'word counter', 'character', 'reading time'],
      },
      {
        label: 'Case Converter',
        description: 'Switch between UPPER, lower, Title and Sentence case',
        path: '/tools/text-tools',
        keywords: ['case', 'case converter', 'upper', 'lower', 'title case', 'sentence case'],
      },
      {
        label: 'URL / Base64 Encoder',
        description: 'Encode and decode URL and Base64 strings',
        path: '/tools/text-tools',
        keywords: ['url', 'base64', 'encode', 'decode', 'encoder', 'decoder'],
      },
      {
        label: 'JSON Formatter',
        description: 'Beautify or minify JSON with validation',
        path: '/tools/text-tools',
        keywords: ['json', 'formatter', 'beautifier', 'beautify', 'minify'],
      },
    ],
  },
  {
    label: 'Generator Tools',
    emoji: '⚡',
    description: 'Generate codes and other assets',
    keywords: ['generate', 'generator', 'qr', 'qr code', 'barcode', 'scan'],
    tools: [
      {
        label: 'QR Code Generator',
        description: 'Generate and download QR codes from any text or URL',
        path: '/tools/qr-code-generator',
        keywords: ['qr', 'qr code', 'qrcode', 'barcode', 'scan', 'generate'],
      },
    ],
  },
  {
    label: 'Developer Tools',
    emoji: '⚙️',
    description: 'JWT decoder, regex tester and data format converter',
    keywords: ['developer', 'dev', 'jwt', 'token', 'regex', 'regexp', 'regular expression', 'csv', 'xml', 'convert', 'converter', 'data format'],
    tools: [
      {
        label: 'JWT Decoder',
        description: 'Decode and inspect JWT tokens — header, payload and expiry',
        path: '/tools/developer-tools',
        keywords: ['jwt', 'token', 'decode jwt', 'jwt decoder', 'json web token', 'auth token'],
      },
      {
        label: 'Regex Tester',
        description: 'Test regular expressions live with match highlighting',
        path: '/tools/developer-tools',
        keywords: ['regex', 'regexp', 'regular expression', 'pattern', 'match', 'regex tester'],
      },
      {
        label: 'JSON / CSV / XML Converter',
        description: 'Convert between JSON, CSV and XML formats instantly',
        path: '/tools/developer-tools',
        keywords: ['csv', 'xml', 'json csv', 'json xml', 'convert csv', 'data converter', 'format converter'],
      },
    ],
  },
];

// Flat tool list for direct keyword navigation
const ALL_TOOLS: (Tool & { categoryLabel: string })[] = CATEGORIES.flatMap(cat =>
  cat.tools.map(t => ({ ...t, categoryLabel: cat.label }))
);

// ── Intent detection (idle state only) ───────────────────────────────

function detectDirectTool(input: string) {
  const t = input.toLowerCase();
  return ALL_TOOLS.find(tool => tool.keywords.some(k => t.includes(k))) ?? null;
}

function detectDirectCategory(input: string) {
  const t = input.toLowerCase();
  return CATEGORIES.find(cat => cat.keywords.some(k => t.includes(k))) ?? null;
}

function detectIntent(input: string): 'navigate_tool' | 'navigate_category' | 'list' | 'suggest' | 'issue' | 'help' | 'home' | 'unknown' {
  const t = input.toLowerCase();
  if (t === 'home' || t === 'back' || t.includes('go home') || t.includes('home page') || t.includes('go back')) return 'home';
  if (detectDirectTool(t)) return 'navigate_tool';
  if (detectDirectCategory(t)) return 'navigate_category';
  if (['show', 'list', 'browse', 'available', 'what can', 'tools'].some(k => t.includes(k))) return 'list';
  if (['suggest', 'suggestion', 'idea', 'feature', 'request', 'improve', 'feedback', 'recommend'].some(k => t.includes(k))) return 'suggest';
  if (['bug', 'issue', 'problem', 'error', 'broken', 'not working', 'fix', 'report', 'crash', 'fail'].some(k => t.includes(k))) return 'issue';
  if (['hi', 'hello', 'hey', 'help', 'what', 'options', 'start', 'how'].some(k => t.includes(k))) return 'help';
  return 'unknown';
}

// ── Helpers ───────────────────────────────────────────────────────────

function categoriesMessage(): Message {
  return {
    from: 'bot',
    text: "Here are our tool categories — pick one to explore:",
    quickReplies: CATEGORIES.map(c => `${c.emoji} ${c.label}`),
  };
}

function toolsMessage(cat: Category): Message {
  const lines = cat.tools.map(t => `• ${t.label} — ${t.description}`).join('\n');
  return {
    from: 'bot',
    text: `${cat.emoji} ${cat.label}\n\n${lines}\n\nWhich one would you like to open?`,
    quickReplies: [...cat.tools.map(t => t.label), '← Back to categories'],
  };
}

// ── Feedback API call ─────────────────────────────────────────────────

async function saveFeedback(type: 'suggestion' | 'issue', content: string) {
  try {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, content }),
    });
  } catch {
    // silently fail — feedback is non-critical
  }
}

// ── Component ─────────────────────────────────────────────────────────

export default function Chatbot() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    from: 'bot',
    text: "Hi there! 👋 I'm the PublicSoftTools assistant. I can help you find the right tool, take your suggestions, or log any issues. What would you like to do?",
    quickReplies: ['Show all tools', 'I have a suggestion', 'Report an issue'],
  }]);
  const [input, setInput] = useState('');
  const [convState, setConvState] = useState<ConvState>('idle');
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const seen = sessionStorage.getItem('chatbot_nudge_seen');
    if (!seen) {
      const t = setTimeout(() => {
        setNudge(true);
        sessionStorage.setItem('chatbot_nudge_seen', '1');
      }, 4000);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const pushBot = useCallback((msg: Message) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  const pushUser = useCallback((text: string) => {
    setMessages(prev => [...prev, { from: 'user', text }]);
  }, []);

  const handleOpen = useCallback(() => { setNudge(false); setOpen(true); }, []);
  const handleClose = useCallback(() => setOpen(false), []);

  const processMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    pushUser(trimmed);
    setInput('');

    const t = trimmed.toLowerCase();

    // ── Multi-step: suggestion / issue collection ──────────────────────
    if (convState === 'awaiting_suggestion') {
      saveFeedback('suggestion', trimmed);
      setConvState('idle');
      pushBot({
        from: 'bot',
        text: "Thanks for your suggestion! We'll review it and consider it for a future update. 🙏",
        quickReplies: ['Show all tools', 'Report an issue'],
      });
      return;
    }

    if (convState === 'awaiting_issue') {
      saveFeedback('issue', trimmed);
      setConvState('idle');
      pushBot({
        from: 'bot',
        text: "Got it — your issue has been logged. We'll look into it as soon as possible. 🔧",
        quickReplies: ['Show all tools', 'I have a suggestion'],
      });
      return;
    }

    // ── Browse: category selected, now pick a tool ─────────────────────
    if (convState === 'browsing_tools' && activeCategory) {
      if (t.includes('back') || t.includes('categor')) {
        setConvState('browsing_categories');
        setActiveCategory(null);
        pushBot(categoriesMessage());
        return;
      }
      const tool = activeCategory.tools.find(tool =>
        t.includes(tool.label.toLowerCase()) ||
        tool.keywords.some(k => t.includes(k))
      );
      if (tool) {
        pushBot({ from: 'bot', text: `Opening ${tool.label}…` });
        setTimeout(() => router.push(tool.path), 600);
        setConvState('idle');
        setActiveCategory(null);
        return;
      }
      // Unrecognised — re-prompt within same category
      pushBot({
        from: 'bot',
        text: "I didn't catch that. Please pick one of the tools below:",
        quickReplies: [...activeCategory.tools.map(tool => tool.label), '← Back to categories'],
      });
      return;
    }

    // ── Browse: waiting for category pick ─────────────────────────────
    if (convState === 'browsing_categories') {
      const cat = CATEGORIES.find(c =>
        t.includes(c.label.toLowerCase()) ||
        c.keywords.some(k => t.includes(k))
      );
      if (cat) {
        setActiveCategory(cat);
        setConvState('browsing_tools');
        pushBot(toolsMessage(cat));
        return;
      }
      pushBot({
        from: 'bot',
        text: "Please choose one of the categories below:",
        quickReplies: CATEGORIES.map(c => `${c.emoji} ${c.label}`),
      });
      return;
    }

    // ── Idle: detect intent ────────────────────────────────────────────
    const intent = detectIntent(trimmed);

    if (intent === 'home') {
      router.push('/');
      pushBot({
        from: 'bot',
        text: "Taking you to the home page!",
        quickReplies: ['Show all tools', 'I have a suggestion', 'Report an issue'],
      });
      return;
    }

    if (intent === 'navigate_tool') {
      const tool = detectDirectTool(trimmed);
      if (tool) {
        pushBot({ from: 'bot', text: `Opening ${tool.label}…` });
        setTimeout(() => router.push(tool.path), 600);
        return;
      }
    }

    if (intent === 'navigate_category') {
      const cat = detectDirectCategory(trimmed);
      if (cat) {
        setActiveCategory(cat);
        setConvState('browsing_tools');
        pushBot(toolsMessage(cat));
        return;
      }
    }

    if (intent === 'list') {
      setConvState('browsing_categories');
      pushBot(categoriesMessage());
      return;
    }

    if (intent === 'suggest') {
      setConvState('awaiting_suggestion');
      pushBot({ from: 'bot', text: "I'd love to hear your idea! Please describe your suggestion:" });
      return;
    }

    if (intent === 'issue') {
      setConvState('awaiting_issue');
      pushBot({ from: 'bot', text: "Sorry to hear something's not working. Please describe the issue and which tool it's on:" });
      return;
    }

    if (intent === 'help') {
      pushBot({
        from: 'bot',
        text: "I can help you with:\n• Browse and navigate to any tool\n• Submit a suggestion or feature request\n• Report a bug or issue\n\nWhat would you like to do?",
        quickReplies: ['Show all tools', 'I have a suggestion', 'Report an issue'],
      });
      return;
    }

    pushBot({
      from: 'bot',
      text: "I'm not sure I understand. Here's what I can help with:",
      quickReplies: ['Show all tools', 'I have a suggestion', 'Report an issue'],
    });
  }, [convState, activeCategory, pushBot, pushUser, router]);

  const handleSend = useCallback(() => processMessage(input), [input, processMessage]);

  const handleKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  }, [handleSend]);

  const placeholderText =
    convState === 'awaiting_suggestion' ? 'Type your suggestion…' :
    convState === 'awaiting_issue'      ? 'Describe the issue…' :
    convState === 'browsing_categories' ? 'Pick a category…' :
    convState === 'browsing_tools'      ? 'Pick a tool…' :
    'Ask me anything…';

  return (
    <>
      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.headerInfo}>
              <div className={styles.avatar}>P</div>
              <div>
                <div className={styles.botName}>PublicSoftTools Assistant</div>
                <div className={styles.botStatus}>Always here to help</div>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={handleClose} aria-label="Close chat">✕</button>
          </div>

          <div className={styles.messages}>
            {messages.map((msg, i) => (
              <div key={i} className={msg.from === 'bot' ? styles.botRow : styles.userRow}>
                <div className={msg.from === 'bot' ? styles.botBubble : styles.userBubble}>
                  {msg.text}
                </div>
                {msg.quickReplies && (
                  <div className={styles.quickReplies}>
                    {msg.quickReplies.map(qr => (
                      <button key={qr} className={styles.quickReply} onClick={() => processMessage(qr)}>
                        {qr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.inputRow}>
            <input
              ref={inputRef}
              className={styles.input}
              type="text"
              placeholder={placeholderText}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
            />
            <button
              className={styles.sendBtn}
              onClick={handleSend}
              disabled={!input.trim()}
              aria-label="Send"
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {nudge && !open && (
        <div className={styles.nudge} onClick={handleOpen}>
          👋 Need help finding a tool?
        </div>
      )}

      <button
        className={`${styles.bubble} ${open ? styles.bubbleOpen : ''}`}
        onClick={open ? handleClose : handleOpen}
        aria-label="Open chat assistant"
      >
        {open ? '✕' : '💬'}
      </button>
    </>
  );
}
