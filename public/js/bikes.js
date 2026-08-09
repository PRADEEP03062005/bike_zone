import { api } from './api.js';

const bikeGrid = document.getElementById('bike-grid');

async function loadBikes() {
  try {
    const data = await api.get('/bikes');
    bikeGrid.innerHTML = '';

    if (!Array.isArray(data.bikes) || data.bikes.length === 0) {
      bikeGrid.innerHTML = '<div class="bike-card placeholder">No bikes found.</div>';
      return;
    }

    data.bikes.forEach((bike) => {
      const card = document.createElement('article');
      card.className = 'bike-card';
      card.innerHTML = `
        <h2>${bike.bike_name}</h2>
        <p>${bike.brand} · ${bike.model || ''}</p>
        <p>${bike.manufacturing_year || 'Year N/A'} · ${bike.engine_cc || 'CC N/A'} CC</p>
        <p>${bike.kms_driven != null ? `${bike.kms_driven.toLocaleString()} KM` : 'KM N/A'}</p>
        <p class="bike-price">₹${Number(bike.selling_price).toLocaleString()}</p>
        <p class="badge">${bike.status}</p>
      `;
      bikeGrid.appendChild(card);
    });
  } catch (error) {
    bikeGrid.innerHTML = `<div class="bike-card placeholder">Unable to load bikes: ${error.message}</div>`;
  }
}

loadBikes();
