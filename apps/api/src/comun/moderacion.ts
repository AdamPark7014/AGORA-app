/**
 * Moderacion previa con IA. Con MODERACION_OPCIONAL=true se publica sin filtro
 * automatico: la cola humana (reportes) es quien decide.
 */
export const moderacionPreviaActiva = (): boolean =>
  process.env.MODERACION_OPCIONAL !== 'true' && Boolean(process.env.ANTHROPIC_API_KEY);
