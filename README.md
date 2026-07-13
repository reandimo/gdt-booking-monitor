# gdt-booking-monitor

Monitoreo sintético del **booking form de [global-dt.com](https://global-dt.com/booking/)** — el flujo que genera dinero. Corre con Playwright en GitHub Actions **cada 30 minutos** (gratis: repo público).

## Qué chequea

| Spec | Qué valida |
|------|-----------|
| `tests/api-health.spec.ts` | El nonce REST se sirve fresco (no cacheado por LiteSpeed — regresión real del 13-jul-2026) y el `POST /quote` con ruta real PUJ→Bávaro devuelve vehículos con precio y disponibilidad, en EN y ES. |
| `tests/booking-flow.spec.ts` | Flujo de usuario real en browser: `/booking` monta el widget, se llena el form, se cotiza contra el server real y aparecen tarjetas de vehículo con precio seleccionables. Más un smoke de `/es/reservar`. |

Sin mocks del server: el quote va a prod de verdad. Solo se interceptan las coords del hook e2e del tema (`?gdt_e2e=1` + `__gdtSetLegCoords`, coords sintéticas que el motor no rutea) para reemplazarlas por la ruta real — así no se depende de Google Places ni se gasta su cuota. La cotización **no crea órdenes** ni toca disponibilidad.

## Alertas

- **Fallo** (3 intentos seguidos): GitHub manda email por el workflow fallido + se abre un issue `incident` con link al run y al reporte (screenshots/trace como artifact). Corridas siguientes comentan el mismo issue.
- **Recuperación**: el issue se cierra solo.

## Correr local

```bash
pnpm install
pnpm exec playwright install chromium
pnpm test                      # contra https://global-dt.com
BASE_URL=http://otro.host pnpm test
```

## Notas operativas

- **Keepalive**: GitHub desactiva los crons tras 60 días sin actividad en el repo; el último paso del workflow re-habilita el propio workflow en cada corrida exitosa para resetear ese contador.
- **Si Cloudflare algún día bloquea a los runners** (bot protection): crear una regla WAF que haga *skip* cuando venga un header `X-GDT-Monitor: <token>`, guardar el token como secret del repo (los secrets son privados aunque el repo sea público) y mandarlo en `extraHTTPHeaders` del `playwright.config.ts`. Hoy no hace falta: prod no desafía clientes automatizados.
- La fecha de prueba siempre es **hoy + 7 días** para no chocar con validación de fechas pasadas ni sold-outs del día.
