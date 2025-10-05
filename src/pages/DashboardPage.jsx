import React, { useEffect } from 'react';
import useDashboardStore from '../store/useDashboardStore';
import { formatNumber } from '../utils/formatting';
import { FiDollarSign, FiShoppingCart, FiPackage, FiTrendingUp, FiTrendingDown, FiAlertTriangle } from 'react-icons/fi';

const StatCard = ({ title, value, icon, colorClass }) => (
    <div className={`bg-white p-6 rounded-lg shadow flex items-center gap-4 border-l-4 ${colorClass}`}>
        <div className="text-3xl p-3 rounded-full bg-gray-100">
            {icon}
        </div>
        <div>
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const DashboardPage = () => {
    const { summary, loading, fetchDashboardSummary } = useDashboardStore();

    useEffect(() => {
        fetchDashboardSummary();
    }, [fetchDashboardSummary]);

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('es-AR', options);
    };

    if (loading) {
        return <div className="p-6 text-center">Cargando dashboard...</div>;
    }

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Panel Principal</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
                <StatCard
                    title="Ingresos de Hoy"
                    value={`$${formatNumber(summary.totalRevenueToday)}`}
                    icon={<FiDollarSign className="text-green-600" />}
                    colorClass="border-green-500"
                />
                <StatCard
                    title="Ventas de Hoy"
                    value={summary.salesCountToday}
                    icon={<FiShoppingCart className="text-blue-600" />}
                    colorClass="border-blue-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><FiAlertTriangle className="text-red-500" /> Productos con Bajo Stock</h2>
                    {summary.lowStockProducts.length > 0 ? (
                        <ul className="space-y-3">
                            {summary.lowStockProducts.map(product => (
                                <li key={product.id} className="flex justify-between items-center text-sm p-2 rounded bg-red-50">
                                    <span className="font-medium text-gray-700">{product.name} - {product.subtype}</span>
                                    <span className="font-bold text-red-600">{product.quantity} uds.</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 py-10">¡No hay productos con bajo stock!</p>
                    )}
                </div>

                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4">Últimos Movimientos de Cuenta</h2>
                    {summary.recentMovements.length > 0 ? (
                        <div className="divide-y divide-gray-200">
                            {summary.recentMovements.map(mov => (
                                <div key={mov.id} className="py-3 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${mov.type === 'deposit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {mov.type === 'deposit' ? <FiTrendingUp size={16} /> : <FiTrendingDown size={16} />}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-gray-800">{mov.reason}</p>
                                            <p className="text-xs text-gray-500">{formatDate(mov.date)}</p>
                                        </div>
                                    </div>
                                    <p className={`font-bold text-sm ${mov.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                                        {mov.type === 'deposit' ? '+' : '-'}${formatNumber(mov.amount)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-10">No hay movimientos recientes.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
