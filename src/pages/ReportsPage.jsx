import React, { useEffect, useState } from 'react';
import useReportsStore from '../store/reportsStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FiTrendingUp, FiDollarSign, FiAward, FiCalendar, FiFileText } from 'react-icons/fi';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Componente para una tarjeta de estadística
const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-lg shadow flex items-center gap-4">
        <div className={`text-3xl p-3 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const ReportsPage = () => {
    const { reports, loading, generateReports } = useReportsStore();
    const [activePeriod, setActivePeriod] = useState('today'); // 'today', 'week', 'month'

    useEffect(() => {
        generateReports();
    }, []);

    const activeReport = reports[activePeriod];

    // Prepara los datos para el gráfico de ventas de la semana/mes
    const chartData = (period, sales) => {
        if (!sales || sales.length === 0) return [];
        const dataMap = {};
        const formatString = period === 'week' ? 'eeee' : 'dd/MM'; // Días de la semana o fechas

        sales.forEach(sale => {
            const day = format(sale.date, formatString, { locale: es });
            if (!dataMap[day]) dataMap[day] = 0;
            dataMap[day] += sale.totalAmount;
        });
        return Object.keys(dataMap).map(day => ({ name: day, Ventas: dataMap[day] }));
    };

    const salesChartData = chartData(activePeriod, activeReport?.sales);


    if (loading) return <div className="p-6 text-center">Cargando reportes...</div>;
    if (!activeReport) return <div className="p-6 text-center">No hay datos para mostrar.</div>

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Reportes y Estadísticas</h1>

            {/* Selector de Periodo */}
            <div className="flex gap-2 mb-6 bg-white p-2 rounded-lg shadow-sm max-w-sm">
                <button onClick={() => setActivePeriod('today')} className={`flex-1 p-2 rounded ${activePeriod === 'today' ? 'bg-blue-600 text-white' : ''}`}>Hoy</button>
                <button onClick={() => setActivePeriod('week')} className={`flex-1 p-2 rounded ${activePeriod === 'week' ? 'bg-blue-600 text-white' : ''}`}>Esta Semana</button>
                <button onClick={() => setActivePeriod('month')} className={`flex-1 p-2 rounded ${activePeriod === 'month' ? 'bg-blue-600 text-white' : ''}`}>Este Mes</button>
            </div>

            {/* KPIs Principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Ventas Totales" value={`$${activeReport.totalRevenue.toFixed(2)}`} icon={<FiDollarSign />} color="bg-green-100 text-green-600" />
                <StatCard title="Ganancia Neta" value={`$${activeReport.totalProfit.toFixed(2)}`} icon={<FiTrendingUp />} color="bg-blue-100 text-blue-600" />
                <StatCard title="Nº de Ventas" value={activeReport.totalSales} icon={<FiFileText />} color="bg-yellow-100 text-yellow-600" />
                <StatCard title="Ventas en Efectivo" value={`$${activeReport.cashRevenue.toFixed(2)}`} icon={<FiDollarSign />} color="bg-indigo-100 text-indigo-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gráfico de Ventas y Reporte de Caja */}
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4">Evolución de Ventas ({activePeriod})</h2>
                    {salesChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={salesChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                                <Legend />
                                <Bar dataKey="Ventas" fill="#3B82F6" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-center text-gray-500 py-12">No hay suficientes datos para el gráfico.</p>}

                    {/* Reporte de Caja del día */}
                    {activePeriod === 'today' && (
                        <div className="mt-8 border-t pt-6">
                            <h2 className="text-xl font-bold mb-4">Reporte de Caja - {format(new Date(), 'dd/MM/yyyy')}</h2>
                            <div className="space-y-2">
                                <div className="flex justify-between p-2 bg-gray-50 rounded"><span>Ventas en Efectivo:</span> <span className="font-bold">${reports.today.cashRevenue.toFixed(2)}</span></div>
                                <div className="flex justify-between p-2 bg-gray-50 rounded"><span>Ventas con Tarjeta:</span> <span className="font-bold">${reports.today.cardRevenue.toFixed(2)}</span></div>
                                <div className="flex justify-between p-3 bg-blue-50 rounded text-blue-800 font-bold mt-2"><span>TOTAL CAJA:</span> <span>${reports.today.totalRevenue.toFixed(2)}</span></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Productos más vendidos */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><FiAward /> Top Productos Vendidos</h2>
                    <ul className="space-y-3">
                        {activeReport.topProducts.map((product, index) => (
                            <li key={index} className="flex justify-between items-center text-sm">
                                <span className="font-medium text-gray-700">{index + 1}. {product.name}</span>
                                <span className="font-bold bg-gray-200 text-gray-800 px-2 py-1 rounded-full">{product.quantity} uds.</span>
                            </li>
                        ))}
                        {activeReport.topProducts.length === 0 && <p className="text-center text-gray-500 pt-10">No hay ventas registradas en este periodo.</p>}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;