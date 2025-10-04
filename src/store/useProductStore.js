import { create } from 'zustand';

const API_URL = '/api';

const useProductStore = create((set, get) => ({
    products: [],
    loading: false,
    error: null,

    fetchProducts: async () => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/products`);
            if (!response.ok) throw new Error('Falló al obtener los productos del servidor.');
            const json = await response.json();
            set({ products: json.data, loading: false });
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
            get().fetchProducts();
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
            get().fetchProducts();
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
            get().fetchProducts();
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },

    restockProduct: async (id, amountToAdd) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/products/${id}/restock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amountToAdd }),
            });
            if (!response.ok) throw new Error('Falló al hacer el restock.');
            get().fetchProducts();
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    }
}));

export default useProductStore;

