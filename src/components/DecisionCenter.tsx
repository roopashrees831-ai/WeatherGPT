'use client';

import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  Search,
  XCircle
} from 'lucide-react';

import type {
  LocationInfo,
  Persona,
  RiskAnalysis,
  WeatherBundle
} from '@/lib/types';

import {
  analyzeRisk
} from '@/lib/risk-engine';

interface Props {
  bundle: WeatherBundle;
  risk: RiskAnalysis;
  persona: Persona;
  setPersona: (persona: Persona) => void;
  language: string;
}

type Mode =
  | 'public'
  | 'farmer'
  | 'traveler'
  | 'disaster'
  | 'custom';

type AdviceResult = {
  title: string;
  summary: string;
  precautions: string[];
  doList: string[];
  avoidList: string[];
};

function clamp(
  value: number
) {
  return Math.max(
    0,
    Math.min(
      100,
      value
    )
  );
}

function hourOf(
  value: string
) {
  const match =
    value.match(
      /T(\d{2}):/
    );

  if (match) {
    return Number(
      match[1]
    );
  }

  const date =
    new Date(value);

  return date.getHours();
}

function hourRisk(
  point:
    WeatherBundle['hourly'][number]
) {
  const rain =
    clamp(
      point
        .precipitationProbability *
        0.45 +
      point.precipitation *
        7
    );

  const wind =
    clamp(
      (
        point.windGust -
        20
      ) *
        2.1
    );

  const heat =
    clamp(
      (
        point.temperature -
        31
      ) *
        9
    );

  const thunder =
    [
      95,
      96,
      99
    ].includes(
      point.weatherCode
    )
      ? 90
      : 0;

  return clamp(
    rain * 0.38 +
    wind * 0.28 +
    heat * 0.16 +
    thunder * 0.18
  );
}

function smartWindow(
  bundle: WeatherBundle,
  mode: Mode
) {
  const now =
    Date.now();

  const future =
    bundle.hourly
      .filter(
        point => {
          const time =
            new Date(
              point.time
            ).getTime();

          return (
            Number.isNaN(
              time
            ) ||
            time >=
              now -
                60 *
                  60 *
                  1000
          );
        }
      )
      .slice(
        0,
        48
      );

  if (
    future.length <
    3
  ) {
    return null;
  }

  let startAllowed =
    6;

  let endAllowed =
    21;

  if (
    mode ===
    'farmer'
  ) {
    startAllowed =
      5;

    endAllowed =
      19;
  }

  if (
    mode ===
    'disaster'
  ) {
    startAllowed =
      0;

    endAllowed =
      24;
  }

  let best:
    {
      start: string;
      end: string;
      score: number;
    } |
    null =
    null;

  let bestScore =
    Infinity;

  for (
    let i = 0;
    i <=
    future.length - 3;
    i++
  ) {
    const p1 =
      future[i];

    const p2 =
      future[i + 1];

    const p3 =
      future[i + 2];

    const startHour =
      hourOf(
        p1.time
      );

    const endHour =
      hourOf(
        p3.time
      );

    if (
      startHour <
        startAllowed ||
      endHour >
        endAllowed
    ) {
      continue;
    }

    const score =
      (
        hourRisk(p1) +
        hourRisk(p2) +
        hourRisk(p3)
      ) / 3;

    if (
      score <
      bestScore
    ) {
      bestScore =
        score;

      best = {
        start:
          p1.time,

        end:
          p3.time,

        score:
          Math.round(
            score
          )
      };
    }
  }

  return best;
}

function formatTime(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date
    .toLocaleString(
      undefined,
      {
        weekday:
          'short',

        hour:
          '2-digit',

        minute:
          '2-digit'
      }
    );
}

function weatherSignals(
  bundle: WeatherBundle,
  risk: RiskAnalysis
) {
  const current =
    bundle.current;

  const next6 =
    bundle.hourly.slice(
      0,
      6
    );

  const rain6h =
    next6.reduce(
      (
        total,
        point
      ) =>
        total +
        point.precipitation,
      0
    );

  const rainChance =
    Math.max(
      0,
      ...next6.map(
        point =>
          point
            .precipitationProbability
      )
    );

  const peakWind =
    Math.max(
      current.windGust,
      ...next6.map(
        point =>
          point.windGust
      )
    );

  const peakTemp =
    Math.max(
      current.temperature,
      ...next6.map(
        point =>
          point.temperature
      )
    );

  return {
    rain6h,

    rainChance,

    peakWind,

    peakTemp,

    raining:
      current.precipitation >
        0.1 ||
      rain6h >
        0.5 ||
      rainChance >=
        45,

    heavyRain:
      rain6h >=
        8 ||
      rainChance >=
        80 ||
      risk.flood >=
        50,

    windy:
      peakWind >=
        40 ||
      risk.wind >=
        40,

    stormy:
      risk.storm >=
        40,

    hot:
      peakTemp >=
        32 ||
      risk.heat >=
        40,

    poorAir:
      (
        bundle.airQuality
          ?.aqi ??
        0
      ) >=
        101
  };
}

