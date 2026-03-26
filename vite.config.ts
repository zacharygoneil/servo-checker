import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        // Dev-only proxy: mirrors what api/stations.ts does in production.
        // The API key lives in .env.local as SERVO_SAVER_API_KEY (no VITE_ prefix)
        // so it is never bundled into client JS.
        name: 'servo-saver-dev-proxy',
        configureServer(server) {
          server.middlewares.use('/api/stations', async (_req, res) => {
            const apiKey = env.SERVO_SAVER_API_KEY;
            if (!apiKey) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'SERVO_SAVER_API_KEY not set in .env.local' }));
              return;
            }

            try {
              const url = `https://api.fuel.service.vic.gov.au/open-data/v1/fuel/prices`;
              const upstream = await fetch(url, {
                headers: {
                  'Accept': 'application/json',
                  'User-Agent': 'ServoChecker/1.0',
                  'x-consumer-id': apiKey,
                  'x-transactionid': crypto.randomUUID(),
                },
              });
              const body = await upstream.text();
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = upstream.status;
              res.end(body);
            } catch (err) {
              res.statusCode = 502;
              res.end(JSON.stringify({ error: 'Upstream fetch failed', detail: String(err) }));
            }
          });
        },
      },
    ],
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    },
  };
});
