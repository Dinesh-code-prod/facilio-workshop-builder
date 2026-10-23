// Netlify Function: single API entry point. All routing and authorisation live in server/api.mjs.
import { handle } from '../../server/api.mjs';

export default async (req) => handle(req);

export const config = {
  path: '/api/*',
  rateLimit: { windowLimit: 600, windowSize: 60, aggregateBy: ['ip', 'domain'] }
};
