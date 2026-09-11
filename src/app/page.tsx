'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Globe2, Menu, Mic, Sparkles, WifiOff, X } from 'lucide-react';

import OverviewPanel from '@/components/OverviewPanel';
import ForecastPanel from '@/components/ForecastPanel';
import RiskPanel from '@/components/RiskPanel';
import OfficialAlertsPanel from '@/components/OfficialAlertsPanel';
import ChatPanel from '@/components/ChatPanel';
import DecisionCenter from '@/components/DecisionCenter';
import WeatherMap from '@/components/WeatherMap';
import LocationSidebar from '@/components/LocationSidebar';

import { analyzeRisk } from '@/lib/risk-engine';
import { LANGUAGES, t } from '@/lib/i18n';

import type {
  LocationInfo,
  OfficialAlert,
  Persona,
  WeatherBundle
} from '@/lib/types';

type Tab =
  | 'overview'
  | 'assistant'
  | 'alerts'
  | 'decision'
  | 'map';

const defaultLocation: LocationInfo = {
  name: 'Bengaluru',
  country: 'India',
  countryCode: 'IN',
  admin1: 'Karnataka',
  district: 'Bengaluru Urban',
  latitude: 12.9716,
  longitude: 77.5946,
  timezone: 'Asia/Kolkata'
};

