# @tom/brain-sdk

Typed TypeScript client for the ToM Brain localhost API.

## Install (local file dependency)

```bash
npm install --save "file:../ToM/packages/tom-brain-sdk"
```

## Usage

```ts
import { ToMBrainClient } from "@tom/brain-sdk";

const client = new ToMBrainClient({
  baseUrl: "http://127.0.0.1:8787",
  token: process.env.TOM_API_TOKEN,
});

const health = await client.health();
const stats = await client.stats();
const query = await client.query("What lessons did I record about SSH hardening?", 6);
```

## API Methods

- `health()`
- `stats()`
- `query(question, topK?)`
- `ingest()`
- `cycle()`
