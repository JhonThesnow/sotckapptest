import { create } from 'zustand';
import useProductStore from './useProductStore';
import useAccountStore from './useAccountStore';
import { roundCash } from '../utils/formatting';

const API_URL = '/api';

const useSalesStore = create((set, get) => ({
    // --- STATE ---
    cart: [],
    pendingSales: [],
    completedSales: [],
    expenses: [],
    paymentMethods: [],
    monthlySummary: null,
    currentPaymentMethod: null,
    loading: false,
    error: null,

    // --- CART ACTIONS ---
    addItemToCart: (product) => {
        set(state => {
            // Para productos genéricos de venta rápida, permite agregar múltiples veces como líneas separadas
            if (product.id.toString().startsWith('qs-')) {
                return { cart: [...state.cart, { ...product, id: `qs-${Date.now()}` }] };
            }

            const itemInCart = state.cart.find((item) => item.id === product.id);
            if (itemInCart) {
                if (itemInCart.quantity < product.quantity) {
                    return {
                        cart: state.cart.map(item =>
                            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                        )
                    };
                }
                alert('No hay más stock disponible para este producto.');
                return {};
            }
            if (product.quantity > 0) {
                return { cart: [...state.cart, { ...product, quantity: 1 }] };
            }
            alert('Producto sin stock.');
            return {};
        });
    },
    removeItemFromCart: (productId) => {
        set(state => ({ cart: state.cart.filter((item) => item.id !== productId) }));
    },
    updateItemQuantity: (productId, quantity) => {
        const productInDB = useProductStore.getState().products.find(p => p.id === productId);

        let newQuantity = parseInt(quantity, 10);
        if (isNaN(newQuantity) || newQuantity < 1) newQuantity = 1;

        // Si es un producto del inventario, chequea el stock.
        if (productInDB) {
            if (newQuantity > productInDB.quantity) {
                alert(`Solo hay ${productInDB.quantity} unidades en stock.`);
                newQuantity = productInDB.quantity;
            }
        }

        set(state => ({
            cart: state.cart.map(item =>
                item.id === productId ? { ...item, quantity: newQuantity } : item
            )
        }));
    },
    clearCart: () => set({ cart: [], error: null, currentPaymentMethod: null }),
    setCurrentPaymentMethod: (method) => set({ currentPaymentMethod: method }),

    // --- SALES ACTIONS ---
    createPendingSale: async (saleDetails) => {
        const { cart } = get();
        if (cart.length === 0) return { success: false, error: "El carrito está vacío." };
        set({ loading: true, error: null });

        let finalTotal = saleDetails.totalAmount;
        if (saleDetails.paymentMethod === 'Efectivo') {
            finalTotal = roundCash(saleDetails.totalAmount);
        }

        const saleData = {
            subtotal: saleDetails.subtotal,
            discount: saleDetails.discount,
            totalAmount: finalTotal,
            paymentMethod: saleDetails.paymentMethod || null,
            items: cart.map(item => ({
                productId: item.id.toString().startsWith('qs-') ? null : item.id,
                fullName: `${item.name}${item.subtype ? ` - ${item.subtype}` : ''}`,
                quantity: item.quantity,
                unitPrice: item.salePrices[0]?.price || 0,
                purchasePrice: item.purchasePrice,
            })),
        };

        try {
            const response = await fetch(`${API_URL}/sales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saleData),
            });

            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.error || errorData.details || 'Error desconocido del servidor.');
                } catch (jsonError) {
                    const errorText = await response.text();
                    throw new Error(errorText || 'Falló al crear la venta pendiente');
                }
            }
            set({ loading: false, cart: [], currentPaymentMethod: null });
            get().fetchAllSales();
            return { success: true };
        } catch (e) {
            set({ loading: false, error: e.message });
            return { success: false, error: e.message };
        }
    },

    fetchAllSales: async () => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/sales`);
            if (!response.ok) throw new Error('No se pudieron obtener las ventas');
            const json = await response.json();

            const allSales = json.data.map(s => ({
                ...s,
                items: JSON.parse(s.items)
            }));

            set({
                pendingSales: allSales.filter(s => s.status === 'pending'),
                completedSales: allSales.filter(s => s.status === 'completed' || s.status === 'canceled'),
                loading: false
            });
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },

    completeSale: async (saleId, saleData) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/sales/${saleId}/complete`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saleData),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Falló al completar la venta');
            }
            get().fetchAllSales();
            useProductStore.getState().fetchProducts();
            useAccountStore.getState().fetchAccountSummary();
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
                const err = await response.json();
                throw new Error(err.error || 'Falló al cancelar la venta.');
            }
            get().fetchAllSales();
            useProductStore.getState().fetchProducts();
            const { startDate, endDate } = useAccountStore.getState();
            if (startDate && endDate) {
                get().fetchSummary(startDate.toISOString(), endDate.toISOString());
            }
            useAccountStore.getState().fetchAccountSummary();
            useAccountStore.getState().fetchMovements();
            return { success: true };
        } catch (e) {
            set({ loading: false, error: e.message });
            return { success: false, error: e.message };
        }
    },

    updateCompletedSale: async (saleId, updatedData) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/sales/history/${saleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Falló al actualizar la venta.');
            }
            get().fetchAllSales();
            const { startDate, endDate } = useAccountStore.getState();
            if (startDate && endDate) {
                get().fetchSummary(startDate.toISOString(), endDate.toISOString());
            }
            useAccountStore.getState().fetchAccountSummary();
            return { success: true };
        } catch (e) {
            set({ loading: false, error: e.message });
            return { success: false, error: e.message };
        }
    },

    deletePendingSale: async (saleId) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar esta venta pendiente?')) return;
        try {
            const response = await fetch(`${API_URL}/sales/pending/${saleId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Falló al eliminar la venta');
            set(state => ({
                pendingSales: state.pendingSales.filter(s => s.id !== saleId)
            }));
        } catch (e) {
            console.error("Error deleting pending sale:", e);
            alert(e.message);
        }
    },

    deleteCompletedSale: async (saleId) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar esta venta del historial? Esta acción no se puede deshacer.')) return;
        try {
            const response = await fetch(`${API_URL}/sales/history/${saleId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Falló al eliminar la venta');
            get().fetchAllSales();
            const { startDate, endDate } = useAccountStore.getState();
            if (startDate && endDate) {
                get().fetchSummary(startDate.toISOString(), endDate.toISOString());
            }
            useAccountStore.getState().fetchAccountSummary();
        } catch (e) {
            console.error("Error deleting completed sale:", e);
            alert(e.message);
        }
    },

    applyTax: async (saleId, taxPercentage) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/sales/history/${saleId}/tax`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taxPercentage }),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Falló al aplicar el impuesto.');
            }
            get().fetchAllSales();
            const { startDate, endDate } = useAccountStore.getState();
            if (startDate && endDate) {
                get().fetchSummary(startDate.toISOString(), endDate.toISOString());
            }
            useAccountStore.getState().fetchAccountSummary();
            return { success: true };
        } catch (e) {
            set({ loading: false, error: e.message });
            return { success: false, error: e.message };
        }
    },

    fetchSummary: async (startDate, endDate) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/reports/monthly-summary?startDate=${startDate}&endDate=${endDate}`);
            const json = await response.json();
            if (!response.ok) throw new Error('No se pudo obtener el resumen');
            set({ monthlySummary: { ...json.data, startDate, endDate }, loading: false });
        } catch (e) {
            set({ loading: false, error: e.message });
        }
    },

    addExpense: async (expenseData) => {
        try {
            const response = await fetch(`${API_URL}/expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(expenseData),
            });
            if (!response.ok) throw new Error('Falló al agregar el gasto');
            const { startDate, endDate } = useAccountStore.getState();
            if (startDate && endDate) {
                get().fetchSummary(startDate.toISOString(), endDate.toISOString());
            }
            useAccountStore.getState().fetchAccountSummary();
        } catch (e) {
            console.error("Error adding expense:", e);
            alert(e.message);
        }
    },

    deleteExpense: async (expenseId) => {
        try {
            const response = await fetch(`${API_URL}/expenses/${expenseId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Falló al eliminar el gasto');
            const { startDate, endDate } = useAccountStore.getState();
            if (startDate && endDate) {
                get().fetchSummary(startDate.toISOString(), endDate.toISOString());
            }
            useAccountStore.getState().fetchAccountSummary();
        } catch (e) {
            console.error("Error deleting expense:", e);
            alert(e.message);
        }
    },

    fetchPaymentMethods: async () => {
        try {
            const response = await fetch(`${API_URL}/payment-methods`);
            const json = await response.json();
            if (response.ok) set({ paymentMethods: json.data });
        } catch (e) {
            console.error("Error fetching payment methods:", e);
        }
    },
}));

export default useSalesStore;

