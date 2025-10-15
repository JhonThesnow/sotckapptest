import { create } from 'zustand';
import useProductStore from './useProductStore';
import useAccountStore from './useAccountStore';

const API_URL = 'http://localhost:3001/api';

// Función auxiliar que mapea el método de pago al ID de cuenta fijo
const getAccountIdByPaymentMethod = (method) => {
    switch (method) {
        case 'Efectivo': return 1; // ID fijo de Caja Principal
        case 'Débito': return 2; // ID fijo de Débito
        case 'Crédito': return 3; // ID fijo de Crédito
        case 'Cuenta DNI': return 4; // ID fijo de Cuenta DNI
        default: return 1; // Fallback a Caja Principal
    }
};

const useSalesStore = create((set, get) => ({
    sales: [],
    pendingSale: null,
    loading: false,
    error: null,

    // --- Ventas Pendientes (Current Sale) ---

    // Inicia una nueva venta o carga la existente
    startNewSale: (initialItems = []) => {
        const newSale = {
            id: null,
            items: initialItems,
            subtotal: 0,
            discount: 0,
            totalAmount: 0,
            status: 'pending'
        };
        set({ pendingSale: newSale });
        get().calculateSaleTotals();
    },

    addItemToSale: (product, quantity) => {
        set(state => {
            const currentSale = state.pendingSale || get().startNewSale().pendingSale;
            const existingItemIndex = currentSale.items.findIndex(item => item.productId === product.id);
            const salePrice = JSON.parse(product.salePrices || '[]')[0]?.price || 0;

            if (existingItemIndex !== -1) {
                const updatedItems = currentSale.items.map((item, index) =>
                    index === existingItemIndex
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
                currentSale.items = updatedItems;
            } else {
                currentSale.items.push({
                    productId: product.id,
                    fullName: `${product.name} - ${product.subtype || product.brand}`,
                    quantity: quantity,
                    unitPrice: salePrice,
                    purchasePrice: product.purchasePrice || 0
                });
            }

            get().calculateSaleTotals(currentSale);
            return { pendingSale: { ...currentSale } };
        });
    },

    updateItemQuantity: (productId, newQuantity) => {
        set(state => {
            if (!state.pendingSale) return state;

            const updatedItems = state.pendingSale.items
                .map(item =>
                    item.productId === productId
                        ? { ...item, quantity: newQuantity }
                        : item
                )
                .filter(item => item.quantity > 0);

            state.pendingSale.items = updatedItems;
            get().calculateSaleTotals(state.pendingSale);
            return { pendingSale: { ...state.pendingSale } };
        });
    },

    addQuickSaleItem: (name, price) => {
        set(state => {
            const currentSale = state.pendingSale || get().startNewSale().pendingSale;
            const newItem = {
                productId: `qs-${Date.now()}`, // ID temporal para venta rápida
                fullName: name,
                quantity: 1,
                unitPrice: price,
                purchasePrice: 0 // No tiene costo de compra asociado
            };

            currentSale.items.push(newItem);
            get().calculateSaleTotals(currentSale);
            return { pendingSale: { ...currentSale } };
        });
    },

    calculateSaleTotals: (sale = get().pendingSale) => {
        if (!sale) return;

        const subtotal = sale.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        const discountAmount = subtotal * (sale.discount / 100);
        const totalAmount = subtotal - discountAmount;

        set(state => ({
            pendingSale: {
                ...sale,
                subtotal: subtotal,
                discount: sale.discount, // Mantener el porcentaje de descuento
                totalAmount: totalAmount,
            }
        }));
    },

    applyDiscount: (discountPercentage) => {
        set(state => ({
            pendingSale: {
                ...state.pendingSale,
                discount: discountPercentage || 0,
            }
        }));
        get().calculateSaleTotals();
    },

    // Guarda la venta como pendiente en la base de datos
    savePendingSale: async () => {
        const sale = get().pendingSale;
        if (!sale || sale.items.length === 0) return { success: false, error: 'La venta está vacía.' };

        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/sales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: sale.items,
                    subtotal: sale.subtotal,
                    discount: sale.discount,
                    totalAmount: sale.totalAmount,
                    paymentMethod: sale.paymentMethod || 'Efectivo' // Usar efectivo por defecto si no se especifica
                }),
            });
            if (!response.ok) {
                const errorText = await response.json();
                throw new Error(errorText.error || 'Falló al guardar la venta pendiente');
            }
            const data = await response.json();
            set({ pendingSale: null, loading: false });
            get().fetchAllSales();
            return { success: true, saleId: data.saleId };
        } catch (e) {
            set({ loading: false, error: e.message });
            return { success: false, error: e.message };
        }
    },

    // --- Ventas Historial ---

    fetchAllSales: async () => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/sales`);
            if (!response.ok) throw new Error('Falló la carga del historial de ventas');
            let data = await response.json();

            // Parsear items y formatear fechas
            const sales = data.data.map(sale => ({
                ...sale,
                items: JSON.parse(sale.items),
            }));

            set({ sales, loading: false });
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },

    completeSale: async (saleId, saleData) => {
        set({ loading: true, error: null });
        try {
            // Se usa el mapeo manual para asignar el accountId (CORRECCIÓN CLAVE)
            const accountId = getAccountIdByPaymentMethod(saleData.paymentMethod);

            if (!accountId) {
                throw new Error("No se encontró una cuenta apropiada para registrar la venta.");
            }

            const response = await fetch(`${API_URL}/sales/${saleId}/complete`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...saleData, accountId }), // Se envía el accountId al backend
            });
            if (!response.ok) {
                const errorText = await response.json();
                throw new Error(errorText.error || 'Falló al completar la venta');
            }
            // Recargar datos tras completar la venta
            get().fetchAllSales();
            useProductStore.getState().fetchProducts();
            // Llama a la función que recarga todo el estado de la cuenta (resumen y movimientos)
            useAccountStore.getState().fetchDataForCurrentState();
            return { success: true };
        } catch (e) {
            set({ loading: false, error: e.message });
            return { success: false, error: e.message };
        }
    },

    cancelSale: async (saleId, reason) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/sales/history/${saleId}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
            });
            if (!response.ok) {
                const errorText = await response.json();
                throw new Error(errorText.error || 'Falló al cancelar la venta');
            }
            get().fetchAllSales();
            useProductStore.getState().fetchProducts();
            useAccountStore.getState().fetchDataForCurrentState();
            return { success: true };
        } catch (e) {
            set({ loading: false, error: e.message });
            return { success: false, error: e.message };
        }
    },

    deleteSale: async (saleId, status) => {
        set({ loading: true, error: null });
        try {
            const endpoint = status === 'pending' ? `/sales/pending/${saleId}` : `/sales/history/${saleId}`;
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorText = await response.json();
                throw new Error(errorText.error || 'Falló al eliminar la venta');
            }

            if (status === 'pending') {
                set({ pendingSale: null });
            }
            get().fetchAllSales();
            return { success: true };
        } catch (e) {
            set({ loading: false, error: e.message });
            return { success: false, error: e.message };
        }
    },

    editSale: async (saleId, updatedData) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/sales/history/${saleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
            });
            if (!response.ok) {
                const errorText = await response.json();
                throw new Error(errorText.error || 'Falló al editar la venta');
            }
            get().fetchAllSales();
            useAccountStore.getState().fetchDataForCurrentState();
            return { success: true };
        } catch (e) {
            set({ loading: false, error: e.message });
            return { success: false, error: e.message };
        }
    },

    applyTaxToSale: async (saleId, taxPercentage) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/sales/history/${saleId}/tax`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taxPercentage }),
            });
            if (!response.ok) {
                const errorText = await response.json();
                throw new Error(errorText.error || 'Falló al aplicar el impuesto');
            }
            get().fetchAllSales();
            return { success: true };
        } catch (e) {
            set({ loading: false, error: e.message });
            return { success: false, error: e.message };
        }
    }
}));

export default useSalesStore;