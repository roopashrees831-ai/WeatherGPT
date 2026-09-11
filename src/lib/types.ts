export type Persona = 'public' | 'farmer' | 'traveler' | 'disaster';
export type Severity = 'Low' | 'Medium' | 'High';

export interface LocationInfo {
  name: string;
  country: string;
  admin1?: string;
  district?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  countryCode?: string;
}

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  precipitation: number;
  rain: number;
  cloudCover: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  windGust: number;
  weatherCode: number;
  condition: string;
  isDay: boolean;
}

export interface HourlyPoint {
  time: string;
  temperature: number;
  humidity: number;
  precipitationProbability: number;
  precipitation: number;
  rain: number;
  weatherCode: number;
  condition: string;
  cloudCover: number;
  windSpeed: number;
  windGust: number;
}

export interface DailyPoint {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  precipitationProbability: number;
  windSpeed: number;
  windGust: number;
  weatherCode: number;
  condition: string;
  sunrise: string;
  sunset: string;
}

export interface AirQuality {
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
}

export interface WeatherBundle {
  location: LocationInfo;
  current: CurrentWeather;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  airQuality: AirQuality;
  source: string;
  model: string;
  updatedAt: string;
}

export interface RiskFactor {
  label: string;
  value: string;
  contribution: number;
}

export interface SmartAlert {
  id: string;
  type: string;
  title: string;
  severity: Severity;
  message: string;
  start: string;
  action: string;
}

export interface RiskAnalysis {
  score: number;
  severity: Severity;
  flood: number;
  heat: number;
  wind: number;
  storm: number;
  factors: RiskFactor[];
  alerts: SmartAlert[];
  safestWindow: {
    start: string;
    end: string;
    score: number;
  } | null;
}

export interface OfficialAlert {
  id: string;
  district: string;
  issueDate: string;
  issueTime: string;
  day: number;
  warning: string;
  color: 'Red' | 'Orange' | 'Yellow' | 'Green' | 'Unknown';
  source: string;
  sourceUrl: string;
}

export interface ClimateYear {
  year: number;
  avgTemperature: number;
  annualRainfall: number;
  maxTemperature: number;
}

export interface ClimateResult {
  years: ClimateYear[];
  temperatureTrendPerDecade: number;
  rainfallTrendPerDecade: number;
  source: string;
}
