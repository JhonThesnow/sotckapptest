import React, { useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDay, isSameDay, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import useSalesReportsStore from '../store/useSalesReportsStore';
import useProductStore from '../store/useProductStore';
import { formatNumber } from '../utils/formatting';

const StatCard = ({ title, value }) => (
    <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
);

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-2 border rounded shadow-lg">
                <p className="font-bold">{label}</p>
                <p>Cantidad: {payload[0].value}</p>
                <p>Porcentaje: {payload[0].payload.percentage}%</p>
            </div>
        );
    }
    return null;
};

const SalesReportsPage = () => {
    const { filters, setFilters, reportData, loading, fetchReportData, resetFilters } = useSalesReportsStore();
    const { products, fetchProducts } = useProductStore();

    useEffect(() => {
        fetchProducts();
        fetchReportData();
    }, []);

    const productTypes = useMemo(() => [...new Set(products.map(p => p.type))].map(t => ({ value: t, label: t })), [products]);
    const productBrands = useMemo(() => [...new Set(products.map(p => p.brand).filter(Boolean))].map(b => ({ value: b, label: b })), [products]);

    const [activityRange, setActivityRange] = useState('daily');

    const activityData = useMemo(() => {
        if (!reportData?.salesByDay) return [];

        const data = Object.entries(reportData.salesByDay).map(([date, values]) => ({
            date: new Date(date),
            sales: values.sales
        })).sort((a, b) => a.date - b.date);

        if (activityRange === 'daily') {
            return data.map(d => ({ name: format(d.date, 'dd/MM'), sales: d.sales }));
        }

        const groupedData = data.reduce((acc, curr) => {
            let key;
            if (activityRange === 'weekly') {
                key = format(curr.date, 'RRRR-II', { locale: es });
            } else if (activityRange === 'monthly') {
                key = format(curr.date, 'MMM yyyy', { locale: es });
            }
            if (!acc[key]) {
                acc[key] = 0;
            }
            acc[key] += curr.sales;
            return acc;
        }, {});

        return Object.entries(groupedData).map(([name, sales]) => ({ name, sales }));

    }, [reportData, activityRange]);

    const handleApplyFilters = () => {
        fetchReportData();
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Reportes de Ventas</h1>

            {/* Filter Panel */}
            <div className="bg-white p-4 rounded-lg shadow mb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="text-sm font-medium">Rango de Fechas</label>
                        <div className="flex items-center">
                            <DatePicker
                                selected={filters.startDate}
                                onChange={(date) => setFilters({ startDate: date })}
                                selectsStart
                                startDate={filters.startDate}
                                endDate={filters.endDate}
                                className="w-full p-2 border rounded-l-md"
                                dateFormat="dd/MM/yyyy"
                            />
                            <DatePicker
                                selected={filters.endDate}
                                onChange={(date) => setFilters({ endDate: date })}
                                selectsEnd
                                startDate={filters.startDate}
                                endDate={filters.endDate}
                                minDate={filters.startDate}
                                className="w-full p-2 border rounded-r-md"
                                dateFormat="dd/MM/yyyy"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Tipo de Producto</label>
                        <Select
                            isMulti
                            options={productTypes}
                            value={filters.types}
                            onChange={(selected) => setFilters({ types: selected })}
                            placeholder="Todos los tipos"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Marca</label>
                        <Select
                            isMulti
                            options={productBrands}
                            value={filters.brands}
                            onChange={(selected) => setFilters({ brands: selected })}
                            placeholder="Todas las marcas"
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <button onClick={handleApplyFilters} className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">Aplicar</button>
                        <button onClick={resetFilters} className="w-full bg-gray-200 py-2 px-4 rounded-lg hover:bg-gray-300">Resetear</button>
                    </div>
                </div>
            </div>

            {loading && <div className="text-center p-10">Cargando reportes...</div>}

            {!loading && reportData && (
                <>
                    {/* Summary Panel */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <StatCard title="Total de Ingresos" value={`$${formatNumber(reportData.summary.totalRevenue)}`} />
                        <StatCard title="Total Productos Vendidos" value={formatNumber(reportData.summary.totalProductsSold)} />
                        <StatCard title="Total de Ventas" value={formatNumber(reportData.summary.totalSales)} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Best Sellers Chart */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
                            <h2 className="text-xl font-bold mb-4">Productos Más Vendidos</h2>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={reportData.topProducts} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis type="category" dataKey="name" width={150} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar dataKey="quantity" name="Cantidad Vendida" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Ranking Panel */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h2 className="text-xl font-bold mb-4">Ranking de Productos</h2>
                            <ul className="space-y-3">
                                {reportData.topProducts.map((product, index) => (
                                    <li key={index} className="flex justify-between items-center text-sm">
                                        <span className="font-medium text-gray-700">{index + 1}. {product.name}</span>
                                        <span className="font-bold bg-gray-200 text-gray-800 px-2 py-1 rounded-full">{product.quantity} uds.</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Activity Chart */}
                    <div className="bg-white p-6 rounded-lg shadow mt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Actividad de Ventas</h2>
                            <div className="flex gap-2">
                                <button onClick={() => setActivityRange('daily')} className={`p-2 rounded ${activityRange === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Diario</button>
                                <button onClick={() => setActivityRange('weekly')} className={`p-2 rounded ${activityRange === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Semanal</button>
                                <button onClick={() => setActivityRange('monthly')} className={`p-2 rounded ${activityRange === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Mensual</button>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={activityData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(value) => `$${formatNumber(value)}`} />
                                <Area type="monotone" dataKey="sales" stroke="#8884d8" fill="#8884d8" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}
        </div>
    );
};

export default SalesReportsPage;