export default function Home() {
  const [tab, setTab] = useState<Tab>('overview');

  const [location, setLocation] =
    useState<LocationInfo>(defaultLocation);

  const [bundle, setBundle] =
    useState<WeatherBundle | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [offline, setOffline] =
    useState(false);

  const [error, setError] =
    useState('');

  const [persona, setPersona] =
    useState<Persona>('public');

  const [language, setLanguage] =
    useState('en');

  const [
    sidebarCollapsed,
    setSidebarCollapsed
  ] = useState(false);

  const [
    mobileSidebar,
    setMobileSidebar
  ] = useState(false);

  const [
    officialAlerts,
    setOfficialAlerts
  ] = useState<OfficialAlert[]>([]);

  const [
    officialAlertStatus,
    setOfficialAlertStatus
  ] = useState('');

  const [
    officialAlertsLoading,
    setOfficialAlertsLoading
  ] = useState(false);

  const loadWeather =
    useCallback(
      async (
        loc: LocationInfo
      ) => {
        setLoading(true);
        setError('');
        setOffline(false);

        try {
          const q =
            new URLSearchParams({
              lat: String(
                loc.latitude
              ),
              lng: String(
                loc.longitude
              ),
              name:
                loc.name,
              country:
                loc.country,
              admin1:
                loc.admin1 ||
                '',
              district:
                loc.district ||
                ''
            });

          const response =
            await fetch(
              `/api/weather?${q.toString()}`
            );

          if (
            !response.ok
          ) {
            throw new Error(
              'Weather unavailable'
            );
          }

          const data =
            await response.json();

          if (
            !data.bundle
          ) {
            throw new Error(
              'Weather unavailable'
            );
          }

          setBundle(
            data.bundle
          );

          localStorage.setItem(
            'weathergpt:lastBundle',
            JSON.stringify(
              data.bundle
            )
          );

        } catch {
          const cached =
            localStorage.getItem(
              'weathergpt:lastBundle'
            );

          if (cached) {
            setBundle(
              JSON.parse(
                cached
              )
            );

            setOffline(true);

            setError(
              'Live connection failed — showing the last saved weather snapshot.'
            );

          } else {
            setError(
              'Live weather could not be loaded. Check your internet connection and try again.'
            );
          }

        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    loadWeather(
      location
    );
  }, [
    location,
    loadWeather
  ]);

  useEffect(() => {
    const loadOfficialAlerts =
      async () => {
        setOfficialAlertsLoading(
          true
        );

        try {
          const q =
            new URLSearchParams({
              country:
                location.country,
              name:
                location.name,
              district:
                location.district ||
                ''
            });

          const response =
            await fetch(
              `/api/official-alerts?${q.toString()}`
            );

          const data =
            await response.json();

          setOfficialAlerts(
            data.alerts ||
            []
          );

          setOfficialAlertStatus(
            data.status ||
            ''
          );

        } catch {
          setOfficialAlerts(
            []
          );

          setOfficialAlertStatus(
            ''
          );

        } finally {
          setOfficialAlertsLoading(
            false
          );
        }
      };

    loadOfficialAlerts();

  }, [location]);

  const risk =
    useMemo(
      () =>
        bundle
          ? analyzeRisk(
              bundle
            )
          : null,
      [bundle]
    );

  const choose =
    useCallback(
      (
        loc: LocationInfo
      ) => {
        setLocation(loc);
        setTab(
          'overview'
        );

        setMobileSidebar(
          false
        );
      },
      []
    );

  const pickMap =
    useCallback(
      async (
        lat: number,
        lng: number
      ) => {
        try {
          const response =
            await fetch(
              `/api/reverse?lat=${lat}&lng=${lng}`
            );

          const data =
            await response.json();

          if (
            data.location
          ) {
            choose(
              data.location
            );

          } else {
            choose({
              name:
                `Location ${lat.toFixed(
                  2
                )}, ${lng.toFixed(
                  2
                )}`,
              country:
                '',
              latitude:
                lat,
              longitude:
                lng
            });
          }

        } catch {
          choose({
            name:
              `Location ${lat.toFixed(
                2
              )}, ${lng.toFixed(
                2
              )}`,
            country:
              '',
            latitude:
              lat,
            longitude:
              lng
          });
        }
      },
      [choose]
    );

  const rtl =
    language ===
    'ur';

  return (
    <div
      className="app-shell-new"
      dir={
        rtl
          ? 'rtl'
          : 'ltr'
      }
    >

      {/* TOP HEADER */}
      <header className="clean-topbar">

        <button
          className="mobile-side-toggle"
          onClick={() =>
            setMobileSidebar(
              !mobileSidebar
            )
          }
          aria-label="Open menu"
        >
          {mobileSidebar
            ? (
              <X
                size={21}
              />
            )
            : (
              <Menu
                size={21}
              />
            )}
        </button>

        {/* CENTER WEATHERGPT TITLE */}
        <div
          className="center-brand"
          onClick={() =>
            setTab(
              'overview'
            )
          }
        >
          <div className="brand-orb">
            <Globe2
              size={22}
            />
          </div>

          <div>
            <b>
              Weather
              <span>
                GPT
              </span>
            </b>

            <small>
              {t(
                language,
                'appSubtitle'
              )}
            </small>
          </div>
        </div>

        {/* LANGUAGE + VOICE */}
        <div className="top-actions-new">

          <select
            aria-label={t(
              language,
              'language'
            )}
            value={
              language
            }
            onChange={
              event =>
                setLanguage(
                  event.target.value
                )
            }
          >
            {LANGUAGES.map(
              item => (
                <option
                  key={
                    item.code
                  }
                  value={
                    item.code
                  }
                >
                  {
                    item.label
                  }
                </option>
              )
            )}
          </select>

          <button
            className="top-voice"
            onClick={() =>
              setTab(
                'assistant'
              )
            }
            title={t(
              language,
              'voiceAssistant'
            )}
          >
            <Mic
              size={18}
            />

            <span>
              {t(
                language,
                'voiceAssistant'
              )}
            </span>
          </button>

        </div>
      </header>

      {/* PAGE AREA */}
      <div className="workspace-new">

        <div
          className={
            mobileSidebar
              ? 'mobile-sidebar-wrap open'
              : 'mobile-sidebar-wrap'
          }
          onClick={() =>
            setMobileSidebar(
              false
            )
          }
        />

        <div
          className={
            mobileSidebar
              ? 'sidebar-holder mobile-open'
              : 'sidebar-holder'
          }
        >
          <LocationSidebar
            tab={tab}
            setTab={value => {
              setTab(value);

              setMobileSidebar(
                false
              );
            }}
            language={
              language
            }
            location={
              location
            }
            risk={
              risk
            }
            onChooseLocation={
              choose
            }
            collapsed={
              sidebarCollapsed
            }
            setCollapsed={
              setSidebarCollapsed
            }
            onOpenVoice={() => {
              setTab(
                'assistant'
              );

              setMobileSidebar(
                false
              );
            }}
          />
        </div>

        {/* MAIN CONTENT */}
        <main
          className={
            sidebarCollapsed
              ? 'main-new side-collapsed'
              : 'main-new'
          }
        >

          {error && (
            <div className="notice">
              <WifiOff
                size={16}
              />

              {error}
            </div>
          )}

          {loading &&
          !bundle ? (
            <div className="loader">

              <div />

              <h2>
                {t(
                  language,
                  'loadingWeather'
                )}
              </h2>

              <p>
                {t(
                  language,
                  'loadingWeatherDesc'
                )}
              </p>

            </div>

          ) : bundle &&
            risk ? (
            <>

              {/* OVERVIEW */}
              {tab ===
                'overview' && (
                <div className="page-stack">

                  <div className="intro centered-intro">

                    <span>
                      <Sparkles
                        size={14}
                      />

                      {t(
                        language,
                        'introEyebrow'
                      )}
                    </span>

                    <h2>
                      {t(
                        language,
                        'introA'
                      )}

                      <em>
                        {t(
                          language,
                          'introB'
                        )}
                      </em>

                      {t(
                        language,
                        'introC'
                      )}
                    </h2>

                    <p>
                      {t(
                        language,
                        'introDesc'
                      )}
                    </p>

                  </div>

                  <OverviewPanel
                    bundle={
                      bundle
                    }
                    offline={
                      offline
                    }
                    language={
                      language
                    }
                  />

                  <div className="two-col">

                    <ForecastPanel
                      bundle={
                        bundle
                      }
                      language={
                        language
                      }
                    />

                    <RiskPanel
                      risk={
                        risk
                      }
                      language={
                        language
                      }
                    />

                  </div>

                </div>
              )}

              {/* WEATHERGPT ASSISTANT */}
              {tab ===
                'assistant' && (
                <ChatPanel
                  bundle={
                    bundle
                  }
                  risk={
                    risk
                  }
                  persona={
                    persona
                  }
                  language={
                    language
                  }
                />
              )}

              {/* ALERTS & RISK */}
              {tab ===
                'alerts' && (
                <div className="page-stack">

                  <OfficialAlertsPanel
                    alerts={
                      officialAlerts
                    }
                    status={
                      officialAlertStatus
                    }
                    loading={
                      officialAlertsLoading
                    }
                    language={
                      language
                    }
                  />

                  <RiskPanel
                    risk={
                      risk
                    }
                    language={
                      language
                    }
                  />

                </div>
              )}

              {/* DECISION CENTER */}
              {tab ===
                'decision' && (
                <DecisionCenter
                  bundle={
                    bundle
                  }
                  risk={
                    risk
                  }
                  persona={
                    persona
                  }
                  setPersona={
                    setPersona
                  }
                  language={
                    language
                  }
                />
              )}

              {/* WEATHER MAP */}
              {tab ===
                'map' && (
                <section className="panel map-panel">

                  <div className="panel-head">

                    <div>
                      <span className="eyebrow">
                        {t(
                          language,
                          'mapEyebrow'
                        )}
                      </span>

                      <h2>
                        {t(
                          language,
                          'mapTitle'
                        )}
                      </h2>
                    </div>

                    <span className="source-pill">
                      {t(
                        language,
                        'clickAnywhere'
                      )}
                    </span>

                  </div>

                  <p className="muted">
                    {t(
                      language,
                      'mapHelp'
                    )}
                  </p>

                  <WeatherMap
                    location={
                      location
                    }
                    onPick={
                      pickMap
                    }
                  />

                </section>
              )}

            </>
          ) : null}

        </main>
      </div>
    </div>
  );
}