'use client';
import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import type { RiskAnalysis } from '@/lib/types';
import { riskLabel, t } from '@/lib/i18n';

export default function RiskPanel({ risk, language }: { risk: RiskAnalysis; language: string }) {
  const highMeasures = [
    ...(risk.flood >= 45 ? [t(language,'measureFlood')] : []),
    ...(risk.wind >= 45 ? [t(language,'measureWind')] : []),
    ...(risk.storm >= 45 ? [t(language,'measureStorm')] : []),
    ...(risk.heat >= 45 ? [t(language,'measureHeat')] : []),
    t(language,'measureGeneral'),
  ].slice(0,4);

  return <section className="panel">
    <div className="panel-head"><div><span className="eyebrow"><ShieldCheck size={14}/> {t(language,'riskEyebrow')}</span><h2>{t(language,'impactEngine')}</h2></div><div className={`score-badge sev-${risk.severity.toLowerCase()}`}>{riskLabel(language,risk.severity)} · {risk.score}/100</div></div>
    <div className="risk-bars">{[[t(language,'flood'),risk.flood],[t(language,'wind'),risk.wind],[t(language,'heat'),risk.heat],[t(language,'storm'),risk.storm]].map(([k,v])=><div key={String(k)}><span>{k}</span><div><i style={{width:`${v}%`}}/></div><b>{v}</b></div>)}</div>
    <div className="factor-box"><b>{t(language,'whyScore')}</b>{risk.factors.slice(0,3).map(f=><div key={f.label}><span>{f.label}</span><strong>{f.value}</strong></div>)}</div>

    {risk.severity === 'High' && <div className="high-measures-card"><div className="high-measures-title"><AlertTriangle size={18}/><b>{t(language,'highRiskMeasures')}</b></div>{highMeasures.map((m,i)=><p key={i}>• {m}</p>)}</div>}

    <div className="alerts-stack">{risk.alerts.length ? risk.alerts.map(a=><div key={a.id} className={`alert-card sev-${a.severity.toLowerCase()}`}><AlertTriangle size={18}/><div><b>{a.title}</b><p>{a.message}</p><small>{a.action}</small></div></div>) : <div className="no-alert"><ShieldCheck size={20}/><div><b>{t(language,'noMajorHazard')}</b><span>{t(language,'monitor')}</span></div></div>}</div>
    <p className="disclaimer">{t(language,'riskDisclaimer')}</p>
  </section>
}
