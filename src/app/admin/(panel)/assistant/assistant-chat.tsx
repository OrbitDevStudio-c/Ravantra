"use client";

import * as React from "react";
import { ArrowUp, RotateCcw, Sparkles, Square } from "lucide-react";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Summarise the last 30 days for me",
  "Which division is performing best, and why?",
  "What needs my attention today?",
  "Draft a restock list from low-stock items",
  "How are salon appointments trending?",
  "Compare this month's revenue with last month",
];

export function AssistantChat({ firstName }: { firstName: string }) {
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const abort = React.useRef<AbortController | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setError(null);
    const history: Msg[] = [...messages, { role: "user", content: q }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const res = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Something went wrong.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: text }]);
      }
      if (!text.trim()) throw new Error("The assistant returned an empty answer. Please try again.");
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setMessages((m) => (m[m.length - 1]?.content ? m : m.slice(0, -1)));
      } else {
        setMessages(history);
        setError((e as Error).message);
      }
    } finally {
      setBusy(false);
      abort.current = null;
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-14rem)] flex-col border border-line bg-plum">
      <div className="flex-1 space-y-6 overflow-y-auto p-5 md:p-8" aria-live="polite">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-2xl py-6 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-burgundy-soft text-blush">
              <Sparkles className="size-5" strokeWidth={1.5} />
            </span>
            <p className="mt-5 font-serif text-3xl text-ink">Hello {firstName}, what would you like to know?</p>
            <p className="mt-2 text-sm text-ink-soft">Try one of these to start.</p>
            <div className="mt-8 grid gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="border border-line px-4 py-3 text-left text-sm text-ink transition-colors hover:border-blush hover:bg-burgundy-soft"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "user" ? (
                <p className="max-w-[85%] whitespace-pre-wrap bg-white px-4 py-2.5 text-sm text-midnight">{m.content}</p>
              ) : (
                <div className="flex max-w-[92%] gap-3">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-burgundy-soft text-blush" aria-hidden>
                    <Sparkles className="size-3.5" strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0 text-sm leading-relaxed text-ink">
                    {m.content ? <Markdown text={m.content} /> : <TypingDots />}
                    {busy && i === messages.length - 1 && m.content && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-burgundy align-middle" aria-hidden />}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        {error && <p className="border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
        <div ref={endRef} />
      </div>

      <form
        className="border-t border-line p-3 md:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <div className="flex items-end gap-2 border border-line-strong bg-midnight/40 p-2 focus-within:border-blush">
          <label htmlFor="assistant-input" className="sr-only">Ask the assistant</label>
          <textarea
            id="assistant-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder="Ask about sales, stock, orders or appointments…"
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink placeholder:text-ink-mute focus:outline-none"
          />
          {messages.length > 0 && !busy && (
            <button type="button" onClick={() => { setMessages([]); setError(null); }} className="grid size-10 place-items-center text-ink-mute transition-colors hover:text-ink" aria-label="New conversation" title="New conversation">
              <RotateCcw className="size-4" strokeWidth={1.5} />
            </button>
          )}
          {busy ? (
            <button type="button" onClick={() => abort.current?.abort()} className="grid size-10 place-items-center bg-white text-midnight" aria-label="Stop answering">
              <Square className="size-3.5" fill="currentColor" />
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} className="grid size-10 place-items-center bg-burgundy text-porcelain transition-colors hover:bg-burgundy-deep disabled:opacity-40" aria-label="Send">
              <ArrowUp className="size-4" strokeWidth={2} />
            </button>
          )}
        </div>
        <p className="mt-2 px-1 text-[0.68rem] text-ink-mute">AI can make mistakes — double-check important figures in Reports. Enter to send, Shift+Enter for a new line.</p>
      </form>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-1.5" aria-label="Thinking">
      {[0, 150, 300].map((d) => (
        <span key={d} className="size-1.5 animate-bounce rounded-full bg-ink-mute" style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
  );
}

/** Minimal, safe markdown: headings, bullet/numbered lists, **bold**, paragraphs. No HTML injection. */
function Markdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={blocks.length} className={cn("my-2 space-y-1 pl-5", list.ordered ? "list-decimal" : "list-disc marker:text-gold")}>
        {list.items.map((it, i) => <li key={i}><Inline text={it} /></li>)}
      </Tag>,
    );
    list = null;
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const num = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const heading = /^#{1,4}\s+(.*)$/.exec(line);
    if (bullet || num) {
      const ordered = Boolean(num);
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? num)![1]);
      continue;
    }
    flush();
    if (heading) blocks.push(<p key={blocks.length} className="mb-1 mt-3 font-semibold text-ink"><Inline text={heading[1]} /></p>);
    else if (line.trim()) blocks.push(<p key={blocks.length} className="my-1.5"><Inline text={line} /></p>);
  }
  flush();
  return <>{blocks}</>;
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>,
      )}
    </>
  );
}
