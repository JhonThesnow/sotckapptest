/**
 * Formatea un número al estilo argentino (ej: 1000 -> "1.000") sin decimales.
 * @param {number} number - El número a formatear.
 * @returns {string} El número formateado como texto.
 */
export const formatNumber = (number) => {
    if (typeof number !== 'number' || isNaN(number)) return '0';
    return new Intl.NumberFormat('es-AR', {
        maximumFractionDigits: 0
    }).format(number);
};

/**
 * Redondea un monto para pagos en efectivo a la centena más cercana.
 * (ej: 2330 -> 2300, 2350 -> 2400, 2380 -> 2400).
 * @param {number} amount - El monto a redondear.
 * @returns {number} El monto redondeado.
 */
export const roundCash = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) return 0;
    return Math.round(amount / 100) * 100;
};

/**
 * Formatea una fecha a `dd/MM/yyyy`.
 * @param {string | Date} date - La fecha a formatear.
 * @returns {string} La fecha formateada.
 */
export const formatDateOnly = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-AR');
};