function ensureSix(
  list: string[],
  extras: string[]
) {
  const result =
    [...list];

  for (
    const item
    of extras
  ) {
    if (
      result.length >=
      6
    ) {
      break;
    }

    if (
      !result.includes(
        item
      )
    ) {
      result.push(
        item
      );
    }
  }

  return result.slice(
    0,
    6
  );
}

function createAdvice(
  bundle: WeatherBundle,
  risk: RiskAnalysis,
  mode: Mode,
  customUse: string
): AdviceResult {
  const current =
    bundle.current;

  const signals =
    weatherSignals(
      bundle,
      risk
    );

  let precautions:
    string[] = [];

  let doList:
    string[] = [];

  let avoidList:
    string[] = [];

  /*
   * COMMON WEATHER SAFETY
   */
  if (
    signals.heavyRain
  ) {
    precautions.push(
      'Watch for waterlogging, slippery roads and low-lying flooded areas.'
    );
  }

  if (
    signals.windy
  ) {
    precautions.push(
      'Secure loose objects and stay cautious near trees, temporary structures and exposed areas.'
    );
  }

  if (
    signals.stormy
  ) {
    precautions.push(
      'Move indoors when thunder or lightning develops.'
    );
  }

  if (
    signals.hot
  ) {
    precautions.push(
      'Carry drinking water and reduce prolonged exposure during the hottest part of the day.'
    );
  }

  if (
    signals.poorAir
  ) {
    precautions.push(
      'Limit unnecessary prolonged outdoor exposure if you are sensitive to poor air quality.'
    );
  }

  if (
    risk.severity ===
    'High'
  ) {
    precautions.push(
      'Check official local warnings before important travel or outdoor work.'
    );
  }

  /*
   * FARMER
   */
  if (
    mode ===
    'farmer'
  ) {
    if (
      signals.raining
    ) {
      doList.push(
        'Check drainage channels and remove blockages so excess rainwater can escape.'
      );

      doList.push(
        'Use the next dry forecast period for spraying, harvesting or other rain-sensitive work.'
      );

      doList.push(
        'Protect stored fertilizer, seed and harvested produce from moisture.'
      );

      avoidList.push(
        'Avoid pesticide or fertilizer spraying immediately before significant rain.'
      );

      avoidList.push(
        'Avoid field work during thunder and lightning.'
      );
    }

    if (
      signals.hot
    ) {
      doList.push(
        'Prefer irrigation and heavy field work during early morning or evening.'
      );

      doList.push(
        'Provide sufficient drinking water and shade for livestock.'
      );

      avoidList.push(
        'Avoid sensitive crop operations during intense afternoon heat when possible.'
      );
    }

    if (
      signals.windy
    ) {
      doList.push(
        'Support vulnerable plants, nets and lightweight farm structures.'
      );

      avoidList.push(
        'Avoid spraying chemicals in strong wind because spray may drift away.'
      );
    }

    doList =
      ensureSix(
        doList,
        [
          'Monitor the next 24-hour rainfall forecast before planning field operations.',
          'Check soil moisture before irrigation to avoid unnecessary watering.',
          'Keep farm equipment and electrical pumps protected from rain.',
          'Use the lower-risk forecast window shown below for outdoor farm work.',
          'Keep livestock shelter ready if rain, heat or strong wind increases.',
          'Continue monitoring weather changes during the day.'
        ]
      );

    avoidList =
      ensureSix(
        avoidList,
        [
          'Avoid leaving harvested produce exposed if rain is possible.',
          'Avoid unnecessary irrigation when significant rainfall is expected.',
          'Avoid working near isolated trees during thunderstorms.',
          'Avoid leaving loose sheets, nets or equipment unsecured in strong wind.',
          'Avoid long midday outdoor work during extreme heat.',
          'Do not treat the app risk score as an official disaster warning.'
        ]
      );

    precautions =
      ensureSix(
        precautions,
        [
          'Keep drainage paths clear.',
          'Protect farm inputs and harvested produce.',
          'Check wind conditions before spraying.',
          'Watch rainfall probability before irrigation.',
          'Keep livestock shelter and drinking water available.',
          'Follow official warnings during severe weather.'
        ]
      );

    return {
      title:
        'Farmer Weather Advisory',

      summary:
        `${bundle.location.name} is currently ${current.condition.toLowerCase()} at ${current.temperature.toFixed(
          1
        )}°C. Forecast-derived risk is ${risk.severity}.`,

      precautions,

      doList,

      avoidList
    };
  }

  /*
   * TRAVELER
   */
  if (
    mode ===
    'traveler'
  ) {
    if (
      signals.raining
    ) {
      doList.push(
        'Carry rain protection and allow extra travel time.'
      );

      doList.push(
        'Check road conditions and local waterlogging before departure.'
      );

      avoidList.push(
        'Avoid visibly flooded roads, underpasses and unsafe shortcuts.'
      );
    }

    if (
      signals.windy
    ) {
      doList.push(
        'Reduce speed and use extra caution on open roads, bridges and two-wheelers.'
      );
    }

    if (
      signals.hot
    ) {
      doList.push(
        'Carry enough drinking water and plan breaks during long journeys.'
      );
    }

    doList =
      ensureSix(
        doList,
        [
          'Check weather again shortly before starting the trip.',
          'Keep your phone charged and save important emergency contacts.',
          'Prefer the lower-risk travel window shown below when possible.',
          'Carry suitable clothes for the forecast temperature and rain.',
          'Allow extra time if rain or poor visibility is expected.',
          'Check official transport or local authority updates during severe weather.'
        ]
      );

    avoidList =
      ensureSix(
        avoidList,
        [
          'Avoid unnecessary travel during severe thunderstorms.',
          'Avoid flooded or waterlogged roads.',
          'Avoid high-speed driving during heavy rain or poor visibility.',
          'Avoid parking under weak trees during strong winds.',
          'Avoid long outdoor exposure during extreme heat.',
          'Do not depend only on this forecast when official warnings are active.'
        ]
      );

    precautions =
      ensureSix(
        precautions,
        [
          'Carry rain protection.',
          'Check route conditions before departure.',
          'Keep emergency contacts available.',
          'Monitor wind and storm conditions.',
          'Carry drinking water.',
          'Follow official travel advisories if issued.'
        ]
      );

    return {
      title:
        'Traveler Weather Advisory',

      summary:
        `${bundle.location.name} is currently ${current.condition.toLowerCase()}. Overall forecast-derived risk is ${risk.severity}.`,

      precautions,

      doList,

      avoidList
    };
  }

  /*
   * DISASTER TEAM
   */
  if (
    mode ===
    'disaster'
  ) {
    doList = [
      'Monitor official warnings and forecast updates continuously.',
      'Identify low-lying and vulnerable areas if rainfall risk rises.',
      'Keep communication channels and emergency contacts ready.',
      'Check temporary structures, weak trees and exposed infrastructure during strong wind.',
      'Prepare public messaging if risk changes from Medium to High.',
      'Compare app risk indicators with official authority information before action.'
    ];

    avoidList = [
      'Do not treat the app risk score as an official warning.',
      'Do not delay communication when an official severe-weather alert is issued.',
      'Avoid deploying teams into unsafe flooded zones without assessment.',
      'Avoid exposed outdoor operations during lightning.',
      'Avoid relying on a single forecast indicator.',
      'Do not ignore rapidly changing local observations.'
    ];

    precautions =
      ensureSix(
        precautions,
        [
          'Verify official warnings.',
          'Maintain emergency communication.',
          'Monitor flood-prone zones.',
          'Check wind-exposed structures.',
          'Keep response teams ready if risk increases.',
          'Record important weather changes for operational decisions.'
        ]
      );

    return {
      title:
        'Disaster Preparedness Advisory',

      summary:
        `Forecast-derived overall risk is ${risk.severity} (${risk.score}/100) for ${bundle.location.name}.`,

      precautions,

      doList,

      avoidList
    };
  }

  /*
   * CUSTOM USER
   */
  if (
    mode ===
    'custom'
  ) {
    const value =
      customUse
        .trim()
        .toLowerCase();

    const display =
      customUse.trim() ||
      'this activity';

    /*
     * CIVIL ENGINEER /
     * CONSTRUCTION
     */
    if (
      value.includes(
        'civil'
      ) ||
      value.includes(
        'construction'
      ) ||
      value.includes(
        'engineer'
      ) ||
      value.includes(
        'builder'
      ) ||
      value.includes(
        'site'
      )
    ) {
      doList = [
        'Inspect scaffolding, temporary supports and loose materials before outdoor work.',
        'Protect electrical equipment, cement and moisture-sensitive materials from rain.',
        'Use the lower-risk forecast window for lifting, concreting or exposed site work when possible.',
        'Secure sheets, boards, tools and lightweight materials if wind increases.',
        'Provide drinking water and shaded rest areas during hot weather.',
        'Check drainage around excavations and unfinished structures before heavy rain.'
      ];

      avoidList = [
        'Avoid work on wet or slippery scaffolding during rain.',
        'Avoid crane or lifting operations during unsafe wind conditions.',
        'Avoid exposed electrical work in wet conditions.',
        'Avoid deep excavation work if waterlogging or heavy rain is expected.',
        'Avoid keeping loose materials unsecured during strong wind.',
        'Avoid unnecessary outdoor work during lightning.'
      ];
    }

    /*
     * STUDENT
     */
    else if (
      value.includes(
        'student'
      ) ||
      value.includes(
        'school'
      ) ||
      value.includes(
        'college'
      )
    ) {
      doList = [
        'Carry an umbrella or raincoat when rain is likely.',
        'Allow extra travel time during rain.',
        'Carry drinking water during hot weather.',
        'Check transport conditions before leaving home.',
        'Use shaded or indoor areas during intense afternoon heat.',
        'Keep your phone charged for weather or transport updates.'
      ];

      avoidList = [
        'Avoid flooded shortcuts.',
        'Avoid standing under isolated trees during lightning.',
        'Avoid long exposure to strong midday heat.',
        'Avoid riding fast on wet roads.',
        'Avoid exposed outdoor areas during severe storms.',
        'Do not ignore official school or local weather advisories.'
      ];
    }

    /*
     * DELIVERY / DRIVER
     */
    else if (
      value.includes(
        'delivery'
      ) ||
      value.includes(
        'driver'
      ) ||
      value.includes(
        'rider'
      )
    ) {
      doList = [
        'Reduce speed and increase braking distance on wet roads.',
        'Use rain protection and keep packages protected from water.',
        'Check road congestion and waterlogging before departure.',
        'Take breaks and hydrate during hot conditions.',
        'Use extra caution on bridges and open roads during strong wind.',
        'Prefer the lower-risk time window shown below for longer routes.'
      ];

      avoidList = [
        'Avoid flooded roads and underpasses.',
        'Avoid sudden braking on wet roads.',
        'Avoid riding during severe lightning when possible.',
        'Avoid high-speed riding in strong crosswinds.',
        'Avoid prolonged work without hydration during high heat.',
        'Avoid routes with known waterlogging during heavy rain.'
      ];
    }

    /*
     * EVENT / FUNCTION
     */
    else if (
      value.includes(
        'event'
      ) ||
      value.includes(
        'wedding'
      ) ||
      value.includes(
        'function'
      )
    ) {
      doList = [
        'Keep a covered backup venue or shelter available.',
        'Secure tents, banners and lightweight decorations.',
        'Protect electrical equipment from rain.',
        'Monitor the forecast before the event begins.',
        'Keep drinking water and shaded areas available during heat.',
        'Create a quick evacuation plan for thunder or severe weather.'
      ];

      avoidList = [
        'Avoid unsecured temporary structures in strong wind.',
        'Avoid exposed electrical connections during rain.',
        'Avoid keeping people in open areas during lightning.',
        'Avoid ignoring worsening weather conditions.',
        'Avoid scheduling sensitive outdoor activities during the highest-risk hours.',
        'Avoid blocking emergency exits or sheltered areas.'
      ];
    }

    /*
     * GENERIC CUSTOM
     */
    else {
      doList = [
        `Check the current weather before starting ${display}.`,
        `Use the lower-risk forecast window for ${display} when practical.`,
        'Carry rain protection if precipitation is expected.',
        'Stay hydrated if temperatures are high.',
        'Secure loose equipment if wind increases.',
        'Continue monitoring weather changes during the activity.'
      ];

      avoidList = [
        'Avoid exposed outdoor areas during lightning.',
        'Avoid flooded or waterlogged locations.',
        'Avoid unsecured loose objects during strong wind.',
        'Avoid prolonged strenuous activity during extreme heat.',
        'Avoid relying on one weather value alone.',
        'Do not ignore official severe-weather warnings.'
      ];
    }

    precautions =
      ensureSix(
        precautions,
        [
          'Monitor weather changes.',
          'Keep rain protection ready if needed.',
          'Stay away from unsafe flooded areas.',
          'Secure loose objects in wind.',
          'Stay hydrated in hot weather.',
          'Follow official warnings during severe weather.'
        ]
      );

    return {
      title:
        `${customUse.trim() ||
          'Custom'} Weather Advisory`,

      summary:
        `${bundle.location.name} is currently ${current.condition.toLowerCase()} at ${current.temperature.toFixed(
          1
        )}°C. Forecast-derived risk is ${risk.severity}.`,

      precautions,

      doList,

      avoidList
    };
  }

  /*
   * PUBLIC
   */
  doList = [
    'Check the forecast before long outdoor activities.',
    'Carry rain protection when rainfall is expected.',
    'Carry drinking water during hot conditions.',
    'Use the lower-risk forecast window for outdoor plans.',
    'Keep your phone available for local weather alerts.',
    'Continue monitoring weather if conditions begin changing.'
  ];

  avoidList = [
    'Avoid flooded roads and waterlogged areas.',
    'Avoid isolated trees during lightning.',
    'Avoid unsecured outdoor objects during strong wind.',
    'Avoid excessive midday outdoor activity during high heat.',
    'Avoid unnecessary travel during severe weather.',
    'Do not ignore official warnings.'
  ];

  precautions =
    ensureSix(
      precautions,
      [
        'Keep rain protection ready.',
        'Monitor local conditions.',
        'Stay hydrated.',
        'Use caution on wet roads.',
        'Stay indoors during lightning.',
        'Follow official warnings when issued.'
      ]
    );

  return {
    title:
      'Public Weather Advisory',

    summary:
      `${bundle.location.name} is currently ${current.condition.toLowerCase()} at ${current.temperature.toFixed(
        1
      )}°C. Weather risk is ${risk.severity}.`,

    precautions,

    doList,

    avoidList
  };
}

