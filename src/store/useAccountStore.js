import { create } from 'zustand';

const API_URL = '/api';

const useAccountStore = create((set, get) => ({
    // --- ESTADO ---
    accountSummary: {
        totalBalance: 0,
        incomeByMethod: {}
    },
    movements: [],
    loading: false,
    error: null,

    // --- ACCIONES ---

    /**
     * Obtiene el resumen financiero completo de la cuenta.
     * Incluye el balance total y los ingresos desglosados por método de pago.
     */
    fetchAccountSummary: async () => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/account/summary`);
            if (!response.ok) throw new Error('No se pudo obtener el resumen de la cuenta.');
            const json = await response.json();
            set({ accountSummary: json.data, loading: false });
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },

    /**
     * Obtiene el historial de movimientos de fondos (depósitos y retiros).
     */
    fetchMovements: async () => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/account/movements`);
            if (!response.ok) throw new Error('No se pudo obtener el historial de movimientos.');
            const json = await response.json();
            set({ movements: json.data, loading: false });
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },

    /**
     * Registra un nuevo movimiento de fondos (depósito o retiro).
     * @param {object} movementData - Datos del movimiento { type, amount, reason }.
     */
    addMovement: async (movementData) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/account/movements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(movementData),
            });
            const json = await response.json();
            if (!response.ok) throw new Error(json.error || 'No se pudo registrar el movimiento.');

            // Si el movimiento es exitoso, actualizamos tanto el resumen como el historial
            get().fetchAccountSummary();
            get().fetchMovements();
            return { success: true };
        } catch (e) {
            set({ loading: false, error: e.message });
            return { success: false, error: e.message };
        }
    },
}));

export default useAccountStore;

