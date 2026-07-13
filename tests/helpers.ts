/** Ruta de prueba real y ruteable: aeropuerto de Punta Cana → zona hotelera Bávaro. */
export const RUTA_REAL = {
  originLat: 18.5601,
  originLng: -68.3725,
  destLat: 18.6821,
  destLng: -68.4459,
} as const;

/** Fecha a +7 días (YYYY-MM-DD): siempre futura, lejos de sold-outs del día. */
export function fechaFutura(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export function payloadQuote(lang: string): object {
  return {
    round_trip: false,
    lang,
    legs: [{
      ...RUTA_REAL,
      originPlaceId: '',
      destPlaceId: '',
      date: fechaFutura(),
      time: '10:00',
    }],
  };
}
