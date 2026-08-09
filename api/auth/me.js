import { getAuthenticatedUser } from './session.js';

function sendJSON(response, status, body) {
  response.status(status).setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(body));
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return sendJSON(response, 405, { error: 'Method not allowed' });
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return sendJSON(response, 401, { error: 'Not authenticated' });
  }

  return sendJSON(response, 200, { user });
}
