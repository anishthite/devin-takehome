import {
  DataverseError,
  assertCaller,
  assertIdentifier,
  assertWritable,
  functionPath,
  guidLiteral,
  type DataverseClient,
  type WriteOptions,
} from "./client.ts";
import type { DataverseConnection } from "./config.ts";
import type { DataverseErrorBody, Guid, ODataCollection } from "./types.ts";

type Fetch = typeof fetch;

export interface TokenSource {
  getToken(): Promise<string>;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/**
 * OAuth 2.0 client credentials against Entra ID for `<environment>/.default`, i.e. the app
 * registration backing the Dataverse application user. Tokens are reused until shortly before expiry.
 */
export function clientCredentialsTokenSource(
  connection: DataverseConnection,
  fetchImpl: Fetch = fetch,
  now: () => number = Date.now,
): TokenSource {
  let cached: { token: string; expiresAt: number } | null = null;
  let pending: Promise<string> | null = null;

  async function acquire(): Promise<string> {
    const response = await fetchImpl(
      `https://login.microsoftonline.com/${encodeURIComponent(connection.tenantId)}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: connection.clientId,
          client_secret: connection.clientSecret,
          scope: `${connection.url}/.default`,
        }),
        cache: "no-store",
      },
    );
    if (!response.ok) throw new DataverseError(response.status, `Token request failed (${response.status})`);
    const body = (await response.json()) as TokenResponse;
    cached = { token: body.access_token, expiresAt: now() + body.expires_in * 1000 - REFRESH_MARGIN_MS };
    return body.access_token;
  }

  return {
    getToken() {
      if (cached && cached.expiresAt > now()) return Promise.resolve(cached.token);
      pending ??= acquire().finally(() => {
        pending = null;
      });
      return pending;
    },
  };
}

const ENTITY_ID = /\(([0-9a-f-]{36})\)$/i;

/** Dataverse Web API v9.2 over `fetch`, authenticated as the application user. */
export function httpDataverseClient(
  connection: Pick<DataverseConnection, "url">,
  tokens: TokenSource,
  fetchImpl: Fetch = fetch,
): DataverseClient {
  const base = `${connection.url}/api/data/v9.2/`;

  async function send(method: string, path: string, body?: unknown, extraHeaders: Record<string, string> = {}) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${await tokens.getToken()}`,
      Accept: "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      ...extraHeaders,
    };
    if (body !== undefined) headers["Content-Type"] = "application/json; charset=utf-8";

    const response = await fetchImpl(base + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as DataverseErrorBody;
      throw new DataverseError(
        response.status,
        error.error?.message ?? `Dataverse ${method} ${path} failed (${response.status})`,
        error.error?.code,
      );
    }
    return response;
  }

  const read = async <T>(path: string) =>
    (await (
      await send("GET", path, undefined, {
        Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
      })
    ).json()) as T;

  const withQuery = (path: string, query?: string) => (query ? `${path}?${query}` : path);

  /** Every write is impersonated so Dataverse auditing records the signed-in user. */
  const writeHeaders = (options: WriteOptions) => ({ CallerObjectId: assertCaller(options) });

  return {
    retrieveMultiple<T>(entitySet: string, query?: string) {
      return read<ODataCollection<T>>(withQuery(assertIdentifier(entitySet), query));
    },

    retrieve<T>(entitySet: string, id: Guid, query?: string) {
      return read<T>(withQuery(`${assertIdentifier(entitySet)}(${guidLiteral(id)})`, query));
    },

    callFunction<T>(name: string, params: Record<string, string>, query?: string) {
      return read<T>(functionPath(name, params, query));
    },

    async create(entitySet, data, options) {
      assertWritable(assertIdentifier(entitySet));
      const response = await send("POST", entitySet, data, writeHeaders(options));
      const id = ENTITY_ID.exec(response.headers.get("OData-EntityId") ?? "")?.[1];
      if (!id) throw new DataverseError(502, "Dataverse create response had no OData-EntityId header");
      return id.toLowerCase();
    },

    async update(entitySet, id, data, options) {
      assertWritable(assertIdentifier(entitySet));
      await send("PATCH", `${entitySet}(${guidLiteral(id)})`, data, {
        ...writeHeaders(options),
        "If-Match": "*",
      });
    },
  };
}
