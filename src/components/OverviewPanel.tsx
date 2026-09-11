'use client';
import React from 'react';
import { CloudRain, Droplets, Eye, Gauge, MapPin, Navigation, ThermometerSun, Wind } from 'lucide-react';
import type { WeatherBundle } from '@/lib/types';
import { conditionText, t } from '@/lib/i18n';

export default function OverviewPanel({ bundle, offline, language }: { bundle: WeatherBundle; offline: boolean; language: string }) {
  const c = bundle.current;
  return <>
    <section className="hero-weather">
      <div>
        <span className="eyebrow"><MapPin size={14}/>{bundle.location.admin1 ? `${bundle.location.admin1}, ` : ''}{bundle.location.country}</span>
        <h1>{bundle.location.name}</h1>
        <p>{conditionText(c.condition, language)} · {t(language,'feelsLike')} {c.feelsLike.toFixed(1)}°C</p>
        <div className="big-temp">{c.temperature.toFixed(1)}<small>°C</small></div>
      </div>
      <div className="hero-status"><span className={offline?'offline-dot':'live-dot'}/><b>{offline?t(language,'cachedData'):t(language,'liveData')}</b><small>{new Date(bundle.updatedAt).toLocaleString(language)}</small></div>
    </section>

    <div className="metric-grid">
      <Metric icon={Droplets} label={t(language,'humidity')} value={`${Math.round(c.humidity)}%`} />
      <Metric icon={Wind} label={t(language,'wind')} value={`${c.windSpeed.toFixed(1)} km/h`} />
      <Metric icon={CloudRain} label={t(language,'precipitation')} value={`${c.precipitation.toFixed(1)} mm`} />
      <Metric icon={Gauge} label={t(language,'pressure')} value={`${Math.round(c.pressure)} hPa`} />
      <Metric icon={ThermometerSun} label={t(language,'feelsLike')} value={`${c.feelsLike.toFixed(1)}°C`} />
      <Metric icon={Eye} label={t(language,'cloudCover')} value={`${Math.round(c.cloudCover)}%`} />
      <Metric icon={Navigation} label={t(language,'windDirection')} value={`${Math.round(c.windDirection)}°`} />
      <Metric icon={Gauge} label={t(language,'airQuality')} value={bundle.airQuality.aqi == null ? 'N/A' : `AQI ${Math.round(bundle.airQuality.aqi)}`} />
    </div>
  </>;
}

function Metric({icon:Icon,label,value,note}:{icon:any;label:string;value:string;note?:string}) {
  return <div className="metric-card"><Icon size={18}/><span>{label}</span><b>{value}</b>{note&&<small>{note}</small>}</div>
}
