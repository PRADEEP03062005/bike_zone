import loginHandler from './auth/login.js';
import logoutHandler from './auth/logout.js';
import registerHandler from './auth/register.js';
import meHandler from './auth/me.js';

export default function handler(request, response) {
  const url = new URL(request.url, `https://${request.headers.host}`);
  const path = url.pathname.replace(/^\/api\/auth/, '') || '/';

  if (path === '/login') return loginHandler(request, response);
  if (path === '/logout') return logoutHandler(request, response);
  if (path === '/register') return registerHandler(request, response);
  if (path === '/me') return meHandler(request, response);

  response.status(404).setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify({ error: 'Not found' }));
}
