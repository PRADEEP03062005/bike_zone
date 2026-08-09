export default function handler(request, response) {
  response.status(200).setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify({ status: 'ok' }));
}
