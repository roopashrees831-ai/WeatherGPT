'use client';

import React, {
  useEffect,
  useState
} from 'react';

import {
  AlertTriangle,
  Bot,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  Crosshair,
  Loader2,
  Map,
  MapPin,
  Navigation,
  Search,
  Shield,
  ShieldCheck
} from 'lucide-react';

import type {
  LocationInfo,
  RiskAnalysis
} from '@/lib/types';

import {
  riskLabel,
  t
} from '@/lib/i18n';

type Tab =
  | 'overview'
  | 'assistant'
  | 'alerts'
  | 'decision'
  | 'map';

type Country = {
  name: string;
  iso2: string;
};

type NavItem = {
  id: Tab;
  label: string;
  icon:
    React.ElementType;
};

interface Props {
  tab: Tab;

  setTab:
    (tab: Tab) =>
      void;

  language:
    string;

  location:
    LocationInfo;

  risk:
    RiskAnalysis |
    null;

  onChooseLocation:
    (
      location:
        LocationInfo
    ) => void;

  collapsed:
    boolean;

  setCollapsed:
    (
      value:
        boolean
    ) => void;

  onOpenVoice:
    () => void;
}

export default function LocationSidebar({
  tab,
  setTab,
  language,
  location,
  risk,
  onChooseLocation,
  collapsed,
  setCollapsed,
  onOpenVoice
}: Props) {
  const [
    countries,
    setCountries
  ] =
    useState<
      Country[]
    >([]);

  const [
    states,
    setStates
  ] =
    useState<
      string[]
    >([]);

  const [
    districts,
    setDistricts
  ] =
    useState<
      string[]
    >([]);

  const [
    country,
    setCountry
  ] =
    useState(
      location.country ||
        'India'
    );

  const [
    countryCode,
    setCountryCode
  ] =
    useState(
      location.countryCode ||
        'IN'
    );

  const [
    state,
    setState
  ] =
    useState(
      location.admin1 ||
        ''
    );

  const [
    district,
    setDistrict
  ] =
    useState(
      location.district ||
        ''
    );

  const [
    place,
    setPlace
  ] =
    useState('');

  const [
    results,
    setResults
  ] =
    useState<
      LocationInfo[]
    >([]);

  const [
    loadingCountries,
    setLoadingCountries
  ] =
    useState(false);

  const [
    loadingStates,
    setLoadingStates
  ] =
    useState(false);

  const [
    loadingDistricts,
    setLoadingDistricts
  ] =
    useState(false);

  const [
    searching,
    setSearching
  ] =
    useState(false);

  const [
    gpsLoading,
    setGpsLoading
  ] =
    useState(false);

  const [
    locationError,
    setLocationError
  ] =
    useState('');

  const navItems:
    NavItem[] = [
      {
        id:
          'overview',

        label:
          t(
            language,
            'overview'
          ),

        icon:
          CloudSun
      },

      {
        id:
          'assistant',

        label:
          t(
            language,
            'assistant'
          ),

        icon:
          Bot
      },

      {
        id:
          'alerts',

        label:
          t(
            language,
            'alertsRisk'
          ),

        icon:
          AlertTriangle
      },

      {
        id:
          'decision',

        label:
          t(
            language,
            'decisionCenter'
          ),

        icon:
          Shield
      },

      {
        id:
          'map',

        label:
          t(
            language,
            'weatherMap'
          ),

        icon:
          Map
      }
    ];

  /*
   * ======================
   * COUNTRIES
   * ======================
   */
  useEffect(() => {
    setLoadingCountries(
      true
    );

    fetch(
      '/api/locations?type=countries'
    )
      .then(
        response =>
          response.json()
      )

      .then(data => {
        setCountries(
          data.countries ||
            []
        );
      })

      .catch(() => {
        setCountries([]);
      })

      .finally(() => {
        setLoadingCountries(
          false
        );
      });
  }, []);

  /*
   * ======================
   * COUNTRY -> STATES
   * ======================
   */
  useEffect(() => {
    if (!country) {
      setStates([]);
      setDistricts([]);
      return;
    }

    setLoadingStates(
      true
    );

    setStates([]);

    setDistricts([]);

    fetch(
      `/api/locations?type=states&country=${encodeURIComponent(
        country
      )}`
    )
      .then(
        response =>
          response.json()
      )

      .then(data => {
        setStates(
          data.states ||
            []
        );
      })

      .catch(() => {
        setStates([]);
      })

      .finally(() => {
        setLoadingStates(
          false
        );
      });

  }, [country]);

  /*
   * ======================
   * STATE ->
   * DISTRICT/CITY
   * ======================
   */
  useEffect(() => {
    if (
      !country ||
      !state
    ) {
      setDistricts([]);
      return;
    }

    setLoadingDistricts(
      true
    );

    setDistricts([]);

    fetch(
      `/api/locations?type=districts&country=${encodeURIComponent(
        country
      )}&state=${encodeURIComponent(
        state
      )}`
    )
      .then(
        response =>
          response.json()
      )

      .then(data => {
        setDistricts(
          data.districts ||
            []
        );
      })

      .catch(() => {
        setDistricts([]);
      })

      .finally(() => {
        setLoadingDistricts(
          false
        );
      });

  }, [
    country,
    state
  ]);

  /*
   * ======================
   * EXACT AREA / PLACE
   * SEARCH
   * ======================
   */
  useEffect(() => {
    const query =
      place.trim();

    if (
      query.length <
      2
    ) {
      setResults([]);
      setSearching(
        false
      );
      return;
    }

    setSearching(true);

    const timer =
      window.setTimeout(
        async () => {
          try {
            const params =
              new URLSearchParams({
                q:
                  query,

                language
              });

            if (
              countryCode
            ) {
              params.set(
                'countryCode',
                countryCode
              );
            }

            if (state) {
              params.set(
                'state',
                state
              );
            }

            const response =
              await fetch(
                `/api/search?${params.toString()}`
              );

            const data =
              await response.json();

            setResults(
              data.results ||
                []
            );

          } catch {
            setResults([]);
          } finally {
            setSearching(
              false
            );
          }
        },
        350
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };

  }, [
    place,
    countryCode,
    state,
    language
  ]);

  /*
   * ======================
   * SYNC WHEN LOCATION
   * CHANGES FROM MAP/GPS
   * ======================
   */
  useEffect(() => {
    if (
      location.country
    ) {
      setCountry(
        location.country
      );
    }

    if (
      location.countryCode
    ) {
      setCountryCode(
        location.countryCode
      );
    }

    if (
      location.admin1 !==
      undefined
    ) {
      setState(
        location.admin1 ||
          ''
      );
    }

    if (
      location.district !==
      undefined
    ) {
      setDistrict(
        location.district ||
          ''
      );
    }

  }, [location]);

  /*
   * ======================
   * COUNTRY SELECT
   * ======================
   */
  function changeCountry(
    value: string
  ) {
    setCountry(
      value
    );

    setState('');

    setDistrict('');

    setPlace('');

    setResults([]);

    const selected =
      countries.find(
        item =>
          item.name ===
          value
      );

    setCountryCode(
      selected?.iso2 ||
        ''
    );
  }

  /*
   * ======================
   * CITY / DISTRICT SELECT
   * ======================
   */
  async function chooseDistrict(
    value: string
  ) {
    setDistrict(
      value
    );

    if (!value) {
      return;
    }

    try {
      const params =
        new URLSearchParams({
          q:
            value,

          language
        });

      if (
        countryCode
      ) {
        params.set(
          'countryCode',
          countryCode
        );
      }

      if (state) {
        params.set(
          'state',
          state
        );
      }

      const response =
        await fetch(
          `/api/search?${params.toString()}`
        );

      const data =
        await response.json();

      const options:
        LocationInfo[] =
        data.results ||
        [];

      const best =
        options.find(
          item =>
            (
              !state ||
              item.admin1 ===
                state
            ) &&
            (
              !countryCode ||
              item.countryCode ===
                countryCode
            )
        ) ||
        options[0];

      if (best) {
        onChooseLocation(
          best
        );
      }

    } catch (
      error
    ) {
      console.error(
        'City selection error:',
        error
      );
    }
  }

  /*
   * ======================
   * EXACT PLACE SELECT
   * ======================
   */
  function chooseExactPlace(
    result:
      LocationInfo
  ) {
    onChooseLocation(
      result
    );

    setCountry(
      result.country ||
        country
    );

    setCountryCode(
      result.countryCode ||
        countryCode
    );

    setState(
      result.admin1 ||
        state
    );

    setDistrict(
      result.district ||
        district
    );

    setPlace('');

    setResults([]);
  }

  /*
   * ======================
   * GPS
   * ======================
   */
  function useGps() {
    setLocationError('');

    if (
      !navigator.geolocation
    ) {
      setLocationError(
        'GPS is not available in this browser.'
      );
      return;
    }

    setGpsLoading(true);

    navigator.geolocation
      .getCurrentPosition(
        async position => {
          try {
            const {
              latitude,
              longitude
            } =
              position.coords;

            const response =
              await fetch(
                `/api/reverse?lat=${latitude}&lng=${longitude}&language=${language}`
              );

            const data =
              await response.json();

            if (
              data.location
            ) {
              chooseExactPlace(
                data.location
              );
            } else {
              setLocationError(
                'Could not identify your current place.'
              );
            }

          } catch {
            setLocationError(
              'Could not identify your current place.'
            );
          } finally {
            setGpsLoading(
              false
            );
          }
        },

        () => {
          setGpsLoading(
            false
          );

          setLocationError(
            'Location permission was denied or GPS is unavailable.'
          );
        },

        {
          enableHighAccuracy:
            true,

          timeout:
            12000,

          maximumAge:
            30000
        }
      );
  }

  /*
   * HIGH RISK
   * PRECAUTIONS
   */
  const measures:
    string[] = [];

  if (
    risk?.flood &&
    risk.flood >= 45
  ) {
    measures.push(
      'Avoid low-lying and waterlogged areas.'
    );
  }

  if (
    risk?.wind &&
    risk.wind >= 45
  ) {
    measures.push(
      'Stay away from weak structures and secure loose outdoor objects.'
    );
  }

  if (
    risk?.storm &&
    risk.storm >= 45
  ) {
    measures.push(
      'Stay indoors during thunder and lightning.'
    );
  }

  if (
    risk?.heat &&
    risk.heat >= 45
  ) {
    measures.push(
      'Avoid prolonged afternoon exposure and stay hydrated.'
    );
  }

  return (
    <aside
      className={
        collapsed
          ? 'side-shell collapsed'
          : 'side-shell'
      }
    >
      <button
        className="collapse-button"
        onClick={() =>
          setCollapsed(
            !collapsed
          )
        }
      >
        {collapsed
          ? (
            <ChevronRight
              size={18}
            />
          )
          : (
            <ChevronLeft
              size={18}
            />
          )}
      </button>

      <div className="side-content">

        {/* NAV */}
        <nav className="side-nav">

          {navItems.map(
            item => {
              const Icon =
                item.icon;

              return (
                <button
                  key={
                    item.id
                  }
                  className={
                    tab ===
                    item.id
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setTab(
                      item.id
                    )
                  }
                >
                  <Icon
                    size={18}
                  />

                  <span>
                    {
                      item.label
                    }
                  </span>
                </button>
              );
            }
          )}

        </nav>

        <div className="side-divider" />

        {/* LOCATION */}
        <section className="location-box">

          <h3>
            <MapPin
              size={16}
            />

            Location
          </h3>

          <p>
            Select country → state →
            district/city, or type the
            exact area/place.
          </p>

          {/* COUNTRY */}
          <label>
            COUNTRY
          </label>

          <div className="select-loader-wrap">

            <select
              value={
                country
              }
              disabled={
                loadingCountries
              }
              onChange={
                event =>
                  changeCountry(
                    event.target.value
                  )
              }
            >
              <option value="">
                Select country
              </option>

              {countries.map(
                item => (
                  <option
                    key={
                      item.iso2 ||
                      item.name
                    }
                    value={
                      item.name
                    }
                  >
                    {
                      item.name
                    }
                  </option>
                )
              )}
            </select>

            {loadingCountries && (
              <Loader2
                className="mini-spin"
                size={14}
              />
            )}
          </div>

          {/* STATE */}
          <label>
            STATE / REGION
          </label>

          <div className="select-loader-wrap">

            <select
              value={
                state
              }
              disabled={
                !country ||
                loadingStates
              }
              onChange={
                event => {
                  setState(
                    event.target.value
                  );

                  setDistrict('');

                  setPlace('');

                  setResults([]);
                }
              }
            >
              <option value="">
                Select state / region
              </option>

              {states.map(
                item => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {item}
                  </option>
                )
              )}
            </select>

            {loadingStates && (
              <Loader2
                className="mini-spin"
                size={14}
              />
            )}
          </div>

          {/* DISTRICT / CITY */}
          <label>
            DISTRICT / CITY
          </label>

          <div className="select-loader-wrap">

            <select
              value={
                district
              }
              disabled={
                !state ||
                loadingDistricts
              }
              onChange={
                event =>
                  chooseDistrict(
                    event.target.value
                  )
              }
            >
              <option value="">
                Select district / city
              </option>

              {districts.map(
                item => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {item}
                  </option>
                )
              )}
            </select>

            {loadingDistricts && (
              <Loader2
                className="mini-spin"
                size={14}
              />
            )}
          </div>

          {/* EXACT AREA */}
          <label>
            EXACT AREA / PLACE
          </label>

          <div className="side-place-search">

            <Search
              size={15}
            />

            <input
              value={
                place
              }
              onChange={
                event =>
                  setPlace(
                    event.target.value
                  )
              }
              placeholder="Example: Jayanagar, airport, college..."
            />

            {searching && (
              <Loader2
                className="mini-spin"
                size={14}
              />
            )}

            {results.length >
              0 && (
              <div className="side-search-results">

                {results.map(
                  (
                    result,
                    index
                  ) => (
                    <button
                      key={`${result.latitude}-${result.longitude}-${index}`}
                      onClick={() =>
                        chooseExactPlace(
                          result
                        )
                      }
                    >
                      <b>
                        {
                          result.name
                        }
                      </b>

                      <span>
                        {[
                          result.district,
                          result.admin1,
                          result.country
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

          {/* GPS */}
          <button
            className="gps-button"
            onClick={
              useGps
            }
            disabled={
              gpsLoading
            }
          >
            {gpsLoading
              ? (
                <Loader2
                  className="mini-spin"
                  size={16}
                />
              )
              : (
                <Crosshair
                  size={16}
                />
              )}

            {gpsLoading
              ? 'Detecting location...'
              : 'Use current location'}
          </button>

          {locationError && (
            <small className="location-error">
              {
                locationError
              }
            </small>
          )}

          {/* ACTIVE WEATHER LOCATION */}
          <div className="selected-location-mini">

            <Navigation
              size={15}
            />

            <div>
              <small>
                WEATHER LOCATION
              </small>

              <b>
                {
                  location.name
                }
              </b>

              <span>
                {[
                  location.district,
                  location.admin1,
                  location.country
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

        </section>

        {/* VOICE */}
        <button
          className="side-voice-button"
          onClick={
            onOpenVoice
          }
        >
          <Bot
            size={18}
          />

          Voice Assistant
        </button>

        {/* RISK */}
        {risk && (
          <section
            className={`sidebar-risk sidebar-risk-${risk.severity.toLowerCase()}`}
          >
            <div className="sidebar-risk-head">

              <ShieldCheck
                size={16}
              />

              Weather Risk
            </div>

            <strong>
              {riskLabel(
                language,
                risk.severity
              )}
            </strong>

            <small>
              {risk.score}/100
            </small>

            {risk.severity ===
              'High' &&
              measures.length >
                0 && (
                <div className="sidebar-measures">

                  <b>
                    Safety measures
                  </b>

                  {measures.map(
                    (
                      measure,
                      index
                    ) => (
                      <p
                        key={
                          index
                        }
                      >
                        • {
                          measure
                        }
                      </p>
                    )
                  )}

                </div>
              )}

          </section>
        )}

      </div>
    </aside>
  );
}