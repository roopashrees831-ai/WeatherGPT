import {
  NextRequest,
  NextResponse
} from 'next/server';

export const dynamic =
  'force-dynamic';

export async function GET(
  request: NextRequest
) {
  const q =
    (
      request.nextUrl
        .searchParams
        .get('q') ||
      ''
    ).trim();

  const countryCode =
    (
      request.nextUrl
        .searchParams
        .get(
          'countryCode'
        ) ||
      ''
    ).trim();

  const state =
    (
      request.nextUrl
        .searchParams
        .get('state') ||
      request.nextUrl
        .searchParams
        .get('admin1') ||
      ''
    ).trim();

  const language =
    (
      request.nextUrl
        .searchParams
        .get('language') ||
      'en'
    ).toLowerCase();

  if (
    q.length <
    2
  ) {
    return NextResponse.json({
      results: []
    });
  }

  try {
    /*
     * Adding the state as an
     * administrative qualifier
     * improves exact-area search.
     *
     * Example:
     * Jayanagar, Karnataka
     */
    const searchName =
      state
        ? `${q}, ${state}`
        : q;

    const params =
      new URLSearchParams({
        name:
          searchName,

        count:
          '20',

        language,

        format:
          'json'
      });

    if (
      countryCode
    ) {
      params.set(
        'countryCode',
        countryCode
          .toUpperCase()
      );
    }

    const response =
      await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,
        {
          cache:
            'no-store'
        }
      );

    if (
      !response.ok
    ) {
      throw new Error(
        `Geocoding failed: ${response.status}`
      );
    }

    const data =
      await response.json();

    const rawResults =
      Array.isArray(
        data?.results
      )
        ? data.results
        : [];

    const results =
      rawResults.map(
        (
          item: any
        ) => ({
          name:
            String(
              item.name ||
                ''
            ),

          country:
            String(
              item.country ||
                ''
            ),

          countryCode:
            String(
              item.country_code ||
                ''
            ),

          admin1:
            String(
              item.admin1 ||
                ''
            ),

          /*
           * Open-Meteo provides
           * admin2/admin3/admin4.
           * admin2 normally gives
           * the district/county.
           */
          district:
            String(
              item.admin2 ||
                item.admin3 ||
                ''
            ),

          latitude:
            Number(
              item.latitude
            ),

          longitude:
            Number(
              item.longitude
            ),

          timezone:
            String(
              item.timezone ||
                ''
            )
        })
      );

    return NextResponse.json({
      results
    });

  } catch (error) {
    console.error(
      'Place search error:',
      error
    );

    return NextResponse.json({
      results: [],
      error:
        'Place search is temporarily unavailable.'
    });
  }
}