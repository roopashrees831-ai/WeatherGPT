'use client';
import React from 'react';
import { CloudRain, Droplets, Wind } from 'lucide-react';
import type { WeatherBundle } from '@/lib/types';
import { conditionText, t } from '@/lib/i18n';

export default function ForecastPanel({ bundle, language }: { bundle: WeatherBundle; language: string }) {
  return <section className="panel">
    <div className="panel-head"><div><span className="eyebrow">{t(language,'forecastEyebrow')}</span><h2>{t(language,'extendedForecast')}</h2></div><span className="source-pill">NOAA GFS</span></div>
    <div className="forecast-grid">{bundle.daily.map((d,i)=><div key={d.date} className={i===0?'forecast-card today':'forecast-card'}>
      <b>{i===0?t(language,'today'):new Date(`${d.date}T12:00:00`).toLocaleDateString(language, {weekday:'short'})}</b>
      <span className="condition">{conditionText(d.condition, language)}</span>
      <strong>{d.tempMax.toFixed(0)}° <em>{d.tempMin.toFixed(0)}°</em></strong>
      <small><CloudRain size={13}/>{Math.round(d.precipitationProbability)}%</small>
      <small><Droplets size={13}/>{d.precipitation.toFixed(1)} mm</small>
      <small><Wind size={13}/>{d.windSpeed.toFixed(0)} km/h</small>
    </div>)}</div>
  </section>
}
