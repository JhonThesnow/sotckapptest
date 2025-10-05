import { create } from 'zustand';

const API_URL = '/api';

const useDashboardStore = create((set) => ({
    summary: {
        totalRevenueToday: 0,
        salesCountToday: 0,
        lowStockProducts: [],
        recentMovements: [],
    },
    loading: false,
    error: null,

    fetchDashboardSummary: async () => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/dashboard-summary`);
            if (!response.ok) {
                throw new Error('No se pudo obtener el resumen del dashboard.');
            }
            const json = await response.json();
            set({ summary: json.data, loading: false });
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },
}));

export default useDashboardStore;
