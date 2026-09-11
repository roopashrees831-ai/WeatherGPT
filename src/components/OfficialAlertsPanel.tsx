'use client';

import React from 'react';
import { AlertTriangle, BadgeCheck, ExternalLink, ShieldCheck } from 'lucide-react';
import type { OfficialAlert } from '@/lib/types';
import { t } from '@/lib/i18n';

interface Props { alerts: OfficialAlert[]; status: string; loading: boolean; language: string; }

export default function OfficialAlertsPanel({ alerts, status, loading, language }: Props) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div><span className="eyebrow"><BadgeCheck size={14}/> {t(language,'officialEyebrow')}</span><h2>{t(language,'officialWarnings')}</h2></div>
        <span className="live-pill">{t(language,'officialLive')}</span>
      </div>
      {loading ? <p className="muted">{t(language,'checkingWarnings')}</p> : alerts.length ? (
        <div className="official-alert-list">
          {alerts.map((a) => <div key={a.id} className={`official-alert official-${a.color.toLowerCase()}`}><AlertTriangle size={19}/><div><div className="official-alert-title"><b>{a.warning}</b><span>{a.color}</span></div><p>{a.district} · {t(language,'day')} {a.day}</p><small>{t(language,'issued')} {a.issueDate || '—'} {a.issueTime ? `${a.issueTime} UTC` : ''}</small><a href={a.sourceUrl} target="_blank" rel="noreferrer">{t(language,'officialSource')} <ExternalLink size={11}/></a></div></div>)}
        </div>
      ) : <div className="no-alert"><ShieldCheck size={20}/><div><b>{t(language,'noOfficial')}</b><span>{status}</span></div></div>}
    </section>
  );
}
