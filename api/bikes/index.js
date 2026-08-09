import { query } from '../db.js';
import { sendJSON, parseJSON, getRequestUrl } from '../utils.js';
import { getAuthenticatedUser } from '../auth/session.js';

export default async function handler(request, response) {
  if (request.method === 'GET') {
    const url = getRequestUrl(request);
    const search = url.searchParams.get('search') || '';
    const brand = url.searchParams.get('brand') || '';
    const status = url.searchParams.get('status') || '';
    const yearFrom = url.searchParams.get('yearFrom');
    const yearTo = url.searchParams.get('yearTo');
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
    const limit = 20;
    const offset = (page - 1) * limit;

    const conditions = ['TRUE'];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(bike_name ILIKE $${params.length} OR brand ILIKE $${params.length} OR model ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }

    if (brand) {
      params.push(brand);
      conditions.push(`brand = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (yearFrom) {
      params.push(Number(yearFrom));
      conditions.push(`manufacturing_year >= $${params.length}`);
    }

    if (yearTo) {
      params.push(Number(yearTo));
      conditions.push(`manufacturing_year <= $${params.length}`);
    }

    const where = conditions.join(' AND ');
    const countResult = await query(`SELECT count(*) AS total FROM bikes WHERE ${where}`, params);
    const total = Number(countResult.rows[0].total || 0);

    params.push(limit, offset);
    const bikesResult = await query(
      `SELECT id, bike_name, brand, model, manufacturing_year, selling_price, engine_cc, kms_driven, status FROM bikes WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return sendJSON(response, 200, {
      bikes: bikesResult.rows,
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  }

  if (request.method === 'POST') {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser || !currentUser.roles?.some((role) => role.name === 'ADMIN')) {
      return sendJSON(response, 403, { error: 'Admin access required' });
    }

    const body = await parseJSON(request);
    const values = [
      body.bike_name || '',
      body.brand || '',
      body.model || null,
      body.manufacturing_year ? Number(body.manufacturing_year) : null,
      body.base_price ? Number(body.base_price) : null,
      body.selling_price ? Number(body.selling_price) : null,
      body.registration_number || null,
      body.engine_cc ? Number(body.engine_cc) : null,
      body.fuel_type || null,
      body.kms_driven ? Number(body.kms_driven) : null,
      body.owner_count ? Number(body.owner_count) : null,
      body.color || null,
      body.description || null,
      body.status || 'DRAFT',
      currentUser.id,
      currentUser.id
    ];

    if (!values[0] || !values[1] || !values[5] || !values[7]) {
      return sendJSON(response, 400, { error: 'bike_name, brand, selling_price and engine_cc are required' });
    }

    const insertResult = await query(
      `INSERT INTO bikes (
        bike_name, brand, model, manufacturing_year, base_price, selling_price,
        registration_number, engine_cc, fuel_type, kms_driven, owner_count,
        color, description, status, created_by, updated_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, now(), now()) RETURNING id, bike_name, brand, model, manufacturing_year, selling_price, engine_cc, kms_driven, status`,
      values
    );

    return sendJSON(response, 201, { bike: insertResult.rows[0] });
  }

  return sendJSON(response, 405, { error: 'Method not allowed' });
}
