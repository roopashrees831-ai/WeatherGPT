'use client';

import React, {
  useEffect,
  useRef,
  useState
} from 'react';

import type {
  LocationInfo
} from '@/lib/types';

interface Props {
  location:
    LocationInfo;

  onPick:
    (
      lat: number,
      lng: number
    ) =>
      void |
      Promise<void>;
}

export default function WeatherMap({
  location,
  onPick
}: Props) {
  const mapRef =
    useRef<HTMLDivElement>(
      null
    );

  const [
    selectedPlace,
    setSelectedPlace
  ] =
    useState('');

  const [
    findingLocation,
    setFindingLocation
  ] =
    useState(false);

  useEffect(() => {
    if (
      !mapRef.current
    ) {
      return;
    }

    let map: any;
    let marker: any;

    let alive =
      true;

    import(
      'leaflet'
    ).then(
      (LeafletModule) => {
        if (
          !alive ||
          !mapRef.current
        ) {
          return;
        }

        const L =
          LeafletModule.default ||
          LeafletModule;

        /*
         * CREATE MAP
         */
        map =
          L.map(
            mapRef.current,
            {
              zoomControl:
                true
            }
          ).setView(
            [
              location.latitude,
              location.longitude
            ],
            12
          );

        /*
         * REAL OPENSTREETMAP
         */
        L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            attribution:
              '&copy; OpenStreetMap contributors',

            maxZoom:
              19
          }
        ).addTo(map);

        /*
         * CURRENT MARKER
         */
        marker =
          L.circleMarker(
            [
              location.latitude,
              location.longitude
            ],
            {
              radius:
                9,

              color:
                '#22d3ee',

              fillColor:
                '#06b6d4',

              fillOpacity:
                0.95,

              weight:
                2
            }
          ).addTo(
            map
          );

        /*
         * CURRENT LOCATION POPUP
         */
        const currentLocationText =
          [
            location.name,
            location.district,
            location.admin1,
            location.country
          ]
            .filter(
              Boolean
            )
            .join(
              ', '
            );

        marker.bindPopup(
          `
          <div style="
            min-width:220px;
            max-width:300px;
            font-family:Arial,sans-serif;
          ">
            <div style="
              color:#0891b2;
              font-size:11px;
              font-weight:700;
              text-transform:uppercase;
              margin-bottom:5px;
            ">
              Current Weather Location
            </div>

            <strong style="
              font-size:14px;
              line-height:1.4;
            ">
              ${escapeHtml(
                currentLocationText ||
                location.name
              )}
            </strong>
          </div>
          `
        );

        /*
         * CLICK ANYWHERE
         * ON MAP
         */
        map.on(
          'click',
          async (
            event: any
          ) => {
            const lat =
              Number(
                event.latlng.lat
              );

            const lng =
              Number(
                event.latlng.lng
              );

            if (
              !Number.isFinite(
                lat
              ) ||
              !Number.isFinite(
                lng
              )
            ) {
              return;
            }

            setFindingLocation(
              true
            );

            setSelectedPlace(
              'Finding exact location...'
            );

            /*
             * MOVE MARKER
             */
            marker.setLatLng(
              [
                lat,
                lng
              ]
            );

            /*
             * LOADING POPUP
             */
            marker
              .bindPopup(
                `
                <div style="
                  min-width:220px;
                  font-family:Arial,sans-serif;
                ">
                  <strong>
                    Finding exact location...
                  </strong>
                </div>
                `
              )
              .openPopup();

            try {
              /*
               * REVERSE GEOCODING
               */
              const response =
                await fetch(
                  `/api/reverse?lat=${lat}&lng=${lng}`
                );

              const data =
                await response.json();

              const exactPlace =
                data.displayName ||

                [
                  data.location
                    ?.name,

                  data.location
                    ?.district,

                  data.location
                    ?.admin1,

                  data.location
                    ?.country
                ]
                  .filter(
                    Boolean
                  )
                  .join(
                    ', '
                  ) ||

                'Selected location';

              if (
                !alive
              ) {
                return;
              }

              setSelectedPlace(
                exactPlace
              );

              /*
               * SHOW EXACT LOCATION
               * IN MAP POPUP
               */
              marker
                .bindPopup(
                  `
                  <div style="
                    min-width:250px;
                    max-width:340px;
                    font-family:Arial,sans-serif;
                  ">

                    <div style="
                      color:#0891b2;
                      font-size:11px;
                      font-weight:700;
                      text-transform:uppercase;
                      letter-spacing:.07em;
                      margin-bottom:5px;
                    ">
                      Selected Location
                    </div>

                    <strong style="
                      display:block;
                      font-size:14px;
                      line-height:1.45;
                    ">
                      ${escapeHtml(
                        exactPlace
                      )}
                    </strong>

                  </div>
                  `
                )
                .openPopup();

              /*
               * UPDATE WEATHER
               * FOR THIS LOCATION
               */
              await onPick(
                lat,
                lng
              );

            } catch (
              error
            ) {
              console.error(
                'Map location error:',
                error
              );

              setSelectedPlace(
                'Unable to identify this place. Try clicking a nearby location.'
              );

              marker
                .bindPopup(
                  `
                  <div style="
                    min-width:220px;
                    font-family:Arial,sans-serif;
                  ">
                    <strong>
                      Location unavailable
                    </strong>

                    <div style="
                      margin-top:5px;
                      font-size:12px;
                    ">
                      Try clicking a nearby road,
                      city or populated area.
                    </div>
                  </div>
                  `
                )
                .openPopup();

            } finally {
              if (
                alive
              ) {
                setFindingLocation(
                  false
                );
              }
            }
          }
        );

        setTimeout(
          () => {
            map?.invalidateSize();
          },
          100
        );
      }
    );

    return () => {
      alive =
        false;

      if (map) {
        map.remove();
      }
    };

  }, [
    location.latitude,
    location.longitude,
    location.name,
    location.district,
    location.admin1,
    location.country,
    onPick
  ]);

  return (
    <div
      style={{
        position:
          'relative'
      }}
    >

      {/* MAP */}
      <div
        ref={mapRef}
        className="map-canvas"
      />

      {/* SELECTED LOCATION CARD */}
      {(findingLocation ||
        selectedPlace) && (

        <div
          style={{
            position:
              'absolute',

            left:
              '16px',

            bottom:
              '16px',

            zIndex:
              500,

            maxWidth:
              '430px',

            padding:
              '11px 14px',

            borderRadius:
              '12px',

            background:
              'rgba(4, 14, 28, 0.94)',

            border:
              '1px solid rgba(34, 211, 238, 0.35)',

            color:
              '#e5f8ff',

            boxShadow:
              '0 8px 30px rgba(0,0,0,.35)',

            backdropFilter:
              'blur(10px)',

            pointerEvents:
              'none'
          }}
        >

          <div
            style={{
              fontSize:
                '10px',

              color:
                '#22d3ee',

              fontWeight:
                800,

              letterSpacing:
                '.08em',

              textTransform:
                'uppercase',

              marginBottom:
                '5px'
            }}
          >

            {findingLocation
              ? 'Finding location'
              : 'Selected place'}

          </div>

          <div
            style={{
              fontSize:
                '13px',

              lineHeight:
                1.45,

              fontWeight:
                600
            }}
          >
            {
              selectedPlace
            }
          </div>

        </div>
      )}

    </div>
  );
}

function escapeHtml(
  value: string
) {
  return value
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );
}