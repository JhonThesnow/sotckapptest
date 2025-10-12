import { create } from 'zustand';
import { startOfMonth, endOfMonth, format } from 'date-fns';

const API_URL = '/api';

const useSalesReportsStore = create((set, get) => ({
    filters: {
        startDate: startOfMonth(new Date()),
        endDate: endOfMonth(new Date()),
        names: [],
        brands: [],
        lines: [], // Nuevo estado para líneas de producto
        compare: false,
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
                lines: [], // Resetear líneas
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
                    // Enviamos las fechas como strings YYYY-MM-DD para evitar problemas de timezone
                    startDate: format(filters.startDate, 'yyyy-MM-dd'),
                    endDate: format(filters.endDate, 'yyyy-MM-dd'),
                    names: filters.names ? filters.names.map(n => n.value) : [],
                    brands: filters.brands ? filters.brands.map(b => b.value) : [],
                    lines: filters.lines ? filters.lines.map(l => l.value) : [], // Enviar líneas
                    compare: filters.compare,
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