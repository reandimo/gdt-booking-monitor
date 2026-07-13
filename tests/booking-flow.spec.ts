import { test, expect, type Page } from '@playwright/test';
import { RUTA_REAL, fechaFutura } from './helpers';

/**
 * Flujo real de cotización en el widget (browser, SIN mocks): el POST /quote va
 * al server de verdad. Único parche: el hook e2e del tema (__gdtSetLegCoords)
 * setea coords sintéticas que el motor real no rutea, así que interceptamos el
 * POST y las reemplazamos por la ruta real PUJ→Bávaro antes de dejarlo salir.
 */

async function parchearCoords(page: Page): Promise<void> {
  await page.route('**/gdt/v1/quote', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}') as {
      legs?: Record<string, unknown>[];
    };
    for (const leg of body.legs ?? []) {
      Object.assign(leg, RUTA_REAL, { date: fechaFutura() });
    }
    await route.continue({ postData: JSON.stringify(body) });
  });
}

test('cotizar en /booking muestra vehículos reales y permite elegir', async ({ page }) => {
  await parchearCoords(page);
  await page.goto('/booking/?gdt_e2e=1');

  // El widget montó y salió del preloader de hidratación.
  await expect(page.locator('.gdt-bw-cta')).toBeVisible({ timeout: 20_000 });

  // El hook e2e se registra en un import() dinámico: esperar a que exista.
  await page.waitForFunction(() => '__gdtSetLegCoords' in window);
  await page.evaluate(() => (window as unknown as { __gdtSetLegCoords: () => void }).__gdtSetLegCoords());

  // Después del hook: pisa la fecha hardcodeada (2026-07-10, ya pasada) del hook.
  await page.fill('input[type="date"]', fechaFutura());
  await page.fill('input[type="time"]', '10:00');

  await page.click('.gdt-bw-cta');

  const primera = page.locator('.gdt-bw-vcard').first();
  await expect(primera, 'deben renderizar tarjetas de vehículo con el quote real').toBeVisible({ timeout: 25_000 });
  await expect(primera, 'la tarjeta debe mostrar precio').toContainText('$');

  await primera.click();
  await expect(primera).toHaveClass(/is-selected/);
});

test('/es/reservar carga y monta el widget', async ({ page }) => {
  await page.goto('/es/reservar/');
  await expect(page.locator('.gdt-bw-cta')).toBeVisible({ timeout: 20_000 });
});
