export function sendJSON(response, status, body) {
  response.status(status).setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(body));
}

export async function parseJSON(request) {
  return new Promise((resolve) => {
    let data = '';
    request.on('data', (chunk) => {
      data += chunk;
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

export function getRequestUrl(request) {
  const base = request.headers.host ? `https://${request.headers.host}` : 'http://localhost';
  return new URL(request.url, base);
}
