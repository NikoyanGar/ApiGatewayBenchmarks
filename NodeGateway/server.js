import Fastify from 'fastify';
import httpProxy from '@fastify/http-proxy';

const PORT = Number(process.env.PORT || 8002);
// Include /api in the upstream so /api/test -> http://.../api/test
const UPSTREAM = process.env.UPSTREAM || 'http://backend-api:8080/api';

const app = Fastify({ logger: true, trustProxy: true });

// Mount proxy at /api; default behavior strips /api from the request path,
// which is fine because UPSTREAM already includes /api.
await app.register(httpProxy, {
  upstream: UPSTREAM,
  prefix: '/api',
  undici: {
    connections: 256,
    pipelining: 1,
    headersTimeout: 30000,
    bodyTimeout: 30000,
  },
});

app.get('/health', async () => ({ status: 'ok', upstream: UPSTREAM }));

const start = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info(`NodeGateway listening on ${PORT}, upstream=${UPSTREAM}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => app.close());
process.on('SIGINT', () => app.close());

start();