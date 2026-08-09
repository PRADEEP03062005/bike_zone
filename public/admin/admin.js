import { api } from '/js/api.js';

const authState = document.getElementById('admin-auth-state');
const adminContent = document.getElementById('admin-content');
const pendingCount = document.getElementById('pending-count');
const usersCount = document.getElementById('users-count');
const bikesCount = document.getElementById('bikes-count');
const soldCount = document.getElementById('sold-count');
const requestsList = document.getElementById('requests-list');
const requestsSummary = document.getElementById('requests-summary');
const usersList = document.getElementById('users-list');
const usersSummary = document.getElementById('users-summary');
const addBikeForm = document.getElementById('add-bike-form');
const bikeFormMessage = document.getElementById('bike-form-message');
const contactForm = document.getElementById('contact-form');
const contactFormMessage = document.getElementById('contact-form-message');
const contactsTableBody = document.getElementById('contacts-table-body');
const tabButtons = Array.from(document.querySelectorAll('.tab-button'));
const tabPanels = Array.from(document.querySelectorAll('.tab-panel'));

function switchTab(tabName) {
  tabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tabName);
  });
  tabPanels.forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.panel === tabName);
  });
}

tabButtons.forEach((button) => {
  button.addEventListener('click', () => switchTab(button.dataset.tab));
});

async function loadAdminData() {
  try {
    const [me, requestsData, bikesData, usersData, contactsData] = await Promise.all([
      api.get('/auth/me'),
      api.get('/admin/registration-requests'),
      api.get('/bikes'),
      api.get('/admin/users'),
      api.get('/admin/contacts')
    ]);

    const user = me.user;
    if (!user?.roles?.some((role) => role.name === 'ADMIN')) {
      authState.textContent = 'Admin access is required to view this page.';
      return;
    }

    authState.textContent = `Signed in as ${user.full_name || user.username}`;
    adminContent.hidden = false;

    const requests = requestsData.requests || [];
    pendingCount.textContent = requests.filter((item) => item.status === 'PENDING').length;
    requestsSummary.textContent = `${requests.length} total`;
    requestsList.innerHTML = '';

    if (requests.length === 0) {
      requestsList.innerHTML = '<div class="request-item"><p>No registration requests found.</p></div>';
    } else {
      requests.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'request-item';
        row.innerHTML = `
          <div>
            <strong>${item.full_name || item.username}</strong>
            <p>${item.username} · ${item.email || 'No email'} · ${item.phone || 'No phone'}</p>
            <p>Status: ${item.status} · Requested: ${new Date(item.requested_at).toLocaleString()}</p>
          </div>
          <div class="request-actions">
            <span class="pill">${item.status}</span>
            ${item.status === 'PENDING' ? `<button class="button button-primary" data-action="approve" data-id="${item.id}">Approve</button><button class="button button-secondary" data-action="reject" data-id="${item.id}">Reject</button>` : ''}
          </div>
        `;
        requestsList.appendChild(row);
      });
    }

    const bikes = bikesData.bikes || [];
    const sold = bikes.filter((item) => item.status === 'SOLD').length;
    bikesCount.textContent = bikes.length;
    soldCount.textContent = sold;

    const users = usersData.users || [];
    const roles = usersData.roles || [];
    usersSummary.textContent = `${users.length} total`;
    usersList.innerHTML = '';

    if (users.length === 0) {
      usersList.innerHTML = '<div class="user-item"><p>No users found.</p></div>';
    } else {
      users.forEach((user) => {
        const row = document.createElement('div');
        row.className = 'user-item';
        const assignedRoleNames = new Set((user.roles || []).map((role) => role.name));
        const roleButtons = roles.map((role) => {
          const isAssigned = assignedRoleNames.has(role.name);
          return `<button class="button ${isAssigned ? 'button-primary' : 'button-secondary'}" data-role-action="${isAssigned ? 'remove' : 'assign'}" data-user-id="${user.id}" data-role-id="${role.id}">${isAssigned ? 'Remove' : 'Assign'} ${role.name}</button>`;
        }).join('');

        row.innerHTML = `
          <div>
            <strong>${user.full_name || user.username}</strong>
            <p>${user.username} · ${user.email || 'No email'} · Status: ${user.status}</p>
            <p>Current roles: ${(user.roles || []).map((role) => role.name).join(', ') || 'None'}</p>
          </div>
          <div class="role-actions">${roleButtons}</div>
        `;
        usersList.appendChild(row);
      });
    }

    const contacts = contactsData.contacts || [];
    contactsTableBody.innerHTML = '';
    if (contacts.length === 0) {
      contactsTableBody.innerHTML = '<tr><td colspan="3">No contacts yet.</td></tr>';
    } else {
      contacts.forEach((contact) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${contact.name}</td>
          <td>${contact.phone}</td>
          <td>${contact.status || 'ACTIVE'}</td>
        `;
        contactsTableBody.appendChild(row);
      });
    }

  } catch (error) {
    authState.textContent = error.message || 'Unable to load admin data';
  }
}

requestsList.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const action = button.getAttribute('data-action');
  const requestId = Number(button.getAttribute('data-id'));
  try {
    await api.post('/admin/registration-requests', { action, requestId });
    await loadAdminData();
  } catch (error) {
    alert(error.message || 'Action failed');
  }
});

usersList.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-role-action]');
  if (!button) return;

  const userId = Number(button.getAttribute('data-user-id'));
  const roleId = Number(button.getAttribute('data-role-id'));
  const action = button.getAttribute('data-role-action');

  if (!userId || !roleId) return;

  try {
    await api.post('/admin/users', { userId, roleId, action });
    await loadAdminData();
  } catch (error) {
    alert(error.message || 'Role update failed');
  }
});

contactForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  contactFormMessage.textContent = '';

  const formData = new FormData(contactForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    await api.post('/admin/contacts', payload);
    contactFormMessage.textContent = 'Contact added successfully.';
    contactForm.reset();
    await loadAdminData();
  } catch (error) {
    contactFormMessage.textContent = error.message || 'Unable to save contact';
  }
});

addBikeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  bikeFormMessage.textContent = '';

  const formData = new FormData(addBikeForm);
  const payload = Object.fromEntries(formData.entries());
  payload.manufacturing_year = payload.manufacturing_year ? Number(payload.manufacturing_year) : null;
  payload.base_price = payload.base_price ? Number(payload.base_price) : null;
  payload.selling_price = payload.selling_price ? Number(payload.selling_price) : null;
  payload.engine_cc = payload.engine_cc ? Number(payload.engine_cc) : null;
  payload.kms_driven = payload.kms_driven ? Number(payload.kms_driven) : null;
  payload.owner_count = payload.owner_count ? Number(payload.owner_count) : null;

  try {
    await api.post('/bikes', payload);
    bikeFormMessage.textContent = 'Bike saved successfully.';
    addBikeForm.reset();
    await loadAdminData();
  } catch (error) {
    bikeFormMessage.textContent = error.message || 'Unable to save bike';
  }
});

loadAdminData();
