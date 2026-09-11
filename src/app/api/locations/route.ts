import {
  NextRequest,
  NextResponse
} from 'next/server';

export const dynamic = 'force-dynamic';

const BASE =
  'https://countriesnow.space/api/v0.1/countries';

type CountryRow = {
  name?: string;
  iso2?: string;
};

type StateRow = {
  name?: string;
};

async function getJson(
  url: string,
  options?: RequestInit
): Promise<any> {
  const response =
    await fetch(url, {
      ...options,
      cache: 'no-store',
      headers: {
        'Content-Type':
          'application/json',
        ...(options?.headers || {})
      }
    });

  if (!response.ok) {
    throw new Error(
      `Location API failed: ${response.status}`
    );
  }

  return response.json();
}

export async function GET(
  request: NextRequest
) {
  const type =
    request.nextUrl.searchParams.get(
      'type'
    );

  const country =
    request.nextUrl.searchParams.get(
      'country'
    ) || '';

  const state =
    request.nextUrl.searchParams.get(
      'state'
    ) || '';

  try {
    /*
     * =========================
     * COUNTRIES
     * =========================
     */
    if (type === 'countries') {
      const payload =
        await getJson(
          `${BASE}/states`
        );

      const rows: CountryRow[] =
        Array.isArray(
          payload?.data
        )
          ? payload.data
          : [];

      const countries =
        rows
          .map(item => ({
            name:
              String(
                item.name || ''
              ),

            iso2:
              String(
                item.iso2 || ''
              )
          }))
          .filter(
            item =>
              item.name.length > 0
          )
          .sort(
            (a, b) =>
              a.name.localeCompare(
                b.name
              )
          );

      return NextResponse.json({
        countries
      });
    }

    /*
     * =========================
     * STATES
     * =========================
     */
    if (type === 'states') {
      if (!country) {
        return NextResponse.json({
          states: []
        });
      }

      const payload =
        await getJson(
          `${BASE}/states`,
          {
            method: 'POST',
            body:
              JSON.stringify({
                country
              })
          }
        );

      const rawStates: StateRow[] =
        Array.isArray(
          payload?.data?.states
        )
          ? payload.data.states
          : [];

      const states: string[] =
        rawStates
          .map(item =>
            String(
              item.name || ''
            ).trim()
          )
          .filter(
            item =>
              item.length > 0
          )
          .sort(
            (a, b) =>
              a.localeCompare(b)
          );

      return NextResponse.json({
        states
      });
    }

    /*
     * =========================
     * DISTRICTS / CITIES
     * =========================
     */
    if (type === 'districts') {
      if (
        !country ||
        !state
      ) {
        return NextResponse.json({
          districts: []
        });
      }

      const payload =
        await getJson(
          `${BASE}/state/cities`,
          {
            method: 'POST',
            body:
              JSON.stringify({
                country,
                state
              })
          }
        );

      const cities: unknown[] =
        Array.isArray(
          payload?.data
        )
          ? payload.data
          : [];

      const cityNames: string[] =
        cities
          .map(item =>
            String(
              item ?? ''
            ).trim()
          )
          .filter(
            item =>
              item.length > 0
          );

      const uniqueCities =
        new Set<string>(
          cityNames
        );

      const districts: string[] =
        Array.from(
          uniqueCities
        ).sort(
          (a, b) =>
            a.localeCompare(b)
        );

      return NextResponse.json({
        districts
      });
    }

    return NextResponse.json(
      {
        error:
          'Invalid location request.'
      },
      {
        status: 400
      }
    );
  } catch (error) {
    console.error(
      'Location hierarchy error:',
      error
    );

    if (type === 'countries') {
      return NextResponse.json(
        {
          countries: [],
          error:
            'Location service is temporarily unavailable.'
        },
        {
          status: 502
        }
      );
    }

    if (type === 'states') {
      return NextResponse.json(
        {
          states: [],
          error:
            'Location service is temporarily unavailable.'
        },
        {
          status: 502
        }
      );
    }

    if (type === 'districts') {
      return NextResponse.json(
        {
          districts: [],
          error:
            'Location service is temporarily unavailable.'
        },
        {
          status: 502
        }
      );
    }

    return NextResponse.json(
      {
        error:
          'Location service is temporarily unavailable.'
      },
      {
        status: 502
      }
    );
  }
}