import { create } from 'zustand';

const API_URL = '/api';

const useProductStore = create((set, get) => ({
    products: [],
    totalPages: 1,
    currentPage: 1,
    stockEntriesHistory: { entries: [], totalPages: 1 },
    priceIncreaseHistory: { entries: [], totalPages: 1 },
    loading: false,
    error: null,

    fetchProducts: async (params = {}) => {
        set({ loading: true, error: null });
        const { page = 1, limit = 10, brand, name, sortBy, searchTerm } = params;

        const query = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });

        if (brand && brand !== 'Todas') query.append('brand', brand);
        if (name && name !== 'Todos') query.append('name', name);
        if (sortBy) query.append('sortBy', sortBy);
        if (searchTerm) query.append('searchTerm', searchTerm);

        try {
            const response = await fetch(`${API_URL}/products?${query.toString()}`);
            if (!response.ok) throw new Error('Falló al obtener los productos del servidor.');
            const json = await response.json();
            set({
                products: json.data,
                totalPages: json.totalPages,
                currentPage: json.currentPage,
                loading: false
            });
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },

    addBatchProducts: async (productsArray) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/products/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productsArray),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.details || 'Falló la carga por lote de productos.');
            }
            get().fetchProducts(); // Recarga la primera página
            return { success: true };
        } catch (e) {
            set({ loading: false, error: e.message });
            return { success: false, error: e.message };
        }
    },

    updateProduct: async (id, updatedData) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
            });
            if (!response.ok) throw new Error('Falló al actualizar el producto.');
            get().fetchProducts({ page: get().currentPage }); // Recarga la página actual
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },

    deleteProduct: async (id) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/products/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Falló al eliminar el producto.');
            get().fetchProducts({ page: get().currentPage }); // Recarga la página actual
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },

    batchRestock: async (productsToRestock) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/products/batch-restock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ products: productsToRestock }),
            });
            if (!response.ok) throw new Error('Falló el ingreso de stock por lote.');
            get().fetchProducts({ page: get().currentPage });
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },

    increasePrices: async (increaseData) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/products/increase-prices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(increaseData),
            });
            if (!response.ok) throw new Error('Falló al aumentar los precios.');
            get().fetchProducts({ page: get().currentPage });
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },

    fetchStockEntriesHistory: async (page, limit) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/stock-entry-history?page=${page}&limit=${limit}`);
            if (!response.ok) throw new Error('Falló al obtener el historial de ingresos.');
            const json = await response.json();
            set({ stockEntriesHistory: json, loading: false });
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },

    fetchPriceIncreaseHistory: async (page, limit) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/price-increase-history?page=${page}&limit=${limit}`);
            if (!response.ok) throw new Error('Falló al obtener el historial de aumentos de precios.');
            const json = await response.json();
            set({ priceIncreaseHistory: json, loading: false });
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },

    deleteStockEntry: async (id) => {
        set({ loading: true, error: null });
        try {
            await fetch(`${API_URL}/stock-entry-history/${id}`, { method: 'DELETE' });
            get().fetchStockEntriesHistory(1, 5); // Refresh
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },

    updateStockEntry: async (id, originalProducts, updatedProducts) => {
        set({ loading: true, error: null });
        try {
            await fetch(`${API_URL}/stock-entry-history/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ originalProducts, products: updatedProducts }),
            });
            get().fetchProducts();
            get().fetchStockEntriesHistory(1, 5);
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },

    deletePriceIncrease: async (id) => {
        set({ loading: true, error: null });
        try {
            await fetch(`${API_URL}/price-increase-history/${id}`, { method: 'DELETE' });
            get().fetchPriceIncreaseHistory(1, 5); // Refresh
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },
}));

export default useProductStore;