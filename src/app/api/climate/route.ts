import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function slope(values: { x: number; y: number }[]) {
  if (values.length < 2) return 0;
  const mx = values.reduce((s, v) => s + v.x, 0) / values.length;
  const my = values.reduce((s, v) => s + v.y, 0) / values.length;
  const num = values.reduce((s, v) => s + (v.x - mx) * (v.y - my), 0);
  const den = values.reduce((s, v) => s + (v.x - mx) ** 2, 0);
  return den ? num / den : 0;
}

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get('lat'));
  const lng = Number(req.nextUrl.searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ error: 'Coordinates required' }, { status: 400 });

  const endYear = new Date().getUTCFullYear() - 1;
  const startYear = endYear - 9;
  const start = `${startYear}-01-01`;
  const end = `${endYear}-12-31`;

  try {
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${start}&end_date=${end}&daily=temperature_2m_mean,temperature_2m_max,precipitation_sum&timezone=UTC`;
    const r = await fetch(url, { next: { revalidate: 86400 } });
    if (!r.ok) throw new Error('Historical provider error');
    const d = await r.json();

    const byYear = new Map<number, { temps: number[]; maxes: number[]; rain: number }>();
    (d.daily?.time || []).forEach((date: string, i: number) => {
      const year = Number(date.slice(0, 4));
      const row = byYear.get(year) || { temps: [], maxes: [], rain: 0 };
      const t = Number(d.daily.temperature_2m_mean?.[i]);
      const max = Number(d.daily.temperature_2m_max?.[i]);
      const rain = Number(d.daily.precipitation_sum?.[i]);
      if (Number.isFinite(t)) row.temps.push(t);
      if (Number.isFinite(max)) row.maxes.push(max);
      if (Number.isFinite(rain)) row.rain += rain;
      byYear.set(year, row);
    });

    const years = [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, row]) => ({
      year,
      avgTemperature: row.temps.length ? Number((row.temps.reduce((a, b) => a + b, 0) / row.temps.length).toFixed(2)) : 0,
      annualRainfall: Number(row.rain.toFixed(1)),
      maxTemperature: row.maxes.length ? Number(Math.max(...row.maxes).toFixed(1)) : 0
    }));

    const tempSlope = slope(years.map(y => ({ x: y.year, y: y.avgTemperature })));
    const rainSlope = slope(years.map(y => ({ x: y.year, y: y.annualRainfall })));

    return NextResponse.json({
      climate: {
        years,
        temperatureTrendPerDecade: Number((tempSlope * 10).toFixed(2)),
        rainfallTrendPerDecade: Number((rainSlope * 10).toFixed(1)),
        source: 'Open-Meteo Historical Weather Archive'
      }
    });
  } catch (e) {
    return NextResponse.json({ error: 'Historical climate data is temporarily unavailable.' }, { status: 502 });
  }
}
