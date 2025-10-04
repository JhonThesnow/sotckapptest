import { create } from 'zustand';

import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const useReportsStore = create((set) => ({
    reports: {
        today: null,
        week: null,
        month: null,
    },
    loading: false,
    error: null,

    // Acción principal para generar todos los reportes
    generateReports: async () => {
        set({ loading: true, error: null });
        try {
            const allSales = await db.sales.orderBy('date').toArray();
            const allProducts = await db.products.toArray();

            const todayReport = processSalesData(allSales, startOfDay(new Date()), endOfDay(new Date()));
            const weekReport = processSalesData(allSales, startOfWeek(new Date()), endOfWeek(new Date()));
            const monthReport = processSalesData(allSales, startOfMonth(new Date()), endOfMonth(new Date()));

            const topProducts = calculateTopProducts(allSales, allProducts);

            set({
                reports: {
                    today: { ...todayReport, topProducts: calculateTopProducts(todayReport.sales, allProducts) },
                    week: { ...weekReport, topProducts: calculateTopProducts(weekReport.sales, allProducts) },
                    month: { ...monthReport, topProducts },
                },
                loading: false,
            });
        } catch (e) {
            console.error('Error generating reports:', e);
            set({ loading: false, error: e.message });
        }
    },
}));

// --- Funciones auxiliares de procesamiento ---

// Procesa ventas dentro de un rango de fechas
const processSalesData = (allSales, startDate, endDate) => {
    const filteredSales = allSales.filter(sale => sale.date >= startDate && sale.date <= endDate);

    let totalRevenue = 0;
    let totalProfit = 0;
    let cashRevenue = 0;
    let cardRevenue = 0;

    filteredSales.forEach(sale => {
        totalRevenue += sale.totalAmount;
        if (sale.paymentMethod === 'efectivo') {
            cashRevenue += sale.totalAmount;
        } else {
            cardRevenue += sale.totalAmount;
        }

        sale.items.forEach(item => {
            const profitPerItem = (item.unitPrice - item.purchasePrice) * item.quantity;
            totalProfit += profitPerItem;
        });
    });

    return {
        sales: filteredSales,
        totalSales: filteredSales.length,
        totalRevenue,
        totalProfit,
        cashRevenue,
        cardRevenue
    };
};

// Calcula los productos más vendidos
const calculateTopProducts = (sales, products) => {
    const productSales = {};

    sales.forEach(sale => {
        sale.items.forEach(item => {
            if (productSales[item.productId]) {
                productSales[item.productId].quantity += item.quantity;
            } else {
                const productInfo = products.find(p => p.id === item.productId);
                productSales[item.productId] = {
                    name: productInfo ? productInfo.name : 'Producto Eliminado',
                    quantity: item.quantity,
                };
            }
        });
    });

    // Convertir a array, ordenar y tomar los 10 primeros
    return Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
};

export default useReportsStore;