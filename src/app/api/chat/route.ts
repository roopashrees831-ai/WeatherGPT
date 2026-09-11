import {
  NextRequest,
  NextResponse
} from 'next/server';

import type {
  Persona,
  RiskAnalysis,
  WeatherBundle
} from '@/lib/types';

export const dynamic = 'force-dynamic';

/* =========================================================
   LANGUAGE NAMES
========================================================= */

const languageNames: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  kn: 'Kannada',
  ta: 'Tamil',
  te: 'Telugu',
  ml: 'Malayalam',
  bn: 'Bengali',
  mr: 'Marathi',
  gu: 'Gujarati',
  pa: 'Punjabi',
  or: 'Odia',
  as: 'Assamese',
  ur: 'Urdu'
};

/* =========================================================
   SIMPLE LOCAL FALLBACK

   This is used only if Groq is unavailable.
========================================================= */

function localWeatherAnswer(
  bundle: WeatherBundle,
  risk: RiskAnalysis,
  language: string
) {
  const location =
    bundle.location.name;

  const current =
    bundle.current;

  const severity =
    risk.severity;

  if (language === 'kn') {
    return (
      `${location} ನಲ್ಲಿ ಪ್ರಸ್ತುತ ಹವಾಮಾನ ${current.condition}. ` +
      `ತಾಪಮಾನ ${current.temperature.toFixed(1)}°C, ` +
      `ಆರ್ದ್ರತೆ ${Math.round(current.humidity)}%, ` +
      `ಗಾಳಿಯ ವೇಗ ${current.windSpeed.toFixed(1)} ಕಿಮೀ/ಗಂ. ` +
      `ಪ್ರಸ್ತುತ ಹವಾಮಾನ ಅಪಾಯ ${severity} (${risk.score}/100).`
    );
  }

  if (language === 'hi') {
    return (
      `${location} में अभी मौसम ${current.condition} है। ` +
      `तापमान ${current.temperature.toFixed(1)}°C, ` +
      `आर्द्रता ${Math.round(current.humidity)}%, ` +
      `हवा की गति ${current.windSpeed.toFixed(1)} किमी/घंटा है। ` +
      `वर्तमान मौसम जोखिम ${severity} (${risk.score}/100) है।`
    );
  }

  if (language === 'ta') {
    return (
      `${location} இல் தற்போதைய வானிலை ${current.condition}. ` +
      `வெப்பநிலை ${current.temperature.toFixed(1)}°C, ` +
      `ஈரப்பதம் ${Math.round(current.humidity)}%, ` +
      `காற்றின் வேகம் ${current.windSpeed.toFixed(1)} கிமீ/மணி. ` +
      `வானிலை அபாயம் ${severity} (${risk.score}/100).`
    );
  }

  if (language === 'te') {
    return (
      `${location}లో ప్రస్తుతం వాతావరణం ${current.condition}. ` +
      `ఉష్ణోగ్రత ${current.temperature.toFixed(1)}°C, ` +
      `తేమ ${Math.round(current.humidity)}%, ` +
      `గాలి వేగం ${current.windSpeed.toFixed(1)} కి.మీ/గం. ` +
      `వాతావరణ ప్రమాద స్థాయి ${severity} (${risk.score}/100).`
    );
  }

  return (
    `Current weather in ${location}: ${current.condition}. ` +
    `Temperature is ${current.temperature.toFixed(1)}°C, ` +
    `feels like ${current.feelsLike.toFixed(1)}°C, ` +
    `humidity is ${Math.round(current.humidity)}%, ` +
    `and wind speed is ${current.windSpeed.toFixed(1)} km/h. ` +
    `The forecast-derived weather risk is ${severity} (${risk.score}/100).`
  );
}

/* =========================================================
   BUILD REAL WEATHER CONTEXT

   Only real weather information already loaded by the app
   is passed to the AI.
========================================================= */

function buildWeatherContext(
  bundle: WeatherBundle,
  risk: RiskAnalysis,
  persona: Persona
) {
  return {
    location: bundle.location,

    updatedAt:
      bundle.updatedAt,

    weatherDataSource:
      bundle.source,

    forecastModel:
      bundle.model,

    currentWeather:
      bundle.current,

    hourlyForecast:
      bundle.hourly.slice(
        0,
        24
      ),

    dailyForecast:
      bundle.daily.slice(
        0,
        7
      ),

    airQuality:
      bundle.airQuality,

    riskAnalysis: {
      overallRisk:
        risk.severity,

      score:
        risk.score,

      floodRisk:
        risk.flood,

      windRisk:
        risk.wind,

      stormRisk:
        risk.storm,

      heatRisk:
        risk.heat,

      safestWindow:
        risk.safestWindow
    },

    userType:
      persona
  };
}

/* =========================================================
   GROQ AI
========================================================= */

