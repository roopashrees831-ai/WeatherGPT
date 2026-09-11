'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bot, Mic, Send, ShieldCheck, Volume2 } from 'lucide-react';
import type { Persona, RiskAnalysis, WeatherBundle } from '@/lib/types';
import { speechCode, t } from '@/lib/i18n';

interface Props { bundle: WeatherBundle; risk: RiskAnalysis; persona: Persona; language: string; }
type Msg = { role: 'user' | 'assistant'; text: string; engine?: string };

declare global { interface Window { webkitSpeechRecognition?: any; SpeechRecognition?: any; } }

export default function ChatPanel({ bundle, risk, persona, language }: Props) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const bottom = useRef<HTMLDivElement>(null);
  const voiceQuestion = useRef(false);

  useEffect(() => {
    setMessages([{ role: 'assistant', text: t(language,'chatPlaceholder'), engine: t(language,'assistantTitle') }]);
  }, [language]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  function speak(text: string) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = speechCode(language);
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }

  async function send(text = input, fromVoice = false) {
    const q = text.trim();
    if (!q || busy) return;
    voiceQuestion.current = fromVoice;
    setMessages(m => [...m, { role: 'user', text: q }]);
    setInput('');
    setBusy(true);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: q, bundle, risk, persona, language })
      });
      const d = await r.json();
      const answer = d.answer || t(language,'chatPlaceholder');
      setMessages(m => [...m, { role: 'assistant', text: answer, engine: d.engine || 'WeatherGPT' }]);
      if (voiceQuestion.current) setTimeout(() => speak(answer), 100);
    } catch {
      const answer = t(language,'chatPlaceholder');
      setMessages(m => [...m, { role: 'assistant', text: answer, engine: 'WeatherGPT' }]);
      if (voiceQuestion.current) setTimeout(() => speak(answer), 100);
    } finally {
      setBusy(false);
      voiceQuestion.current = false;
    }
  }

  function startVoice() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return alert('Voice recognition requires Chrome or Edge.');
    const rec = new Recognition();
    rec.lang = speechCode(language);
    rec.interimResults = false;
    rec.continuous = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript || '';
      if (text) {
        setInput(text);
        send(text, true);
      }
    };
    rec.start();
  }

  const quick = [t(language,'askRain'), t(language,'askRisk'), t(language,'askTemp'), t(language,'askTravel')];

  return (
    <section className="panel chat-panel">
      <div className="panel-head">
        <div><span className="eyebrow"><ShieldCheck size={14}/> {t(language,'assistantEyebrow')}</span><h2><Bot size={21}/> {t(language,'assistantTitle')}</h2></div>
        <span className="live-pill">{t(language,'liveData')}</span>
      </div>

      <div className="assistant-context"><span>📍 {bundle.location.name}</span><span>🌡 {bundle.current.temperature.toFixed(1)}°C</span><span>🛡 {risk.score}/100</span></div>

      <div className="quick-row">{quick.map(x => <button key={x} onClick={() => send(x)} disabled={busy}>{x}</button>)}</div>

      <button
        className={`voice-talk-button ${listening ? 'listening' : ''}`}
        onClick={startVoice}
        disabled={busy}
        title={t(language,'askByVoice')}
      >
        <span className="voice-talk-icon"><Mic size={22}/></span>
        <span className="voice-talk-copy">
          <b>{t(language,'askByVoice')}</b>
          <small>{t(language,'chatPlaceholder')}</small>
        </span>
        <span className="voice-waves" aria-hidden="true">
          <i></i><i></i><i></i><i></i><i></i>
        </span>
      </button>

      <div className="messages">
        {messages.map((m, i) => <div key={`${m.role}-${i}`} className={`message ${m.role}`}><div>{m.text}</div>{m.role === 'assistant' && <div className="message-meta"><span>{m.engine || 'WeatherGPT'}</span><button onClick={() => speak(m.text)} title={t(language,'readAloud')}><Volume2 size={13}/></button></div>}</div>)}
        {busy && <div className="message assistant">{t(language,'analyzing')}</div>}
        <div ref={bottom}/>
      </div>

      <div className="composer">
        <button className={listening ? 'mic active' : 'mic'} onClick={startVoice} title={t(language,'askByVoice')}><Mic size={18}/></button>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send(); } }} placeholder={t(language,'chatPlaceholder')} />
        <button className="send" onClick={() => send()} disabled={busy || !input.trim()}><Send size={18}/></button>
      </div>
    </section>
  );
}
