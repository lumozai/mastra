import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LumozExporter } from './tracing';

vi.mock('@mastra/otel-exporter', () => {
  const OtelExporter = vi.fn().mockImplementation(function (this: any) {
    this.exportTracingEvent = vi.fn();
    this.shutdown = vi.fn();
    this.setDisabled = vi.fn();
    this.logger = {
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    };
  });

  OtelExporter.prototype.init = vi.fn();
  return { OtelExporter };
});

describe('LumozExporterConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.LUMOZ_API_KEY;
    delete process.env.LUMOZ_ENDPOINT;
    delete process.env.LUMOZ_BASE_URL;
    delete process.env.OTEL_ENDPOINT;
  });

  it('configures with explicit apiKey and endpoint', async () => {
    const { OtelExporter } = await import('@mastra/otel-exporter');
    const otelExporterSpy = vi.mocked(OtelExporter);

    new LumozExporter({
      apiKey: 'client:secret',
      endpoint: 'https://api.lumoz.ai/proxy/v1/traces',
    });

    expect(otelExporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: {
          custom: {
            endpoint: 'https://api.lumoz.ai/proxy/v1/traces',
            headers: {
              accept: 'application/x-protobuf',
              authorization: 'Basic Y2xpZW50OnNlY3JldA==',
            },
            protocol: 'http/protobuf',
          },
        },
      }),
    );
  });

  it('strips trailing slashes from explicit endpoint', async () => {
    const { OtelExporter } = await import('@mastra/otel-exporter');
    const otelExporterSpy = vi.mocked(OtelExporter);

    new LumozExporter({
      apiKey: 'client:secret',
      endpoint: 'https://api.lumoz.ai/proxy/v1/traces/',
    });

    expect(otelExporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: {
          custom: expect.objectContaining({
            endpoint: 'https://api.lumoz.ai/proxy/v1/traces',
          }),
        },
      }),
    );
  });

  it('reads apiKey from LUMOZ_API_KEY env var', async () => {
    const { OtelExporter } = await import('@mastra/otel-exporter');
    const otelExporterSpy = vi.mocked(OtelExporter);

    process.env.LUMOZ_API_KEY = 'env-client:env-secret';

    new LumozExporter();

    expect(otelExporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: {
          custom: {
            endpoint: 'https://api.lumoz.ai/proxy/v1/traces',
            headers: {
              accept: 'application/x-protobuf',
              authorization: 'Basic ZW52LWNsaWVudDplbnYtc2VjcmV0',
            },
            protocol: 'http/protobuf',
          },
        },
      }),
    );
  });

  it('prefers explicit config over env vars', async () => {
    const { OtelExporter } = await import('@mastra/otel-exporter');
    const otelExporterSpy = vi.mocked(OtelExporter);

    process.env.LUMOZ_API_KEY = 'env-client:env-secret';
    process.env.LUMOZ_ENDPOINT = 'https://env.lumoz.ai/proxy/v1/traces';

    new LumozExporter({
      apiKey: 'explicit-client:explicit-secret',
      endpoint: 'https://explicit.lumoz.ai/proxy/v1/traces',
    });

    expect(otelExporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: {
          custom: {
            endpoint: 'https://explicit.lumoz.ai/proxy/v1/traces',
            headers: {
              accept: 'application/x-protobuf',
              authorization: 'Basic ZXhwbGljaXQtY2xpZW50OmV4cGxpY2l0LXNlY3JldA==',
            },
            protocol: 'http/protobuf',
          },
        },
      }),
    );
  });

  it('resolves endpoint from LUMOZ_ENDPOINT', async () => {
    const { OtelExporter } = await import('@mastra/otel-exporter');
    const otelExporterSpy = vi.mocked(OtelExporter);

    process.env.LUMOZ_ENDPOINT = 'https://env.lumoz.ai/proxy/v1/traces';

    new LumozExporter({
      apiKey: 'client:secret',
    });

    expect(otelExporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: {
          custom: expect.objectContaining({
            endpoint: 'https://env.lumoz.ai/proxy/v1/traces',
          }),
        },
      }),
    );
  });

  it('resolves endpoint from legacy OTEL_ENDPOINT', async () => {
    const { OtelExporter } = await import('@mastra/otel-exporter');
    const otelExporterSpy = vi.mocked(OtelExporter);

    process.env.OTEL_ENDPOINT = 'https://legacy.lumoz.ai/proxy/v1/traces';

    new LumozExporter({
      apiKey: 'client:secret',
    });

    expect(otelExporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: {
          custom: expect.objectContaining({
            endpoint: 'https://legacy.lumoz.ai/proxy/v1/traces',
          }),
        },
      }),
    );
  });

  it('resolves endpoint from LUMOZ_BASE_URL', async () => {
    const { OtelExporter } = await import('@mastra/otel-exporter');
    const otelExporterSpy = vi.mocked(OtelExporter);

    process.env.LUMOZ_BASE_URL = 'https://base.lumoz.ai/';

    new LumozExporter({
      apiKey: 'client:secret',
    });

    expect(otelExporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: {
          custom: expect.objectContaining({
            endpoint: 'https://base.lumoz.ai/proxy/v1/traces',
          }),
        },
      }),
    );
  });

  it('resolves endpoint from config baseUrl', async () => {
    const { OtelExporter } = await import('@mastra/otel-exporter');
    const otelExporterSpy = vi.mocked(OtelExporter);

    new LumozExporter({
      apiKey: 'client:secret',
      baseUrl: 'https://config-base.lumoz.ai/',
    });

    expect(otelExporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: {
          custom: expect.objectContaining({
            endpoint: 'https://config-base.lumoz.ai/proxy/v1/traces',
          }),
        },
      }),
    );
  });

  it('uses the default Lumoz endpoint', async () => {
    const { OtelExporter } = await import('@mastra/otel-exporter');
    const otelExporterSpy = vi.mocked(OtelExporter);

    new LumozExporter({
      apiKey: 'client:secret',
    });

    expect(otelExporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: {
          custom: expect.objectContaining({
            endpoint: 'https://api.lumoz.ai/proxy/v1/traces',
          }),
        },
      }),
    );
  });

  it('preserves custom non-auth headers and owns generated headers', async () => {
    const { OtelExporter } = await import('@mastra/otel-exporter');
    const otelExporterSpy = vi.mocked(OtelExporter);

    new LumozExporter({
      apiKey: 'client:secret',
      headers: {
        accept: 'application/json',
        Authorization: 'Bearer wrong',
        'x-custom-header': 'value',
      },
    });

    expect(otelExporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: {
          custom: expect.objectContaining({
            headers: {
              'x-custom-header': 'value',
              accept: 'application/x-protobuf',
              authorization: 'Basic Y2xpZW50OnNlY3JldA==',
            },
          }),
        },
      }),
    );
  });

  it('adds x-lumoz-subtenant-id when subtenantId is configured', async () => {
    const { OtelExporter } = await import('@mastra/otel-exporter');
    const otelExporterSpy = vi.mocked(OtelExporter);

    new LumozExporter({
      apiKey: 'client:secret',
      subtenantId: 'customer-tenant_1',
    });

    expect(otelExporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: {
          custom: expect.objectContaining({
            headers: expect.objectContaining({
              'x-lumoz-subtenant-id': 'customer-tenant_1',
            }),
          }),
        },
      }),
    );
  });

  it('preserves resource attributes', async () => {
    const { OtelExporter } = await import('@mastra/otel-exporter');
    const otelExporterSpy = vi.mocked(OtelExporter);

    new LumozExporter({
      apiKey: 'client:secret',
      resourceAttributes: {
        'service.name': 'my-agent',
      },
    });

    expect(otelExporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceAttributes: {
          'service.name': 'my-agent',
        },
      }),
    );
  });

  it('disables exporter when apiKey is missing', () => {
    const exporter = new LumozExporter();

    expect((exporter as any).setDisabled).toHaveBeenCalledWith(expect.stringContaining('Missing required API key'));
  });

  it('disables exporter when apiKey is malformed', () => {
    const exporter = new LumozExporter({
      apiKey: 'missing-colon',
    });

    expect((exporter as any).setDisabled).toHaveBeenCalledWith(
      expect.stringContaining("LUMOZ_API_KEY must be '<client_id>:<client_secret>'"),
    );
  });

  it('disables exporter when subtenantId is invalid', () => {
    const exporter = new LumozExporter({
      apiKey: 'client:secret',
      subtenantId: 'invalid tenant id',
    });

    expect((exporter as any).setDisabled).toHaveBeenCalledWith(expect.stringContaining('subtenantId must be'));
  });
});
