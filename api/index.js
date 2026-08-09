import authHandler from './auth.js';
import bikesHandler from './bikes.js';
import healthHandler from './health.js';
import registrationRequestsHandler from './admin/registration-requests.js';
import usersHandler from './admin/users.js';
import contactsHandler from './admin/contacts.js';

export default function handler(request, response) {
  const url = new URL(request.url, `https://${request.headers.host}`);
  const path = url.pathname.replace(/^\/api/, '') || '/';

  if (path === '/health') {
    return healthHandler(request, response);
  }

  if (path === '/auth' || path.startsWith('/auth/')) {
    return authHandler(request, response);
  }

  if (path === '/bikes' || path.startsWith('/bikes/')) {
    return bikesHandler(request, response);
  }

  if (path === '/admin/registration-requests' || path.startsWith('/admin/registration-requests/')) {
    return registrationRequestsHandler(request, response);
  }

  if (path === '/admin/users' || path.startsWith('/admin/users/')) {
    return usersHandler(request, response);
  }

  if (path === '/admin/contacts' || path.startsWith('/admin/contacts/')) {
    return contactsHandler(request, response);
  }

  response.status(404).setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify({ error: 'Not found' }));
}
