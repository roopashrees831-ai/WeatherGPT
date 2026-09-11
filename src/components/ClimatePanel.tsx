'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, Database, TrendingUp } from 'lucide-react';
import type { ClimateResult, LocationInfo } from '@/lib/types';
import { t } from '@/lib/i18n';

export default function ClimatePanel({ location, language }: { location: LocationInfo; language: string }) {
  const [data, setData] = useState<ClimateResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true); setError('');
    fetch(`/api/climate?lat=${location.latitude}&lng=${location.longitude}`)
      .then(r => r.json()).then(d => { if (d.climate) setData(d.climate); else setError(d.error || t(language,'climateUnavailable')); })
      .catch(()=>setError(t(language,'climateUnavailable'))).finally(()=>setLoading(false));
  }, [location.latitude, location.longitude, language]);

  if (loading) return <section className="panel"><h2>{t(language,'loadingClimate')}</h2></section>;
  if (!data) return <section className="panel"><h2>{t(language,'climate10')}</h2><p className="muted">{error}</p></section>;

  const maxRain = Math.max(1, ...data.years.map(y=>y.annualRainfall));
  const temps = data.years.map(y=>y.avgTemperature);
  const minT = Math.min(...temps)-1, maxT = Math.max(...temps)+1;

  return <section className="panel climate-panel">
    <div className="panel-head"><div><span className="eyebrow"><Database size={14}/> {t(language,'climateEyebrow')}</span><h2>{t(language,'climate10')}</h2></div><span className="source-pill">{data.source}</span></div>
    <div className="trend-cards">
      <div><TrendingUp size={19}/><span>{t(language,'tempTrend')}</span><strong>{data.temperatureTrendPerDecade>=0?'+':''}{data.temperatureTrendPerDecade}°C / 10y</strong></div>
      <div><BarChart3 size={19}/><span>{t(language,'rainTrend')}</span><strong>{data.rainfallTrendPerDecade>=0?'+':''}{data.rainfallTrendPerDecade} mm / 10y</strong></div>
    </div>
    <div className="climate-chart">{data.years.map(y => { const h = 20 + ((y.avgTemperature-minT)/(maxT-minT))*100; return <div key={y.year} className="climate-col" title={`${y.year}: ${y.avgTemperature}°C, ${y.annualRainfall} mm`}><span>{y.avgTemperature}°</span><i style={{height:h}}/><small>{String(y.year).slice(2)}</small></div> })}</div>
    <div className="rain-mini">{data.years.map(y=><div key={y.year}><span>{y.year}</span><i style={{width:`${(y.annualRainfall/maxRain)*100}%`}}/><b>{Math.round(y.annualRainfall)} mm</b></div>)}</div>
  </section>
}
