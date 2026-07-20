/**
 * lib/geo.ts
 * -----------------------------------------------------------------------
 * Configuração de geolocalização da Fazenda São José.
 * Usado para validar se o funcionário está dentro da área permitida
 * na hora de bater o ponto.
 * -----------------------------------------------------------------------
 */

export const FAZENDA_COORDENADAS = {
  latitude: -15.7639781,
  longitude: -39.4699029,
};

export const RAIO_PERMITIDO_METROS = 100;

/**
 * Calcula a distância em metros entre duas coordenadas usando a fórmula
 * de Haversine (considera a curvatura da Terra).
 */
export function calcularDistanciaMetros(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // raio da Terra em metros
  const toRad = (graus: number) => (graus * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function estaDentroDaFazenda(lat: number, lon: number): boolean {
  const distancia = calcularDistanciaMetros(
    lat,
    lon,
    FAZENDA_COORDENADAS.latitude,
    FAZENDA_COORDENADAS.longitude
  );
  return distancia <= RAIO_PERMITIDO_METROS;
}
