import { create } from 'zustand';
import { startOfMonth, endOfMonth } from 'date-fns';

const API_URL = '/api';

const useAccountStore = create((set, get) => ({
    // --- ESTADO ---
    accounts: [],
    categories: [],
    selectedAccountId: null,
    accountSummary: {
        totalIncome: 0,
        totalOutcome: 0,
        periodResult: 0,
    },
    movements: [],
    cashClosings: [],
    balanceHistory: [],
    cashClosingData: null,
    loading: false,
    error: null,
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),

    // --- ACCIONES ---
    fetchInitialData: async () => {
        set({ loading: true });
        await get().fetchAccounts();
        await get().fetchCategories();
        const accounts = get().accounts;
        if (accounts.length > 0) {
            get().setSelectedAccountId(accounts[0].id);
        } else {
            get().fetchDataForCurrentState();
        }
        set({ loading: false });
    },

    fetchAccounts: async () => {
        try {
            const response = await fetch(`${API_URL}/accounts`);
            const json = await response.json();
            set({ accounts: json.data });
        } catch (e) {
            console.error("Error fetching accounts:", e);
        }
    },

    fetchCategories: async () => {
        try {
            const response = await fetch(`${API_URL}/movement-categories`);
            const json = await response.json();
            set({ categories: json.data });
        } catch (e) {
            console.error("Error fetching categories:", e);
        }
    },

    setSelectedAccountId: (accountId) => {
        set({ selectedAccountId: accountId });
        get().fetchDataForCurrentState();
    },

    setDateRange: (startDate, endDate) => {
        set({ startDate, endDate });
        get().fetchDataForCurrentState();
    },

    fetchDataForCurrentState: async () => {
        set({ loading: true, error: null });
        await Promise.all([
            get().fetchAccountSummary(),
            get().fetchMovements(),
            get().fetchCashClosings()
        ]);
        set({ loading: false });
    },

    fetchAccountSummary: async () => {
        const { startDate, endDate, selectedAccountId } = get();
        if (!startDate || !endDate) return;
        try {
            const params = new URLSearchParams({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            });
            if (selectedAccountId) {
                params.append('accountId', selectedAccountId);
            }
            const response = await fetch(`${API_URL}/account/summary?${params.toString()}`);
            if (!response.ok) throw new Error('No se pudo obtener el resumen de la cuenta.');
            const json = await response.json();
            set({ accountSummary: json.data });
        } catch (e) {
            set({ error: e.message, accountSummary: { totalIncome: 0, totalOutcome: 0, periodResult: 0 } });
        }
    },

    fetchMovements: async () => {
        const { startDate, endDate, selectedAccountId } = get();
        if (!startDate || !endDate) return;
        try {
            const params = new URLSearchParams({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            });
            if (selectedAccountId) {
                params.append('accountId', selectedAccountId);
            }
            const response = await fetch(`${API_URL}/account/movements?${params.toString()}`);
            if (!response.ok) throw new Error('No se pudo obtener el historial de movimientos.');
            const json = await response.json();
            set({ movements: json.data });
        } catch (e) {
            set({ error: e.message, movements: [] });
        }
    },

    fetchCashClosings: async () => {
        const { startDate, endDate, selectedAccountId } = get();
        if (!startDate || !endDate) return;
        try {
            const params = new URLSearchParams({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            });
            if (selectedAccountId) {
                params.append('accountId', selectedAccountId);
            }
            const response = await fetch(`${API_URL}/cash-closings?${params.toString()}`);
            if (!response.ok) throw new Error('No se pudo obtener el historial de cierres.');
            const json = await response.json();
            set({ cashClosings: json.data });
        } catch (e) {
            set({ error: e.message, cashClosings: [] });
        }
    },

    fetchCashClosingData: async () => {
        const { selectedAccountId } = get();
        if (!selectedAccountId) return;
        set({ loading: true, error: null, cashClosingData: null });
        try {
            const response = await fetch(`${API_URL}/accounts/${selectedAccountId}/cash-closing-data`);
            if (!response.ok) throw new Error('No se pudo obtener la información para el cierre de caja.');
            const json = await response.json();
            set({ cashClosingData: json.data, loading: false });
        } catch (e) {
            set({ error: e.message, loading: false });
        }
    },

    saveCashClosing: async (closingData) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/cash-closings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(closingData)
            });
            if (!response.ok) throw new Error('No se pudo guardar el cierre de caja.');
            get().fetchDataForCurrentState();
            return { success: true };
        } catch (e) {
            set({ error: e.message, loading: false });
            return { success: false, error: e.message };
        }
    },

    addMovement: async (movementData) => {
        set({ loading: true, error: null });
        if (!movementData.accountId) {
            const error = "Se debe especificar una cuenta para el movimiento.";
            set({ error });
            return { success: false, error };
        }
        try {
            const response = await fetch(`${API_URL}/account/movements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(movementData),
            });
            const json = await response.json();
            if (!response.ok) throw new Error(json.error || 'No se pudo registrar el movimiento.');
            get().fetchDataForCurrentState();
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
            get().fetchDataForCurrentState();
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
            get().fetchDataForCurrentState();
            return { success: true };
        } catch (e) {
            set({ error: e.message, loading: false });
            return { success: false, error: e.message };
        }
    },
}));

export default useAccountStore;