import { Persona, RiskAnalysis, Severity, WeatherBundle } from './types';

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

export function severityFromScore(score: number): Severity {
  if (score >= 65) return 'High';
  if (score >= 35) return 'Medium';
  return 'Low';
}

function hourlyRisk(p: WeatherBundle['hourly'][number]) {
  const rain = clamp(p.precipitationProbability * 0.45 + p.precipitation * 8);
  const wind = clamp((p.windGust - 20) * 2.2);
  const heat = clamp((p.temperature - 32) * 9);
  const storm = [95, 96, 99].includes(p.weatherCode) ? 90 : clamp(rain * 0.5 + wind * 0.5);
  return clamp(rain * 0.34 + wind * 0.26 + heat * 0.18 + storm * 0.22);
}

export function analyzeRisk(bundle: WeatherBundle): RiskAnalysis {
  const next24 = bundle.hourly.slice(0, 24);
  const totalRain = next24.reduce((s, p) => s + p.precipitation, 0);
  const maxRainProb = Math.max(0, ...next24.map(p => p.precipitationProbability));
  const maxGust = Math.max(bundle.current.windGust, ...next24.map(p => p.windGust));
  const maxTemp = Math.max(bundle.current.temperature, ...next24.map(p => p.temperature));
  const hasThunder = next24.some(p => [95, 96, 99].includes(p.weatherCode));

  const flood = clamp(totalRain * 6 + maxRainProb * 0.45);
  const wind = clamp((maxGust - 20) * 2.5);
  const heat = clamp((maxTemp - 32) * 10);
  const storm = clamp((hasThunder ? 70 : 0) + flood * 0.18 + wind * 0.28);
  const score = Math.round(clamp(flood * 0.32 + wind * 0.24 + heat * 0.18 + storm * 0.26));

  const factors = [
    { label: '24h rainfall', value: `${totalRain.toFixed(1)} mm`, contribution: Math.round(flood * 0.32) },
    { label: 'Peak rain chance', value: `${Math.round(maxRainProb)}%`, contribution: Math.round(maxRainProb * 0.12) },
    { label: 'Peak wind gust', value: `${maxGust.toFixed(1)} km/h`, contribution: Math.round(wind * 0.24) },
    { label: 'Peak temperature', value: `${maxTemp.toFixed(1)}°C`, contribution: Math.round(heat * 0.18) }
  ].sort((a, b) => b.contribution - a.contribution);

  const alerts: RiskAnalysis['alerts'] = [];
  if (flood >= 45) alerts.push({
    id: 'rain-risk', type: 'Heavy Rain / Flood', title: 'Heavy-rain risk detected', severity: severityFromScore(flood),
    message: `The next 24 hours show ${totalRain.toFixed(1)} mm estimated precipitation with peak probability near ${Math.round(maxRainProb)}%.`,
    start: next24[0]?.time || bundle.updatedAt,
    action: 'Avoid low-lying or waterlogged routes and monitor official local warnings.'
  });
  if (wind >= 45) alerts.push({
    id: 'wind-risk', type: 'Strong Wind', title: 'Strong-wind risk detected', severity: severityFromScore(wind),
    message: `Peak gusts may reach about ${maxGust.toFixed(1)} km/h in the next 24 hours.`,
    start: next24[0]?.time || bundle.updatedAt,
    action: 'Secure loose outdoor objects and avoid exposed areas during peak gusts.'
  });
  if (heat >= 45) alerts.push({
    id: 'heat-risk', type: 'Heat', title: 'Heat-stress risk detected', severity: severityFromScore(heat),
    message: `Maximum temperature may reach about ${maxTemp.toFixed(1)}°C.`,
    start: next24[0]?.time || bundle.updatedAt,
    action: 'Prefer cooler hours, stay hydrated, and reduce prolonged outdoor exposure.'
  });
  if (storm >= 55) alerts.push({
    id: 'storm-risk', type: 'Thunderstorm', title: 'Storm conditions possible', severity: severityFromScore(storm),
    message: hasThunder ? 'Thunderstorm weather codes appear in the next 24-hour forecast.' : 'Rain and wind together raise the storm-impact score.',
    start: next24.find(p => [95, 96, 99].includes(p.weatherCode))?.time || next24[0]?.time || bundle.updatedAt,
    action: 'Move activities indoors when thunder is nearby and follow official emergency guidance.'
  });

  let safestWindow: RiskAnalysis['safestWindow'] = null;
  if (next24.length >= 3) {
    let bestIndex = 0;
    let best = Infinity;
    for (let i = 0; i <= next24.length - 3; i++) {
      const avg = (hourlyRisk(next24[i]) + hourlyRisk(next24[i + 1]) + hourlyRisk(next24[i + 2])) / 3;
      if (avg < best) {
        best = avg;
        bestIndex = i;
      }
    }
    safestWindow = {
      start: next24[bestIndex].time,
      end: next24[bestIndex + 2].time,
      score: Math.round(best)
    };
  }

  return { score, severity: severityFromScore(score), flood: Math.round(flood), heat: Math.round(heat), wind: Math.round(wind), storm: Math.round(storm), factors, alerts, safestWindow };
}

export function personaAdvice(persona: Persona, bundle: WeatherBundle, risk: RiskAnalysis): string[] {
  const rain = risk.flood >= 35;
  const hot = risk.heat >= 35;
  const windy = risk.wind >= 35;

  if (persona === 'farmer') return [
    rain ? 'Delay spraying or fertilizer application during the higher-rain period.' : 'Rain risk is limited; field work can follow normal precautions.',
    hot ? 'Schedule labour and irrigation checks in cooler hours.' : 'Heat stress is not the main risk in the next 24 hours.',
    risk.safestWindow ? `Lower-risk 3-hour field window: ${formatHour(risk.safestWindow.start)} to ${formatHour(risk.safestWindow.end)}.` : 'No safe-window estimate available.'
  ];

  if (persona === 'traveler') return [
    rain ? 'Allow extra travel time and avoid flood-prone or waterlogged routes.' : 'No major rainfall disruption is indicated by the current forecast.',
    windy ? 'Take care on exposed roads and around temporary structures.' : 'Strong wind is not the main travel concern.',
    risk.safestWindow ? `Lowest-risk travel window: ${formatHour(risk.safestWindow.start)} to ${formatHour(risk.safestWindow.end)}.` : 'No safe-window estimate available.'
  ];

  if (persona === 'disaster') return [
    `Overall forecast-derived impact score: ${risk.score}/100 (${risk.severity}).`,
    risk.alerts.length ? `Prioritize ${risk.alerts.map(a => a.type).join(', ')} monitoring.` : 'No high-threshold forecast hazards are currently detected.',
    'Use this AI estimate for decision support; verify official alerts before emergency action.'
  ];

  return [
    risk.alerts.length ? 'Check the active risk cards before outdoor plans.' : 'No major forecast-derived hazard threshold is currently crossed.',
    rain ? 'Carry rain protection and avoid waterlogged areas.' : 'Rain is not the main concern in the next 24 hours.',
    risk.safestWindow ? `Lower-risk outdoor window: ${formatHour(risk.safestWindow.start)} to ${formatHour(risk.safestWindow.end)}.` : 'No safe-window estimate available.'
  ];
}

function formatHour(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
