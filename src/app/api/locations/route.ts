import {
  NextRequest,
  NextResponse
} from 'next/server';

export const dynamic =
  'force-dynamic';

const BASE =
  'https://countriesnow.space/api/v0.1/countries';

async function getJson(
  url: string,
  options?: RequestInit
) {
  const response =
    await fetch(
      url,
      {
        ...options,
        cache: 'no-store',
        headers: {
          'Content-Type':
            'application/json',
          ...(options?.headers ||
            {})
        }
      }
    );

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
    request.nextUrl
      .searchParams
      .get('type');

  const country =
    request.nextUrl
      .searchParams
      .get('country') ||
    '';

  const state =
    request.nextUrl
      .searchParams
      .get('state') ||
    '';

  try {
    /*
     * =========================
     * COUNTRIES
     * =========================
     */
    if (
      type ===
      'countries'
    ) {
      const payload =
        await getJson(
          `${BASE}/states`
        );

      const rows =
        Array.isArray(
          payload?.data
        )
          ? payload.data
          : [];

      const countries =
        rows
          .map(
            (
              item: any
            ) => ({
              name:
                String(
                  item.name ||
                    ''
                ),

              iso2:
                String(
                  item.iso2 ||
                    ''
                )
            })
          )
          .filter(
            (
              item: {
                name: string;
              }
            ) =>
              item.name
          )
          .sort(
            (
              a: {
                name: string;
              },
              b: {
                name: string;
              }
            ) =>
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
    if (
      type ===
      'states'
    ) {
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

      const states =
        (
          payload?.data
            ?.states ||
          []
        )
          .map(
            (
              item: any
            ) =>
              String(
                item.name ||
                  ''
              )
          )
          .filter(Boolean)
          .sort(
            (
              a: string,
              b: string
            ) =>
              a.localeCompare(
                b
              )
          );

      return NextResponse.json({
        states
      });
    }

    /*
     * =========================
     * DISTRICT / CITY
     *
     * The global data source
     * provides cities for each
     * selected state.
     * =========================
     */
    if (
      type ===
      'districts'
    ) {
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

      const cities =
        Array.isArray(
          payload?.data
        )
          ? payload.data
          : [];

      const districts =
        Array.from(
          new Set(
            cities
              .map(
                (
                  item: unknown
                ) =>
                  String(
                    item ||
                      ''
                  ).trim()
              )
              .filter(Boolean)
          )
        ).sort(
          (
            a,
            b
          ) =>
            a.localeCompare(
              b
            )
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

    /*
     * Never invent a list.
     */
    return NextResponse.json(
      {
        countries:
          type ===
          'countries'
            ? []
            : undefined,

        states:
          type ===
          'states'
            ? []
            : undefined,

        districts:
          type ===
          'districts'
            ? []
            : undefined,

        error:
          'Location hierarchy service is temporarily unavailable.'
      },
      {
        status: 502
      }
    );
  }
}