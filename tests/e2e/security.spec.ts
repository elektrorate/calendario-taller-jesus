import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const supabaseUrl = process.env.TEST_SUPABASE_URL || 'https://ilkrcakrduibgsfqfzti.supabase.co';
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const staffEmail = 'test@barro.test';
const staffPassword = 'Test123!';
const adminEmail = 'erick@kgbycia.com';
const adminPassword = 'admin123';

const publicHeaders = () => ({
  apikey: anonKey || '',
  'Content-Type': 'application/json'
});

async function login(page: Page, email: string, password: string, expectedPath: RegExp) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(expectedPath);
}

async function getAccessToken(api: APIRequestContext, email: string, password: string) {
  const response = await api.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: publicHeaders(),
    data: { email, password }
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.access_token).toBeTruthy();
  return body.access_token as string;
}

async function callFunction(api: APIRequestContext, name: string, token?: string, data: Record<string, unknown> = {}) {
  return api.post(`${supabaseUrl}/functions/v1/${name}`, {
    headers: {
      ...publicHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    data
  });
}

test.beforeAll(() => {
  expect(anonKey, 'TEST_SUPABASE_ANON_KEY is required for security tests').toBeTruthy();
});

test.describe('Seguridad de autenticación', () => {
  test('redirige rutas protegidas y conserva el destino permitido', async ({ page }) => {
    await page.goto('/students');
    await expect(page).toHaveURL(/\/login\/?$/);
    await page.getByLabel('Correo electrónico').fill(staffEmail);
    await page.getByLabel('Contraseña').fill(staffPassword);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/students\/?$/);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/dashboard\/?$/);
  });

  test('mantiene la sesión tras recargar y la invalida al cerrar sesión', async ({ page }) => {
    await login(page, staffEmail, staffPassword, /\/dashboard\/?$/);
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard\/?$/);
    await expect(page.getByText('Estado del taller hoy')).toBeVisible();

    await page.getByRole('button', { name: 'Salir' }).click();
    await expect(page).toHaveURL(/\/login\/?$/);
    await page.goto('/students');
    await expect(page).toHaveURL(/\/login\/?$/);
  });

  test('no revela si un correo existe durante recuperación de acceso', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click();
    await expect(page.getByRole('heading', { name: /Recupera tu acceso/ })).toBeVisible();
    await page.getByLabel('Correo electrónico').fill(`PW-QA-${Date.now()}@barro.test`);
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(page.getByRole('status')).toContainText('Si el correo pertenece a una cuenta autorizada');
  });

  test('super admin conserva su área y no entra a rutas de tallerista', async ({ page }) => {
    await login(page, adminEmail, adminPassword, /\/admin\/?$/);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/admin\/?$/);
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByText('Panel de control')).toBeVisible();
  });
});

test.describe('RLS y Edge Functions', () => {
  test('las tablas críticas no exponen filas anónimas', async ({ request }) => {
    for (const table of ['profiles', 'sedes', 'sede_members', 'students', 'sessions', 'gift_cards', 'inventory_items', 'pieces']) {
      const response = await request.get(`${supabaseUrl}/rest/v1/${table}?select=*&limit=1`, {
        headers: publicHeaders()
      });
      expect(response.ok(), `${table} should respond successfully`).toBeTruthy();
      await expect(response.json()).resolves.toEqual([]);
    }
  });

  test('las funciones administrativas rechazan solicitudes sin sesión', async ({ request }) => {
    for (const name of ['admin-users', 'admin-create-user']) {
      const response = await callFunction(request, name);
      expect(response.status(), `${name} should reject anonymous calls`).toBe(401);
    }
  });

  test('las funciones administrativas diferencian staff y super admin', async ({ request }) => {
    const staffToken = await getAccessToken(request, staffEmail, staffPassword);
    const adminToken = await getAccessToken(request, adminEmail, adminPassword);

    for (const [name, data] of [
      ['admin-users', { action: 'list_users' }],
      ['admin-create-user', {}]
    ] as const) {
      const staffResponse = await callFunction(request, name, staffToken, data);
      expect(staffResponse.status(), `${name} should reject staff`).toBe(403);
    }

    const usersResponse = await callFunction(request, 'admin-users', adminToken, { action: 'list_users' });
    expect(usersResponse.status()).toBe(200);

    const createUserResponse = await callFunction(request, 'admin-create-user', adminToken, {});
    expect(createUserResponse.status()).toBe(400);
  });
});
