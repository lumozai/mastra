# @mastra/lumoz

Export Mastra traces to [Lumoz](https://lumoz.ai) using OpenTelemetry and [OpenInference Semantic Conventions](https://github.com/Arize-ai/openinference/tree/main/spec).

## Installation

```bash
npm install @mastra/lumoz
```

## Configuration

Add `LumozExporter` to your Mastra observability configuration.

### Environment Variables

```bash
LUMOZ_API_KEY=client_id:client_secret
LUMOZ_ENDPOINT=https://api.lumoz.ai/proxy/v1/traces
```

`LUMOZ_ENDPOINT` is optional. If omitted, the exporter uses:

```text
https://api.lumoz.ai/proxy/v1/traces
```

You can also set `LUMOZ_BASE_URL` instead of `LUMOZ_ENDPOINT`; the exporter appends `/proxy/v1/traces`.

`OTEL_ENDPOINT` is accepted as a legacy fallback for existing examples.

### Zero-Config

```typescript
import { LumozExporter } from '@mastra/lumoz';
import { Mastra } from '@mastra/core/mastra';

const mastra = new Mastra({
  observability: {
    configs: {
      lumoz: {
        serviceName: 'my-service',
        exporters: [new LumozExporter()],
      },
    },
  },
});
```

### Explicit Configuration

```typescript
new LumozExporter({
  apiKey: 'client_id:client_secret',
  endpoint: 'https://api.lumoz.ai/proxy/v1/traces',
});
```

### Subtenant Routing

Use `subtenantId` to route traces to a Lumoz subtenant:

```typescript
new LumozExporter({
  apiKey: process.env.LUMOZ_API_KEY,
  subtenantId: 'customer-tenant-id',
});
```

For multi-subtenant applications, create one exporter instance per subtenant so OTLP batches do not mix spans that need different `x-lumoz-subtenant-id` headers.

## Options

```typescript
new LumozExporter({
  // Required at runtime, or set LUMOZ_API_KEY
  apiKey: 'client_id:client_secret',

  // Optional full OTLP traces endpoint
  endpoint: 'https://api.lumoz.ai/proxy/v1/traces',

  // Optional base URL used when endpoint is omitted
  baseUrl: 'https://api.lumoz.ai',

  // Optional Lumoz subtenant routing header value
  subtenantId: 'customer-tenant-id',

  // Optional additional headers. Lumoz auth, accept, and subtenant headers are managed internally.
  headers: {
    'x-custom-header': 'value',
  },

  logLevel: 'debug',
  batchSize: 512,
  timeout: 30000,
  resourceAttributes: {
    'custom.attribute': 'value',
  },
});
```

The exporter automatically sets:

```text
accept: application/x-protobuf
authorization: Basic base64(client_id:client_secret)
x-lumoz-subtenant-id: <subtenantId>
```

## OpenInference Semantic Conventions

This exporter follows the [OpenInference Semantic Conventions](https://github.com/Arize-ai/openinference/tree/main/spec) for generative AI applications.

## License

Apache 2.0
