import { test, expect } from '@playwright/test';
import { payloadQuote } from './helpers';

/**
 * Salud de la API REST del booking, sin browser: es el camino que cobra.
 * Cubre la regresión del 13-jul-2026 (LiteSpeed cacheó el nonce 7 días →
 * nonce expirado → todo POST moría con rest_cookie_invalid_nonce 403).
 */

interface Vehicle { id: number; name: string; price: number; available: boolean }
interface QuoteBody { ok: boolean; error?: string; legs?: { distance_km: number; vehicles: Vehicle[] }[] }

test('el nonce se sirve fresco (no cacheado por LiteSpeed)', async ({ request }) => {
  // Sin cache-buster a propósito: valida la config del server, no el workaround
  // del cliente. Si LSCWP vuelve a cachear el endpoint, esto avisa ANTES de que
  // el nonce cacheado expire (~24 h de mecha).
  const res = await request.get('/wp-json/gdt/v1/nonce');
  expect(res.status()).toBe(200);
  const headers = res.headers();
  expect(headers['x-litespeed-cache'] ?? 'miss', 'el nonce NO debe salir del cache de LiteSpeed').not.toBe('hit');
  const { nonce } = (await res.json()) as { nonce?: string };
  expect(nonce, 'el endpoint debe devolver un nonce').toBeTruthy();
});

for (const lang of ['en', 'es'] as const) {
  test(`quote real devuelve vehículos con precio (${lang})`, async ({ request }) => {
    const nonceRes = await request.get(`/wp-json/gdt/v1/nonce?fresh=${Date.now()}`);
    expect(nonceRes.status()).toBe(200);
    const { nonce } = (await nonceRes.json()) as { nonce: string };

    const res = await request.post('/wp-json/gdt/v1/quote', {
      headers: { 'X-WP-Nonce': nonce },
      data: payloadQuote(lang),
    });
    expect(res.status(), 'el POST /quote no debe dar 403 (nonce) ni 5xx').toBe(200);

    const body = (await res.json()) as QuoteBody;
    expect(body.ok, `quote respondió error: ${body.error ?? 'desconocido'}`).toBe(true);

    const vehicles = body.legs?.[0]?.vehicles ?? [];
    expect(vehicles.length, 'la ruta PUJ→Bávaro debe cotizar vehículos').toBeGreaterThan(0);
    for (const v of vehicles) {
      expect(v.price, `vehículo ${v.name} sin precio`).toBeGreaterThan(0);
    }
    expect(
      vehicles.some((v) => v.available),
      'al menos un vehículo debe estar disponible a +7 días',
    ).toBe(true);
  });
}
