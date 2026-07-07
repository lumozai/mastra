import { OtelExporter } from '@mastra/otel-exporter';
import type { OtelExporterConfig } from '@mastra/otel-exporter';

import { OpenInferenceOTLPTraceExporter } from './openInferenceOTLPExporter.js';

const LOG_PREFIX = '[LumozExporter]';
const DEFAULT_BASE_URL = 'https://api.lumoz.ai';
const TRACES_PATH = '/proxy/v1/traces';
const VALID_SUBTENANT_ID = /^[a-zA-Z0-9._:-]{1,128}$/;

export type LumozExporterConfig = Omit<OtelExporterConfig, 'provider' | 'exporter'> & {
  /**
   * Lumoz API key for authentication, formatted as "client_id:client_secret".
   * Falls back to LUMOZ_API_KEY environment variable.
   */
  apiKey?: string;
  /**
   * Full Lumoz OTLP traces endpoint.
   * Falls back to LUMOZ_ENDPOINT, then OTEL_ENDPOINT, then baseUrl + /proxy/v1/traces.
   */
  endpoint?: string;
  /**
   * Lumoz API base URL used when endpoint is not provided.
   * Falls back to LUMOZ_BASE_URL, then https://api.lumoz.ai.
   */
  baseUrl?: string;
  /**
   * Optional Lumoz subtenant ID. Sent as x-lumoz-subtenant-id.
   */
  subtenantId?: string;
  /**
   * Optional headers to be added to each OTLP request.
   * Note: accept, authorization, and x-lumoz-subtenant-id are managed internally.
   */
  headers?: Record<string, string>;
};

/**
 * Exports Mastra traces to Lumoz AI using OpenInference semantic conventions.
 *
 * Supports zero-config setup via environment variables (LUMOZ_API_KEY, LUMOZ_ENDPOINT,
 * LUMOZ_BASE_URL) or explicit configuration. Automatically disables itself with a warning
 * when required credentials are missing or invalid.
 *
 * @example
 * ```ts
 * const mastra = new Mastra({
 *   observability: new Observability({
 *     configs: {
 *       lumoz: {
 *         serviceName: 'my-service',
 *         exporters: [new LumozExporter()],
 *       },
 *     },
 *   }),
 * });
 * ```
 */
export class LumozExporter extends OtelExporter {
  name = 'lumoz';

  /**
   * @param config - Lumoz exporter configuration. All fields are optional when
   * the corresponding environment variables are set.
   */
  constructor(config: LumozExporterConfig = {}) {
    const apiKey = config.apiKey ?? process.env.LUMOZ_API_KEY;
    const tracesEndpoint = resolveTracesEndpoint(config);
    const subtenantId = config.subtenantId;

    const headers: Record<string, string> = {
      ...config.headers,
    };

    let disabledReason: string | undefined;

    if (!apiKey) {
      disabledReason =
        `${LOG_PREFIX} Missing required API key. ` + `Set LUMOZ_API_KEY environment variable or pass apiKey in config.`;
    } else if (!apiKey.includes(':')) {
      disabledReason = `${LOG_PREFIX} LUMOZ_API_KEY must be '<client_id>:<client_secret>'.`;
    }

    if (!disabledReason && subtenantId && !VALID_SUBTENANT_ID.test(subtenantId)) {
      disabledReason = `${LOG_PREFIX} subtenantId must be 1-128 characters and contain only letters, numbers, dot, underscore, colon, or dash.`;
    }

    if (!disabledReason) {
      deleteHeader(headers, 'accept');
      deleteHeader(headers, 'authorization');
      deleteHeader(headers, 'x-lumoz-subtenant-id');

      headers['accept'] = 'application/x-protobuf';
      headers['authorization'] = `Basic ${Buffer.from(apiKey!, 'utf-8').toString('base64')}`;

      if (subtenantId) {
        headers['x-lumoz-subtenant-id'] = subtenantId;
      }
    }

    if (disabledReason) {
      super({
        ...config,
        provider: {
          custom: {
            endpoint: 'http://disabled',
            headers: {},
            protocol: 'http/protobuf',
          },
        },
      });
      this.setDisabled(disabledReason);
      return;
    }

    super({
      exporter: new OpenInferenceOTLPTraceExporter({
        url: tracesEndpoint,
        headers,
      }),
      ...config,
      resourceAttributes: {
        ...config.resourceAttributes,
      },
      provider: {
        custom: {
          endpoint: tracesEndpoint,
          headers,
          protocol: 'http/protobuf',
        },
      } satisfies OtelExporterConfig['provider'],
    } satisfies OtelExporterConfig);
  }
}

function resolveTracesEndpoint(config: LumozExporterConfig): string {
  const endpoint = config.endpoint ?? process.env.LUMOZ_ENDPOINT ?? process.env.OTEL_ENDPOINT;

  if (endpoint) {
    return stripTrailingSlashes(endpoint);
  }

  const baseUrl = config.baseUrl ?? process.env.LUMOZ_BASE_URL ?? DEFAULT_BASE_URL;
  return `${stripTrailingSlashes(baseUrl)}${TRACES_PATH}`;
}

function deleteHeader(headers: Record<string, string>, headerName: string) {
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === headerName) {
      delete headers[key];
    }
  }
}

/**
 * Remove trailing '/' characters procedurally. Avoids the polynomial
 * backtracking that a greedy regex like `/\/+$/` can exhibit when the
 * input is attacker-controlled.
 */
function stripTrailingSlashes(s: string): string {
  let end = s.length;
  while (end > 0 && s.charCodeAt(end - 1) === 47 /* '/' */) {
    end--;
  }
  return end === s.length ? s : s.slice(0, end);
}