async function askGroq(
  message: string,
  bundle: WeatherBundle,
  risk: RiskAnalysis,
  persona: Persona,
  language: string,
  apiKey: string
) {
  const targetLanguage =
    languageNames[language] ||
    'English';

  const weatherContext =
    buildWeatherContext(
      bundle,
      risk,
      persona
    );

  const systemPrompt = `
You are WeatherGPT, an intelligent conversational weather assistant.

Your job is to explain REAL weather information in simple language.

IMPORTANT RULES:

1. Answer ONLY in ${targetLanguage}.

2. Use ONLY the REAL WEATHER CONTEXT supplied below for:
   - temperature
   - rain
   - precipitation
   - humidity
   - wind
   - cloud cover
   - pressure
   - air quality
   - forecasts
   - weather risks

3. NEVER invent weather values.

4. NEVER pretend a forecast is guaranteed.

5. If requested information is not available in the context, clearly say that it is unavailable.

6. The risk score is forecast-derived decision support.
   It is NOT automatically an official government weather warning.

7. Risk interpretation:
   - Low = normal monitoring
   - Medium = caution recommended
   - High = clearly explain precautions

8. If overall risk is High, provide short and useful safety measures based on the actual risk:
   - flood risk
   - wind risk
   - storm risk
   - heat risk

9. Adapt your advice to the user type:
   ${persona}

   User types:
   - public: simple public safety advice
   - farmer: rainfall, heat, wind and farming-related weather advice
   - traveler: travel timing, rainfall and wind advice
   - disaster: hazards, preparedness and response information

10. Keep responses short, natural and easy to understand.

11. If the user asks:
   "Will it rain tomorrow?"
   check tomorrow's forecast from the supplied data.

12. If the user asks:
   "Is it safe to travel?"
   use the forecast and risk analysis.

13. If the user asks:
   "What is the safest time?"
   use safestWindow when available.

14. Clearly distinguish:
   - observed/current weather
   - forecast information
   - forecast-derived risk

15. If the user asks something unrelated to weather, forecasts, climate, travel weather, agriculture weather or disaster preparedness, politely tell them that WeatherGPT is designed for weather-related questions.

REAL WEATHER CONTEXT:

${JSON.stringify(
  weatherContext,
  null,
  2
)}
`;

  const response =
    await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${apiKey}`
        },

        body:
          JSON.stringify({
            model:
              'llama-3.1-8b-instant',

            temperature:
              0.2,

            max_tokens:
              600,

            messages: [
              {
                role:
                  'system',

                content:
                  systemPrompt
              },

              {
                role:
                  'user',

                content:
                  message
              }
            ]
          })
      }
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    console.error(
      'Groq API error:',
      response.status,
      errorText
    );

    throw new Error(
      `Groq API failed: ${response.status}`
    );
  }

  const data =
    await response.json();

  const answer =
    data.choices?.[0]
      ?.message
      ?.content
      ?.trim();

  if (!answer) {
    throw new Error(
      'Groq returned an empty response'
    );
  }

  return answer;
}

/* =========================================================
   POST /api/chat
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const message =
      String(
        body.message ||
        ''
      ).trim();

    const bundle =
      body.bundle as
        | WeatherBundle
        | undefined;

    const risk =
      body.risk as
        | RiskAnalysis
        | undefined;

    const persona =
      (
        body.persona ||
        'public'
      ) as Persona;

    const language =
      String(
        body.language ||
        'en'
      );

    /* -------------------------
       VALIDATION
    ------------------------- */

    if (!message) {
      return NextResponse.json(
        {
          error:
            'Please enter a weather question.'
        },
        {
          status:
            400
        }
      );
    }

    if (
      !bundle ||
      !risk
    ) {
      return NextResponse.json(
        {
          error:
            'Live weather data is not available.'
        },
        {
          status:
            400
        }
      );
    }

    /* -------------------------
       GET GROQ KEY
    ------------------------- */

    const groqApiKey =
      process.env
        .GROQ_API_KEY
        ?.trim();

    /*
     * If Groq key exists,
     * use Groq.
     */
    if (groqApiKey) {
      try {
        const answer =
          await askGroq(
            message,
            bundle,
            risk,
            persona,
            language,
            groqApiKey
          );

        return NextResponse.json({
          answer,

          engine:
            'Groq AI + Live Weather Data',

          model:
            'llama-3.1-8b-instant'
        });

      } catch (
        error
      ) {
        console.error(
          'Groq failed. Using fallback:',
          error
        );
      }
    }

    /* -------------------------
       FALLBACK

       App still responds if
       Groq temporarily fails.
    ------------------------- */

    const fallback =
      localWeatherAnswer(
        bundle,
        risk,
        language
      );

    return NextResponse.json({
      answer:
        fallback,

      engine:
        groqApiKey
          ? 'WeatherGPT local fallback'
          : 'WeatherGPT local engine',

      model:
        'Local grounded response'
    });

  } catch (
    error
  ) {
    console.error(
      'Chat route error:',
      error
    );

    return NextResponse.json(
      {
        error:
          'WeatherGPT could not process the request.'
      },
      {
        status:
          500
      }
    );
  }
}