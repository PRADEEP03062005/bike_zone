import { logout, getCurrentUser } from './auth.js';

const authLink = document.querySelector('[data-auth-link]');

async function updateAuthLink() {
  if (!authLink) return;

  try {
    const user = await getCurrentUser();
    const isLoggedIn = Boolean(user && user.status === 'ACTIVE');

    if (isLoggedIn) {
      authLink.textContent = 'Sign Out';
      authLink.href = '#';
      authLink.removeAttribute('data-login-link');
      authLink.onclick = async (event) => {
        event.preventDefault();
        await logout();
        window.location.href = '/';
      };
      return;
    }
  } catch {
    // fall back to login state
  }

  authLink.textContent = 'Login';
  authLink.href = '/login.html';
  authLink.onclick = null;
}

updateAuthLink();
