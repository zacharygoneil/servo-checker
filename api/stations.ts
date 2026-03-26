/**
 * Vercel serverless function — proxies requests to the Service Victoria
 * Servo Saver API so the API key stays server-side and is never exposed in
 * client JS.
 *
 * Set SERVO_SAVER_API_KEY in your Vercel project environment variables.
 * CDN cache: 30 min, matching client-side localStorage TTL.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  const apiKey = process.env.SERVO_SAVER_API_KEY;

  if (!apiKey) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'SERVO_SAVER_API_KEY environment variable is not set' }));
    return;
  }

  try {
    const upstream = await fetch(
      'https://api.fuel.service.vic.gov.au/open-data/v1/fuel/prices',
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ServoChecker/1.0',
          'x-consumer-id': apiKey,
          'x-transactionid': crypto.randomUUID(),
        },
      }
    );

    const body = await upstream.text();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=300');
    res.statusCode = upstream.status;
    res.end(body);
  } catch (err) {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: 'Upstream fetch failed', detail: String(err) }));
  }
}
