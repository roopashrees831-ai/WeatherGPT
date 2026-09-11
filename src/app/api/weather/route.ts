import { NextRequest, NextResponse } from 'next/server';
import { weatherCodeToText } from '@/lib/weather-codes';

export const dynamic = 'force-dynamic';

const n = (v: any, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const latitude = Number(sp.get('lat'));
  const longitude = Number(sp.get('lng'));
  const name = sp.get('name') || 'Selected location';
  const country = sp.get('country') || '';
  const admin1 = sp.get('admin1') || '';

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: 'Valid latitude and longitude are required.' }, { status: 400 });
  }

  try {
    const forecastParams = new URLSearchParams({
      latitude: String(latitude), longitude: String(longitude), timezone: 'auto', forecast_days: '7',
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
      hourly: 'temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset'
    });

    const aqParams = new URLSearchParams({
      latitude: String(latitude), longitude: String(longitude), timezone: 'auto', current: 'us_aqi,pm2_5,pm10'
    });

    const [forecastRes, aqRes] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?${forecastParams.toString()}`, { cache: 'no-store' }),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${aqParams.toString()}`, { cache: 'no-store' }).catch(() => null)
    ]);

    if (!forecastRes.ok) throw new Error('Forecast provider error');
    const f = await forecastRes.json();
    const aq = aqRes && aqRes.ok ? await aqRes.json() : null;

    const hourly = (f.hourly?.time || []).map((time: string, i: number) => ({
      time,
      temperature: n(f.hourly.temperature_2m?.[i]),
      humidity: n(f.hourly.relative_humidity_2m?.[i]),
      precipitationProbability: n(f.hourly.precipitation_probability?.[i]),
      precipitation: n(f.hourly.precipitation?.[i]),
      rain: n(f.hourly.rain?.[i]),
      weatherCode: n(f.hourly.weather_code?.[i]),
      condition: weatherCodeToText(n(f.hourly.weather_code?.[i])),
      cloudCover: n(f.hourly.cloud_cover?.[i]),
      windSpeed: n(f.hourly.wind_speed_10m?.[i]),
      windGust: n(f.hourly.wind_gusts_10m?.[i])
    }));

    const daily = (f.daily?.time || []).map((date: string, i: number) => ({
      date,
      tempMax: n(f.daily.temperature_2m_max?.[i]),
      tempMin: n(f.daily.temperature_2m_min?.[i]),
      precipitation: n(f.daily.precipitation_sum?.[i]),
      precipitationProbability: n(f.daily.precipitation_probability_max?.[i]),
      windSpeed: n(f.daily.wind_speed_10m_max?.[i]),
      windGust: n(f.daily.wind_gusts_10m_max?.[i]),
      weatherCode: n(f.daily.weather_code?.[i]),
      condition: weatherCodeToText(n(f.daily.weather_code?.[i])),
      sunrise: f.daily.sunrise?.[i] || '',
      sunset: f.daily.sunset?.[i] || ''
    }));

    const bundle = {
      location: { name, country, admin1, latitude, longitude, timezone: f.timezone || '' },
      current: {
        temperature: n(f.current?.temperature_2m),
        feelsLike: n(f.current?.apparent_temperature),
        humidity: n(f.current?.relative_humidity_2m),
        precipitation: n(f.current?.precipitation),
        rain: n(f.current?.rain),
        cloudCover: n(f.current?.cloud_cover),
        pressure: n(f.current?.pressure_msl),
        windSpeed: n(f.current?.wind_speed_10m),
        windDirection: n(f.current?.wind_direction_10m),
        windGust: n(f.current?.wind_gusts_10m),
        weatherCode: n(f.current?.weather_code),
        condition: weatherCodeToText(n(f.current?.weather_code)),
        isDay: n(f.current?.is_day) === 1
      },
      hourly,
      daily,
      airQuality: {
        aqi: aq?.current?.us_aqi ?? null,
        pm25: aq?.current?.pm2_5 ?? null,
        pm10: aq?.current?.pm10 ?? null
      },
      source: 'Open-Meteo forecast + air-quality services',
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({ bundle });
  } catch (e) {
    return NextResponse.json({ error: 'Live weather could not be retrieved.' }, { status: 502 });
  }
}