export default function DecisionCenter({
  bundle,
  risk,
  persona,
  setPersona,
  language
}: Props) {
  const [
    mode,
    setMode
  ] =
    useState<Mode>(
      persona ||
      'public'
    );

  const [
    customUse,
    setCustomUse
  ] =
    useState('');

  /*
   * OTHER LOCATION
   */
  const [
    useOtherPlace,
    setUseOtherPlace
  ] =
    useState(false);

  const [
    destinationQuery,
    setDestinationQuery
  ] =
    useState('');

  const [
    destinationResults,
    setDestinationResults
  ] =
    useState<
      LocationInfo[]
    >([]);

  const [
    selectedDestination,
    setSelectedDestination
  ] =
    useState<
      LocationInfo |
      null
    >(null);

  const [
    destinationBundle,
    setDestinationBundle
  ] =
    useState<
      WeatherBundle |
      null
    >(null);

  const [
    destinationRisk,
    setDestinationRisk
  ] =
    useState<
      RiskAnalysis |
      null
    >(null);

  const [
    searchingDestination,
    setSearchingDestination
  ] =
    useState(false);

  const [
    loadingDestination,
    setLoadingDestination
  ] =
    useState(false);

  /*
   * TRAVEL DAYS
   */
  const [
    tripDays,
    setTripDays
  ] =
    useState(1);

  /*
   * SYNC PERSONA
   */
  useEffect(() => {
    if (
      persona ===
      'public' ||
      persona ===
      'farmer' ||
      persona ===
      'traveler' ||
      persona ===
      'disaster'
    ) {
      setMode(
        persona
      );
    }
  }, [
    persona
  ]);

  /*
   * DESTINATION SEARCH
   */
  useEffect(() => {
    const value =
      destinationQuery
        .trim();

    if (
      value.length <
      2
    ) {
      setDestinationResults(
        []
      );

      return;
    }

    setSearchingDestination(
      true
    );

    const timer =
      window.setTimeout(
        async () => {
          try {
            const params =
              new URLSearchParams({
                q:
                  value,

                language
              });

            const response =
              await fetch(
                `/api/search?${params.toString()}`
              );

            const data =
              await response.json();

            setDestinationResults(
              data.results ||
                []
            );
          } catch {
            setDestinationResults(
              []
            );
          } finally {
            setSearchingDestination(
              false
            );
          }
        },
        350
      );

    return () =>
      window.clearTimeout(
        timer
      );

  }, [
    destinationQuery,
    language
  ]);

  async function chooseDestination(
    location:
      LocationInfo
  ) {
    setSelectedDestination(
      location
    );

    setDestinationQuery(
      ''
    );

    setDestinationResults(
      []
    );

    setLoadingDestination(
      true
    );

    try {
      const params =
        new URLSearchParams({
          lat:
            String(
              location.latitude
            ),

          lng:
            String(
              location.longitude
            ),

          name:
            location.name,

          country:
            location.country ||
            '',

          admin1:
            location.admin1 ||
            '',

          district:
            location.district ||
            ''
        });

      const response =
        await fetch(
          `/api/weather?${params.toString()}`
        );

      const data =
        await response.json();

      if (
        data.bundle
      ) {
        setDestinationBundle(
          data.bundle
        );

        setDestinationRisk(
          analyzeRisk(
            data.bundle
          )
        );
      }

    } catch (
      error
    ) {
      console.error(
        'Destination weather failed:',
        error
      );
    } finally {
      setLoadingDestination(
        false
      );
    }
  }

  function selectMode(
    value:
      Exclude<
        Mode,
        'custom'
      >
  ) {
    setMode(
      value
    );

    setPersona(
      value
    );

    if (
      value ===
      'traveler'
    ) {
      setUseOtherPlace(
        true
      );
    }
  }

  /*
   * USE DESTINATION WEATHER
   * IF ONE WAS SELECTED.
   */
  const activeBundle =
    useOtherPlace &&
    destinationBundle
      ? destinationBundle
      : bundle;

  const activeRisk =
    useOtherPlace &&
    destinationRisk
      ? destinationRisk
      : risk;

  const current =
    activeBundle.current;

  const next6 =
    activeBundle.hourly.slice(
      0,
      6
    );

  const rain6h =
    next6.reduce(
      (
        total,
        point
      ) =>
        total +
        point.precipitation,
      0
    );

  const rainChance =
    Math.max(
      0,
      ...next6.map(
        point =>
          point
            .precipitationProbability
      )
    );

  const maxWind =
    Math.max(
      current.windGust,
      ...next6.map(
        point =>
          point.windGust
      )
    );

  const advisory =
    useMemo(
      () =>
        createAdvice(
          activeBundle,
          activeRisk,
          mode,
          customUse
        ),

      [
        activeBundle,
        activeRisk,
        mode,
        customUse
      ]
    );

  const actionWindow =
    useMemo(
      () =>
        smartWindow(
          activeBundle,
          mode
        ),

      [
        activeBundle,
        mode
      ]
    );

  return (
    <div
      style={{
        display:
          'grid',

        gap:
          '20px'
      }}
    >

      {/* USER TYPE */}
      <section className="panel">

        <span className="eyebrow">
          PERSONALIZED DECISION SUPPORT
        </span>

        <h2>
          Who is this advice for?
        </h2>

        <div className="persona-tabs">

          <button
            className={
              mode ===
              'public'
                ? 'active'
                : ''
            }
            onClick={() =>
              selectMode(
                'public'
              )
            }
          >
            Public
          </button>

          <button
            className={
              mode ===
              'farmer'
                ? 'active'
                : ''
            }
            onClick={() =>
              selectMode(
                'farmer'
              )
            }
          >
            Farmer
          </button>

          <button
            className={
              mode ===
              'traveler'
                ? 'active'
                : ''
            }
            onClick={() =>
              selectMode(
                'traveler'
              )
            }
          >
            Traveler
          </button>

          <button
            className={
              mode ===
              'disaster'
                ? 'active'
                : ''
            }
            onClick={() =>
              selectMode(
                'disaster'
              )
            }
          >
            Disaster Team
          </button>

          <button
            className={
              mode ===
              'custom'
                ? 'active'
                : ''
            }
            onClick={() =>
              setMode(
                'custom'
              )
            }
          >
            Other / Custom
          </button>

        </div>

        {mode ===
          'custom' && (
          <div
            style={{
              marginTop:
                '15px'
            }}
          >
            <label className="decision-label">
              TYPE USER / ACTIVITY
            </label>

            <input
              value={
                customUse
              }
              onChange={
                event =>
                  setCustomUse(
                    event
                      .target
                      .value
                  )
              }
              placeholder="Civil engineer, student, delivery rider, outdoor event..."
              className="decision-input"
            />
          </div>
        )}

      </section>

      {/* LOCATION / DESTINATION */}
      <section className="panel">

        <div className="panel-head">

          <div>
            <span className="eyebrow">
              LOCATION FOR ADVICE
            </span>

            <h2>
              Which place should we analyze?
            </h2>
          </div>

        </div>

        <div
          style={{
            display:
              'flex',

            gap:
              '10px',

            flexWrap:
              'wrap',

            marginBottom:
              '15px'
          }}
        >

          <button
            className={
              !useOtherPlace
                ? 'decision-location-button active'
                : 'decision-location-button'
            }
            onClick={() =>
              setUseOtherPlace(
                false
              )
            }
          >
            Current selected place
          </button>

          <button
            className={
              useOtherPlace
                ? 'decision-location-button active'
                : 'decision-location-button'
            }
            onClick={() =>
              setUseOtherPlace(
                true
              )
            }
          >
            Select another place
          </button>

        </div>

        {!useOtherPlace ? (
          <div className="selected-location-decision">

            <MapPin
              size={18}
            />

            <div>
              <b>
                {
                  bundle.location
                    .name
                }
              </b>

              <span>
                {[
                  bundle.location
                    .district,
                  bundle.location
                    .admin1,
                  bundle.location
                    .country
                ]
                  .filter(
                    Boolean
                  )
                  .join(
                    ', '
                  )}
              </span>
            </div>

          </div>
        ) : (
          <div>

            <label className="decision-label">
              SEARCH ANY PLACE / DESTINATION
            </label>

            <div className="decision-search">

              <Search
                size={17}
              />

              <input
                value={
                  destinationQuery
                }
                onChange={
                  event =>
                    setDestinationQuery(
                      event
                        .target
                        .value
                    )
                }
                placeholder="Type Mysuru, Goa, Mumbai, Delhi, Chennai..."
              />

              {searchingDestination && (
                <Loader2
                  size={16}
                  className="mini-spin"
                />
              )}

              {destinationResults
                .length >
                0 && (
                <div className="decision-search-results">

                  {destinationResults.map(
                    (
                      item,
                      index
                    ) => (
                      <button
                        key={`${item.latitude}-${item.longitude}-${index}`}
                        onClick={() =>
                          chooseDestination(
                            item
                          )
                        }
                      >
                        <b>
                          {
                            item.name
                          }
                        </b>

                        <span>
                          {[
                            item.district,
                            item.admin1,
                            item.country
                          ]
                            .filter(
                              Boolean
                            )
                            .join(
                              ', '
                            )}
                        </span>
                      </button>
                    )
                  )}

                </div>
              )}

            </div>

            {loadingDestination && (
              <p className="muted">
                Loading real weather for selected destination...
              </p>
            )}

            {selectedDestination &&
              destinationBundle && (
              <div className="selected-location-decision">

                <MapPin
                  size={18}
                />

                <div>
                  <b>
                    {
                      selectedDestination
                        .name
                    }
                  </b>

                  <span>
                    {[
                      selectedDestination
                        .district,
                      selectedDestination
                        .admin1,
                      selectedDestination
                        .country
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        ', '
                      )}
                  </span>
                </div>

              </div>
            )}

          </div>
        )}

        {/* TRAVEL DAYS */}
        {mode ===
          'traveler' && (
          <div
            style={{
              marginTop:
                '18px'
            }}
          >
            <label className="decision-label">
              TRIP DURATION
            </label>

            <div
              style={{
                display:
                  'flex',

                alignItems:
                  'center',

                gap:
                  '12px'
              }}
            >
              <input
                type="number"
                min={1}
                max={7}
                value={
                  tripDays
                }
                onChange={
                  event =>
                    setTripDays(
                      Math.max(
                        1,
                        Math.min(
                          7,
                          Number(
                            event
                              .target
                              .value
                          ) ||
                            1
                        )
                      )
                    )
                }
                className="decision-days"
              />

              <span className="muted">
                day
                {tripDays >
                1
                  ? 's'
                  : ''}
              </span>
            </div>
          </div>
        )}

      </section>

      {/* CURRENT WEATHER */}
      <section className="panel">

        <div className="panel-head">

          <div>
            <span className="eyebrow">
              REAL WEATHER
            </span>

            <h2>
              {
                activeBundle
                  .location
                  .name
              }
            </h2>
          </div>

          <div
            className={`score-badge sev-${activeRisk.severity.toLowerCase()}`}
          >
            {
              activeRisk.severity
            }

            {' · '}

            {
              activeRisk.score
            }
            /100
          </div>

        </div>

        <div className="evidence-grid">

          <div className="evidence-card">
            <span>
              Condition
            </span>

            <b>
              {
                current.condition
              }
            </b>
          </div>

          <div className="evidence-card">
            <span>
              Temperature
            </span>

            <b>
              {current.temperature.toFixed(
                1
              )}
              °C
            </b>

            <small>
              Feels like{' '}
              {current.feelsLike.toFixed(
                1
              )}
              °C
            </small>
          </div>

          <div className="evidence-card">
            <span>
              Rain next 6h
            </span>

            <b>
              {rain6h.toFixed(
                1
              )}{' '}
              mm
            </b>

            <small>
              {Math.round(
                rainChance
              )}
              % peak chance
            </small>
          </div>

          <div className="evidence-card">
            <span>
              Wind
            </span>

            <b>
              {maxWind.toFixed(
                1
              )}{' '}
              km/h
            </b>
          </div>

          <div className="evidence-card">
            <span>
              Humidity
            </span>

            <b>
              {Math.round(
                current.humidity
              )}
              %
            </b>
          </div>

          <div className="evidence-card">
            <span>
              Cloud cover
            </span>

            <b>
              {Math.round(
                current.cloudCover
              )}
              %
            </b>
          </div>

        </div>

      </section>

      {/* ADVICE */}
      <div className="decision-advice-grid">

        <section className="panel">

          <span className="eyebrow">
            WEATHER ADVISORY
          </span>

          <h2>
            {
              advisory.title
            }
          </h2>

          <p className="decision-summary">
            {
              advisory.summary
            }
          </p>

          {mode ===
            'traveler' && (
            <p className="muted">
              Trip duration selected: {tripDays} day
              {tripDays >
              1
                ? 's'
                : ''}.
            </p>
          )}

          <h3 className="precaution-title">
            <AlertTriangle
              size={20}
            />

            Precautions / Measures
          </h3>

          <div className="advice-list">

            {advisory.precautions.map(
              (
                item,
                index
              ) => (
                <div
                  key={
                    index
                  }
                >
                  <span>
                    {
                      index +
                      1
                    }
                  </span>

                  <p>
                    {item}
                  </p>
                </div>
              )
            )}

          </div>

        </section>

        <section className="panel">

          <span className="eyebrow">
            ACTION GUIDANCE
          </span>

          <h2>
            What should I do?
          </h2>

          <h3 className="good-title">
            <CheckCircle2
              size={20}
            />

            Good to do
          </h3>

          <div className="advice-list">

            {advisory.doList.map(
              (
                item,
                index
              ) => (
                <div
                  key={
                    index
                  }
                >
                  <span>
                    ✓
                  </span>

                  <p>
                    {item}
                  </p>
                </div>
              )
            )}

          </div>

          <h3 className="avoid-title">
            <XCircle
              size={20}
            />

            Avoid doing
          </h3>

          <div className="advice-list">

            {advisory.avoidList.map(
              (
                item,
                index
              ) => (
                <div
                  key={
                    index
                  }
                >
                  <span>
                    !
                  </span>

                  <p>
                    {item}
                  </p>
                </div>
              )
            )}

          </div>

        </section>

      </div>

      {/* SAFE WINDOW */}
      {actionWindow && (
        <section className="panel">

          <span className="eyebrow">
            SMART ACTION WINDOW
          </span>

          <h2>
            Lower-risk time for this activity
          </h2>

          <div className="safe-window">

            <Clock3
              size={20}
            />

            <div>
              <b>
                Suggested Window
              </b>

              <span>
                {formatTime(
                  actionWindow.start
                )}

                {' → '}

                {formatTime(
                  actionWindow.end
                )}
              </span>
            </div>

            <strong>
              Risk{' '}
              {
                actionWindow.score
              }
              /100
            </strong>

          </div>

          <p className="muted">
            Forecast-derived decision support only. During severe weather, follow official authority warnings.
          </p>

        </section>
      )}

    </div>
  );
}