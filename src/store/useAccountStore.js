import { create } from 'zustand';
import { startOfMonth, endOfMonth } from 'date-fns';

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
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),

    // --- ACCIONES ---
    setDateRange: (startDate, endDate) => {
        set({ startDate, endDate });
        get().fetchAccountSummary();
        get().fetchMovements();
    },

    fetchAccountSummary: async () => {
        set({ loading: true, error: null });
        const { startDate, endDate } = get();
        try {
            const response = await fetch(`${API_URL}/account/summary?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
            if (!response.ok) throw new Error('No se pudo obtener el resumen de la cuenta.');
            const json = await response.json();
            set({ accountSummary: json.data, loading: false });
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },

    fetchMovements: async () => {
        set({ loading: true, error: null });
        const { startDate, endDate } = get();
        try {
            const response = await fetch(`${API_URL}/account/movements?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
            if (!response.ok) throw new Error('No se pudo obtener el historial de movimientos.');
            const json = await response.json();
            set({ movements: json.data, loading: false });
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },

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
            get().fetchAccountSummary();
            get().fetchMovements();
            return { success: true };
        } catch (e) {
            set({ loading: false, error: e.message });
            return { success: false, error: e.message };
        }
    },

    deleteMovement: async (movementId) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/account/movements/${movementId}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Falló al eliminar el movimiento.');
            get().fetchMovements();
            get().fetchAccountSummary();
            return { success: true };
        } catch (e) {
            set({ error: e.message, loading: false });
            return { success: false, error: e.message };
        }
    },

    updateMovement: async (movementId, movementData) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/account/movements/${movementId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(movementData),
            });
            if (!response.ok) throw new Error('Falló al actualizar el movimiento.');
            get().fetchMovements();
            get().fetchAccountSummary();
            return { success: true };
        } catch (e) {
            set({ error: e.message, loading: false });
            return { success: false, error: e.message };
        }
    },
}));

export default useAccountStore;

