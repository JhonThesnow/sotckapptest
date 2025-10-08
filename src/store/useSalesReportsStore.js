import { create } from 'zustand';
import { startOfMonth, endOfMonth } from 'date-fns';

const API_URL = '/api';

const useSalesReportsStore = create((set, get) => ({
    filters: {
        startDate: startOfMonth(new Date()),
        endDate: endOfMonth(new Date()),
        types: [],
        brands: [],
    },
    reportData: null,
    loading: false,
    error: null,

    setFilters: (newFilters) => {
        set(state => ({
            filters: { ...state.filters, ...newFilters }
        }));
    },

    resetFilters: () => {
        set({
            filters: {
                startDate: startOfMonth(new Date()),
                endDate: endOfMonth(new Date()),
                types: [],
                brands: [],
            }
        });
        get().fetchReportData();
    },

    fetchReportData: async () => {
        set({ loading: true, error: null });
        const { filters } = get();
        try {
            const response = await fetch(`${API_URL}/sales-report-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate: filters.startDate.toISOString(),
                    endDate: filters.endDate.toISOString(),
                    types: filters.types.map(t => t.value),
                    brands: filters.brands.map(b => b.value),
                }),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to fetch report data');
            }
            const data = await response.json();
            set({ reportData: data, loading: false });
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },
}));

export default useSalesReportsStore;
