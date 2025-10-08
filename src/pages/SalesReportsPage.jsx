import React, { useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import useSalesReportsStore from '../store/useSalesReportsStore';
import useProductStore from '../store/useProductStore';
import { formatNumber } from '../utils/formatting';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';

const StatCard = ({ title, value, previousValue }) => {
    const percentageChange = useMemo(() => {
        if (previousValue === null || previousValue === undefined || previousValue === 0) return null;
        return ((value - previousValue) / previousValue) * 100;
    }, [value, previousValue]);

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-800">{value}</p>
                {percentageChange !== null && (
                    <span className={`flex items-center text-sm font-bold ${percentageChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {percentageChange >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                        {Math.abs(percentageChange).toFixed(1)}%
                    </span>
                )}
            </div>
        </div>
    );
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-2 border rounded shadow-lg">
                <p className="font-bold">{label}</p>
                <p>Cantidad: {payload[0].value}</p>
            </div>
        );
    }
    return null;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19AF'];

const SalesReportsPage = () => {
    const { filters, setFilters, reportData, loading, fetchReportData, resetFilters } = useSalesReportsStore();
    const { products, fetchProducts } = useProductStore();

    const [activityRange, setActivityRange] = useState('daily');
    const [pieChartDataKey, setPieChartDataKey] = useState('revenueByName');
    const [sortConfig, setSortConfig] = useState({ key: 'quantity', direction: 'descending' });

    useEffect(() => {
        fetchProducts();
        fetchReportData();
    }, []);

    const productNamesOptions = useMemo(() => [...new Set(products.map(p => p.name))].map(name => ({ value: name, label: name })), [products]);
    const productBrands = useMemo(() => [...new Set(products.map(p => p.brand).filter(Boolean))].map(b => ({ value: b, label: b })), [products]);

    const handleApplyFilters = () => fetchReportData();
    const handleSort = (key) => {
        let direction = 'descending';
        if (sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'ascending';
        }
        setSortConfig({ key, direction });
    };

    const sortedProducts = useMemo(() => {
        if (!reportData?.currentPeriod?.topProducts) return [];
        const sortableItems = [...reportData.currentPeriod.topProducts];
        sortableItems.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
        return sortableItems;
    }, [reportData, sortConfig]);

    const activityData = useMemo(() => {
        if (!reportData?.currentPeriod?.salesByDay) return [];
        const data = Object.entries(reportData.currentPeriod.salesByDay).map(([date, values]) => ({
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
            if (!acc[key]) acc[key] = 0;
            acc[key] += curr.sales;
            return acc;
        }, {});

        return Object.entries(groupedData).map(([name, sales]) => ({ name, sales }));
    }, [reportData, activityRange]);

    const summaryText = `Mostrando reportes para el período: ${format(filters.startDate, 'dd/MM/yyyy')} - ${format(filters.endDate, 'dd/MM/yyyy')}`;
    const activeFiltersText = [
        filters.names.length > 0 ? `Tipos: ${filters.names.map(n => n.label).join(', ')}` : '',
        filters.brands.length > 0 ? `Marcas: ${filters.brands.map(b => b.label).join(', ')}` : ''
    ].filter(Boolean).join(' | ');


    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Reportes de Ventas</h1>
            <p className="text-sm text-gray-500 mb-6">{summaryText}{activeFiltersText && ` | ${activeFiltersText}`}</p>

            <div className="bg-white p-4 rounded-lg shadow mb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="text-sm font-medium">Rango de Fechas</label>
                        <div className="flex items-center">
                            <DatePicker selected={filters.startDate} onChange={(date) => setFilters({ startDate: date })} selectsStart startDate={filters.startDate} endDate={filters.endDate} className="w-full p-2 border rounded-l-md" dateFormat="dd/MM/yyyy" />
                            <DatePicker selected={filters.endDate} onChange={(date) => setFilters({ endDate: date })} selectsEnd startDate={filters.startDate} endDate={filters.endDate} minDate={filters.startDate} className="w-full p-2 border rounded-r-md" dateFormat="dd/MM/yyyy" />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Tipo de Producto</label>
                        <Select isMulti options={productNamesOptions} value={filters.names} onChange={(selected) => setFilters({ names: selected })} placeholder="Todos los tipos" />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Marca</label>
                        <Select isMulti options={productBrands} value={filters.brands} onChange={(selected) => setFilters({ brands: selected })} placeholder="Todas las marcas" />
                    </div>
                    <div className="flex items-end gap-2">
                        <button onClick={handleApplyFilters} className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">Aplicar</button>
                        <button onClick={resetFilters} className="w-full bg-gray-200 py-2 px-4 rounded-lg hover:bg-gray-300">Resetear</button>
                    </div>
                </div>
                <div className="flex items-center">
                    <input type="checkbox" id="compare" checked={filters.compare} onChange={(e) => setFilters({ compare: e.target.checked })} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                    <label htmlFor="compare" className="ml-2 text-sm font-medium">Comparar con período anterior</label>
                </div>
            </div>

            {loading && <div className="text-center p-10">Cargando reportes...</div>}
            {!loading && reportData?.currentPeriod && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                        <StatCard title="Total de Ingresos" value={`$${formatNumber(reportData.currentPeriod.summary.totalRevenue)}`} previousValue={reportData.previousPeriod?.summary.totalRevenue} />
                        <StatCard title="Ganancia Bruta" value={`$${formatNumber(reportData.currentPeriod.summary.grossProfit)}`} previousValue={reportData.previousPeriod?.summary.grossProfit} />
                        <StatCard title="Margen Ganancia" value={`${reportData.currentPeriod.summary.profitMargin.toFixed(1)}%`} previousValue={reportData.previousPeriod?.summary.profitMargin} />
                        <StatCard title="Total Productos Vendidos" value={formatNumber(reportData.currentPeriod.summary.totalProductsSold)} previousValue={reportData.previousPeriod?.summary.totalProductsSold} />
                        <StatCard title="Total de Ventas" value={formatNumber(reportData.currentPeriod.summary.totalSales)} previousValue={reportData.previousPeriod?.summary.totalSales} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Ingresos</h2>
                                <div className="flex text-sm">
                                    <button onClick={() => setPieChartDataKey('revenueByName')} className={`px-2 py-1 rounded-l-md ${pieChartDataKey === 'revenueByName' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Por Tipo</button>
                                    <button onClick={() => setPieChartDataKey('revenueByBrand')} className={`px-2 py-1 rounded-r-md ${pieChartDataKey === 'revenueByBrand' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Por Marca</button>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={reportData.currentPeriod[pieChartDataKey]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                                        {reportData.currentPeriod[pieChartDataKey].map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(value) => `$${formatNumber(value)}`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
                            <h2 className="text-xl font-bold mb-4">Actividad de Ventas</h2>
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
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-bold mb-4">Ranking Detallado de Productos</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="border-b-2">
                                    <tr>
                                        <th className="p-2">#</th>
                                        <th className="p-2 cursor-pointer" onClick={() => handleSort('name')}>Producto</th>
                                        <th className="p-2 cursor-pointer" onClick={() => handleSort('quantity')}>Unidades</th>
                                        <th className="p-2 cursor-pointer" onClick={() => handleSort('revenue')}>Ingresos</th>
                                        <th className="p-2 cursor-pointer" onClick={() => handleSort('profit')}>Ganancia</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedProducts.map((product, index) => (
                                        <tr key={product.name} className="border-b hover:bg-gray-50">
                                            <td className="p-2">{index + 1}</td>
                                            <td className="p-2 font-medium">{product.name}</td>
                                            <td className="p-2">{formatNumber(product.quantity)}</td>
                                            <td className="p-2">${formatNumber(product.revenue)}</td>
                                            <td className="p-2 text-green-600">${formatNumber(product.profit)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SalesReportsPage;