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

type ConvState = 'idle' | 'awaiting_suggestion' | 'awaiting_issue';

// ── Tool registry ─────────────────────────────────────────────────────

const TOOLS = [
  {
    label: 'PDF Editor',
    path: '/tools/pdf-editor',
    keywords: ['pdf', 'pdf editor', 'edit pdf', 'document', 'annotate'],
  },
  {
    label: 'Image Converter',
    path: '/tools/image-converter',
    keywords: ['image', 'image converter', 'convert image', 'photo', 'picture', 'jpg', 'png', 'webp', 'convert'],
  },
  {
    label: 'QR Code Generator',
    path: '/tools/qr-code-generator',
    keywords: ['qr', 'qr code', 'qrcode', 'barcode', 'scan'],
  },
  {
    label: 'Text Tools',
    path: '/tools/text-tools',
    keywords: ['text', 'text tools', 'word count', 'word counter', 'case', 'case converter', 'upper', 'lower', 'title case', 'base64', 'url encode', 'encoder', 'decoder', 'json', 'formatter', 'beautifier', 'minify'],
  },
];

// ── Intent detection ──────────────────────────────────────────────────

function detectTool(input: string) {
  const t = input.toLowerCase();
  return TOOLS.find(tool => tool.keywords.some(k => t.includes(k))) ?? null;
}

function detectIntent(input: string): 'navigate' | 'list' | 'suggest' | 'issue' | 'help' | 'home' | 'unknown' {
  const t = input.toLowerCase();
  if (t.includes('home') || t === 'back' || t.includes('all tools') || t.includes('go back')) return 'home';
  if (detectTool(t)) return 'navigate';
  if (['show', 'list', 'tools', 'available', 'what can'].some(k => t.includes(k))) return 'list';
  if (['suggest', 'suggestion', 'idea', 'feature', 'request', 'improve', 'feedback', 'recommend'].some(k => t.includes(k))) return 'suggest';
  if (['bug', 'issue', 'problem', 'error', 'broken', 'not working', 'fix', 'report', 'crash', 'fail'].some(k => t.includes(k))) return 'issue';
  if (['hi', 'hello', 'hey', 'help', 'what', 'options', 'start', 'how'].some(k => t.includes(k))) return 'help';
  return 'unknown';
}

// ── Static responses ──────────────────────────────────────────────────

const WELCOME: Message = {
  from: 'bot',
  text: "Hi there! 👋 I'm the PublicSoftTools assistant. I can help you find the right tool, take your suggestions, or log any issues. What would you like to do?",
  quickReplies: ['Show all tools', 'I have a suggestion', 'Report an issue'],
};

const TOOL_LIST: Message = {
  from: 'bot',
  text: "Here are all the available tools:",
  quickReplies: ['PDF Editor', 'Image Converter', 'QR Code Generator', 'Text Tools'],
};

const HELP: Message = {
  from: 'bot',
  text: "I can help you with:\n• Navigate to a tool (PDF, image, QR code, text tools)\n• Submit a suggestion or feature request\n• Report a bug or issue\n\nJust type what you need or pick an option:",
  quickReplies: ['Show all tools', 'I have a suggestion', 'Report an issue'],
};

const UNKNOWN: Message = {
  from: 'bot',
  text: "I'm not sure I understand. Here's what I can help with:",
  quickReplies: ['Show all tools', 'I have a suggestion', 'Report an issue'],
};

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
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [convState, setConvState] = useState<ConvState>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Show nudge tooltip after 4 seconds on first visit
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

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const pushBot = useCallback((msg: Message) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  const pushUser = useCallback((text: string) => {
    setMessages(prev => [...prev, { from: 'user', text }]);
  }, []);

  const handleOpen = useCallback(() => {
    setNudge(false);
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => setOpen(false), []);

  const processMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    pushUser(trimmed);
    setInput('');

    // Multi-step flows
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

    // Idle: detect intent
    const intent = detectIntent(trimmed);

    if (intent === 'home') {
      router.push('/');
      pushBot({
        from: 'bot',
        text: "Taking you to the home page now!",
        quickReplies: ['Show all tools', 'I have a suggestion', 'Report an issue'],
      });
      return;
    }

    if (intent === 'navigate') {
      const tool = detectTool(trimmed);
      if (tool) {
        pushBot({
          from: 'bot',
          text: `Opening ${tool.label} for you…`,
        });
        setTimeout(() => router.push(tool.path), 600);
        return;
      }
    }

    if (intent === 'list') {
      pushBot(TOOL_LIST);
      return;
    }

    if (intent === 'suggest') {
      setConvState('awaiting_suggestion');
      pushBot({
        from: 'bot',
        text: "I'd love to hear your idea! Please describe your suggestion:",
      });
      return;
    }

    if (intent === 'issue') {
      setConvState('awaiting_issue');
      pushBot({
        from: 'bot',
        text: "Sorry to hear something's not working. Please describe the issue and which tool it's on:",
      });
      return;
    }

    if (intent === 'help') {
      pushBot(HELP);
      return;
    }

    pushBot(UNKNOWN);
  }, [convState, pushBot, pushUser, router]);

  const handleSend = useCallback(() => {
    processMessage(input);
  }, [input, processMessage]);

  const handleKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  }, [handleSend]);

  const placeholderText =
    convState === 'awaiting_suggestion' ? 'Type your suggestion…' :
    convState === 'awaiting_issue' ? 'Describe the issue…' :
    'Ask me anything…';

  return (
    <>
      {/* Chat panel */}
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
            <button className={styles.closeBtn} onClick={handleClose} aria-label="Close chat">
              ✕
            </button>
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
                      <button
                        key={qr}
                        className={styles.quickReply}
                        onClick={() => processMessage(qr)}
                      >
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

      {/* Nudge tooltip */}
      {nudge && !open && (
        <div className={styles.nudge} onClick={handleOpen}>
          👋 Need help finding a tool?
        </div>
      )}

      {/* Floating bubble */}
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
