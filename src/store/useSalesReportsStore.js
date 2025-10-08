import { create } from 'zustand';
import { startOfMonth, endOfMonth } from 'date-fns';

const API_URL = '/api';

const useSalesReportsStore = create((set, get) => ({
    filters: {
        startDate: startOfMonth(new Date()),
        endDate: endOfMonth(new Date()),
        names: [],
        brands: [],
        compare: false, // Nuevo estado para la comparación
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
                names: [],
                brands: [],
                compare: false,
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
                    names: filters.names ? filters.names.map(n => n.value) : [],
                    brands: filters.brands ? filters.brands.map(b => b.value) : [],
                    compare: filters.compare, // Enviar el flag de comparación
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