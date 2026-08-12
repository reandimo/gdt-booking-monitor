import { test, expect, type Page } from '@playwright/test';
import { RUTA_REAL, fechaFutura } from './helpers';

/**
 * Path del hero (home) → /booking: el que usan los clientes reales y que el
 * monitor no cubría (incidente 12-ago: la validación silenciosa del hero y un
 * widget que no montaba pasaron semanas invisibles porque solo entrábamos
 * directo a /booking con el hook e2e).
 *
 * Sin Google Places: los valores se setean por script SIN eventos de input
 * (el autocomplete no dispara → cero cuota del API). Los hidden lat/lng se
 * cargan con la ruta real PUJ→Bávaro, como si el usuario hubiera elegido de
 * la lista, así el quote del handoff rutea de verdad sin parches.
 */

async function llenarHero(page: Page, conCoords: boolean): Promise<void> {
  await page.locator('[data-gdt-booking]').waitFor();
  await page.evaluate(
    ({ ruta, fecha, coords }) => {
      const set = (name: string, value: string): void => {
        const el = document.querySelector<HTMLInputElement>(`[data-gdt-booking] [name="${name}"]`);
        if (el) el.value = value;
      };
      set('fromLocation', 'Punta Cana International Airport');
      set('toLocation', 'Hotel Bávaro');
      set('tripDate', fecha);
      set('tripTime', '10:00');
      if (coords) {
        set('fromPlaceId', 'e2e-hero');
        set('fromLat', String(ruta.originLat));
        set('fromLng', String(ruta.originLng));
        set('toPlaceId', 'e2e-hero');
        set('toLat', String(ruta.destLat));
        set('toLng', String(ruta.destLng));
      }
    },
    { ruta: RUTA_REAL, fecha: fechaFutura(), coords: conCoords },
  );
}

test('submit del hero navega a /booking, hidrata y auto-cotiza', async ({ page }) => {
  await page.goto('/');
  await llenarHero(page, true);
  await page.locator('.gdt-booking__submit').click();

  await page.waitForURL('**/booking/**', { timeout: 15_000 });

  // El widget hidrató el entry del hero, auto-cotizó contra el motor real y
  // renderizó vehículos con precio (paso 2). Si algo de esa cadena se rompe
  // (JS del widget, nonce, quote), esto es lo que un cliente ve roto.
  const primera = page.locator('.gdt-bw-vcard').first();
  await expect(primera, 'el handoff del hero debe terminar en vehículos cotizados').toBeVisible({ timeout: 25_000 });
  await expect(primera, 'la tarjeta debe mostrar precio').toContainText('$');
});

test('la validación del hero muestra un error visible con rescate de WhatsApp', async ({ page }) => {
  await page.goto('/');
  // Lugar tipeado sin elegir de la lista (sin lat/lng): el caso del 12-ago.
  await llenarHero(page, false);
  await page.locator('.gdt-booking__submit').click();

  const error = page.locator('[data-gdt-booking-error]');
  await expect(error, 'el bloqueo de validación debe ser visible, nunca silencioso').toBeVisible();
  await expect(
    error.locator('.gdt-booking__error-cta'),
    'con CTA de WhatsApp para que el cliente no quede en un dead-end',
  ).toBeVisible();
  await expect(error.locator('.gdt-booking__error-cta')).toHaveAttribute('href', /wa\.me\/\d+/);
});
