import {
  NextRequest,
  NextResponse
} from 'next/server';

export const dynamic = 'force-dynamic';

function first(
  ...values: Array<
    string | undefined | null
  >
) {
  return (
    values.find(
      value =>
        typeof value === 'string' &&
        value.trim().length > 0
    )?.trim() || ''
  );
}

export async function GET(
  request: NextRequest
) {
  const lat = Number(
    request.nextUrl.searchParams.get('lat')
  );

  const lng = Number(
    request.nextUrl.searchParams.get('lng')
  );

  const language =
    request.nextUrl.searchParams.get('language') ||
    'en';

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return NextResponse.json(
      {
        error:
          'Valid latitude and longitude are required.'
      },
      {
        status: 400
      }
    );
  }

  /*
   * FIRST:
   * OpenStreetMap Nominatim
   */
  try {
    const params =
      new URLSearchParams({
        format: 'jsonv2',
        lat: String(lat),
        lon: String(lng),
        zoom: '18',
        addressdetails: '1',
        'accept-language': language
      });

    const response =
      await fetch(
        `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
        {
          cache: 'no-store',

          headers: {
            Accept:
              'application/json',

            'User-Agent':
              'WeatherGPT-NEXORA/1.0 educational-project'
          }
        }
      );

    if (response.ok) {
      const data =
        await response.json();

      const address =
        data.address || {};

      const road =
        first(
          address.road,
          address.pedestrian,
          address.residential,
          address.footway
        );

      const locality =
        first(
          address.neighbourhood,
          address.suburb,
          address.quarter,
          address.village,
          address.town,
          address.city,
          address.municipality
        );

      const district =
        first(
          address.state_district,
          address.city_district,
          address.county,
          locality
        );

      const state =
        first(
          address.state,
          address.region
        );

      const country =
        first(
          address.country
        );

      const countryCode =
        first(
          address.country_code
        ).toUpperCase();

      const houseRoad =
        [
          address.house_number,
          road
        ]
          .filter(Boolean)
          .join(' ');

      const name =
        first(
          houseRoad,
          locality,
          road,
          district,
          data.name,
          country
        );

      const displayName =
        first(
          data.display_name,

          [
            name,
            district,
            state,
            country
          ]
            .filter(Boolean)
            .join(', ')
        );

      return NextResponse.json({
        location: {
          name:
            name ||
            'Selected location',

          country,

          countryCode,

          admin1:
            state,

          district,

          latitude:
            lat,

          longitude:
            lng
        },

        displayName,

        source:
          'OpenStreetMap'
      });
    }
  } catch (
    error
  ) {
    console.warn(
      'Nominatim failed:',
      error
    );
  }

  /*
   * FALLBACK:
   * Photon
   */
  try {
    const params =
      new URLSearchParams({
        lat:
          String(lat),

        lon:
          String(lng),

        limit:
          '1'
      });

    const response =
      await fetch(
        `https://photon.komoot.io/reverse?${params.toString()}`,
        {
          cache: 'no-store'
        }
      );

    if (!response.ok) {
      throw new Error(
        'Photon reverse lookup failed'
      );
    }

    const data =
      await response.json();

    const p =
      data.features?.[0]
        ?.properties;

    if (!p) {
      throw new Error(
        'No location found'
      );
    }

    const name =
      first(
        p.name,
        p.street,
        p.locality,
        p.district,
        p.city,
        p.county,
        p.state,
        p.country
      );

    const district =
      first(
        p.district,
        p.county,
        p.city
      );

    const displayName =
      [
        p.name,
        p.street,
        p.locality,
        p.city,
        district,
        p.state,
        p.country
      ]
        .filter(Boolean)
        .filter(
          (
            value,
            index,
            array
          ) =>
            array.indexOf(
              value
            ) === index
        )
        .join(', ');

    return NextResponse.json({
      location: {
        name:
          name ||
          'Selected location',

        country:
          p.country ||
          '',

        countryCode:
          String(
            p.countrycode ||
            ''
          ).toUpperCase(),

        admin1:
          p.state ||
          '',

        district,

        latitude:
          lat,

        longitude:
          lng
      },

      displayName:
        displayName ||
        name,

      source:
        'Photon'
    });

  } catch (
    error
  ) {
    console.error(
      'Reverse lookup failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          'Unable to identify this place right now.'
      },
      {
        status: 503
      }
    );
  }
}