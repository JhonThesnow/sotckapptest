import React, { useState, useEffect } from 'react';
import useSalesStore from '../store/useSalesStore';
import { FiX, FiTrash, FiCreditCard, FiDollarSign } from 'react-icons/fi';
import CompleteSaleModal from '../components/CompleteSaleModal';
import ApplyTaxModal from '../components/ApplyTaxModal';
import { formatNumber } from '../utils/formatting';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { startOfMonth, endOfMonth, isToday } from 'date-fns';

const VentasPage = () => {
    const [activeTab, setActiveTab] = useState('a-cobrar');
    const [saleToComplete, setSaleToComplete] = useState(null);
    const [saleToApplyTax, setSaleToApplyTax] = useState(null);
    const [openDays, setOpenDays] = useState({});
    const [highlightedSaleId, setHighlightedSaleId] = useState(null);

    const {
        pendingSales,
        completedSales,
        fetchAllSales,
        loading,
        deletePendingSale,
        deleteCompletedSale,
        monthlySummary,
        fetchSummary,
        addExpense,
        deleteExpense,
    } = useSalesStore();

    const [startDate, setStartDate] = useState(startOfMonth(new Date()));
    const [endDate, setEndDate] = useState(endOfMonth(new Date()));
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [expenseDescription, setExpenseDescription] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');

    useEffect(() => {
        fetchAllSales();
    }, []);

    useEffect(() => {
        if (activeTab === 'info') {
            fetchSummary(startDate.toISOString(), endDate.toISOString());
        }
    }, [activeTab, startDate, endDate]);

    useEffect(() => {
        if (highlightedSaleId) {
            const timer = setTimeout(() => {
                setHighlightedSaleId(null);
            }, 2000); // El resaltado dura 2 segundos
            return () => clearTimeout(timer);
        }
    }, [highlightedSaleId]);

    const formatDate = (dateString) => {
        if (!dateString) return 'Fecha no disponible';
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('es-AR', options);
    };

    const handleExpenseSubmit = async (e) => {
        e.preventDefault();
        await addExpense({ description: expenseDescription, amount: parseFloat(expenseAmount) });
        setExpenseDescription('');
        setExpenseAmount('');
        setShowExpenseForm(false);
    };

    const groupMovementsByDay = (sales, expenses) => {
        const movements = [
            ...(sales || []).map(s => ({ ...s, type: 'sale' })),
            ...(expenses || []).map(e => ({ ...e, type: 'expense' }))
        ];
        movements.sort((a, b) => new Date(b.date) - new Date(a.date));

        const groups = movements.reduce((acc, mov) => {
            const date = new Date(mov.date).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
            if (!acc[date]) acc[date] = [];
            acc[date].push(mov);
            return acc;
        }, {});
        return groups;
    };

    const dailyMovements = monthlySummary ? groupMovementsByDay(monthlySummary.sales, monthlySummary.expenses) : {};

    const toggleDay = (day) => {
        setOpenDays(prev => ({ ...prev, [day]: !prev[day] }));
    };

    const handleSaleClick = (sale) => {
        setActiveTab('historial');
        setHighlightedSaleId(sale.id);
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-full">
            {saleToComplete && <CompleteSaleModal sale={saleToComplete} onClose={() => setSaleToComplete(null)} />}
            {saleToApplyTax && <ApplyTaxModal sale={saleToApplyTax} onClose={() => setSaleToApplyTax(null)} />}

            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Gestión de Ventas</h1>

            <div className="flex border-b mb-6">
                <button onClick={() => setActiveTab('a-cobrar')} className={`py-2 px-4 ${activeTab === 'a-cobrar' ? 'border-b-2 border-blue-600 font-semibold text-blue-600' : 'text-gray-500'}`}>Ventas a Cobrar</button>
                <button onClick={() => setActiveTab('info')} className={`py-2 px-4 ${activeTab === 'info' ? 'border-b-2 border-blue-600 font-semibold text-blue-600' : 'text-gray-500'}`}>Información</button>
                <button onClick={() => setActiveTab('historial')} className={`py-2 px-4 ${activeTab === 'historial' ? 'border-b-2 border-blue-600 font-semibold text-blue-600' : 'text-gray-500'}`}>Historial</button>
            </div>

            <div>
                {activeTab === 'a-cobrar' && (
                    <div className="bg-white rounded-lg shadow overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-600">Fecha</th>
                                    <th className="p-4 font-semibold text-gray-600">Ítems</th>
                                    <th className="p-4 font-semibold text-gray-600">Descuento</th>
                                    <th className="p-4 font-semibold text-gray-600">Total</th>
                                    <th className="p-4 font-semibold text-gray-600 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && !pendingSales.length ? (
                                    <tr><td colSpan="5" className="text-center p-10">Cargando...</td></tr>
                                ) : pendingSales.length > 0 ? (
                                    pendingSales.map(sale => (
                                        <tr key={sale.id} className="border-b hover:bg-gray-50">
                                            <td className="p-4 whitespace-nowrap">{formatDate(sale.date)}</td>
                                            <td className="p-4 text-sm">{sale.items.map(item => item.fullName).join(', ')}</td>
                                            <td className="p-4 text-sm">{sale.discount > 0 ? `${sale.discount}%` : 'No'}</td>
                                            <td className="p-4 font-bold text-blue-600">${formatNumber(sale.totalAmount)}</td>
                                            <td className="p-4 text-center flex justify-center items-center gap-2">
                                                <button onClick={() => setSaleToComplete(sale)} className="bg-green-500 text-white py-1 px-3 rounded hover:bg-green-600">Configurar Cobro</button>
                                                <button onClick={() => deletePendingSale(sale.id)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100"><FiTrash /></button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="5" className="text-center p-10 text-gray-500">No hay ventas pendientes de cobro.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'info' && (
                    <div>
                        <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row gap-4 items-center">
                            <div className="flex gap-4 items-center">
                                <DatePicker selected={startDate} onChange={date => setStartDate(date)} dateFormat="dd/MM/yyyy" className="p-2 border rounded w-full md:w-auto" />
                                <span>-</span>
                                <DatePicker selected={endDate} onChange={date => setEndDate(date)} dateFormat="dd/MM/yyyy" className="p-2 border rounded w-full md:w-auto" />
                            </div>
                            <button onClick={() => setShowExpenseForm(!showExpenseForm)} className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 w-full md:w-auto mt-2 md:mt-0">
                                {showExpenseForm ? 'Cancelar' : 'Agregar Gasto'}
                            </button>
                        </div>

                        {showExpenseForm && (
                            <form onSubmit={handleExpenseSubmit} className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-grow"><label className="text-sm">Descripción</label><input value={expenseDescription} onChange={e => setExpenseDescription(e.target.value)} className="p-2 border rounded w-full" required /></div>
                                <div className="flex-grow"><label className="text-sm">Monto</label><input type="number" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} className="p-2 border rounded w-full" required /></div>
                                <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded w-full md:w-auto">Guardar</button>
                            </form>
                        )}

                        {loading ? <p>Cargando resumen...</p> : monthlySummary && (
                            <div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="bg-white p-6 rounded-lg shadow"><p className="text-gray-500">Ingresos Totales</p><p className="text-3xl font-bold">${formatNumber(monthlySummary.totalRevenue)}</p></div>
                                    <div className="bg-white p-6 rounded-lg shadow"><p className="text-gray-500">Gastos Totales</p><p className="text-3xl font-bold text-red-500">${formatNumber(monthlySummary.totalExpenses)}</p></div>
                                </div>
                                <h3 className="text-xl font-bold mb-4">Desglose Diario</h3>
                                <div className="space-y-2">
                                    {Object.keys(dailyMovements).map(day => {
                                        const isCurrentDayOpen = openDays[day] === undefined ? isToday(new Date(monthlySummary.sales.find(s => new Date(s.date).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' }) === day)?.date)) : openDays[day];
                                        let saleCounter = 0;
                                        return (
                                            <div key={day} className="bg-white rounded-lg shadow-sm">
                                                <button onClick={() => toggleDay(day)} className="w-full p-3 font-semibold text-left flex justify-between"><span>{day}</span><span>{isCurrentDayOpen ? '-' : '+'}</span></button>
                                                {isCurrentDayOpen && (
                                                    <div className="p-3 border-t">
                                                        {dailyMovements[day].map(mov => {
                                                            if (mov.type === 'sale') saleCounter++;
                                                            return (
                                                                <div key={`${mov.type}-${mov.id}`} className="py-2 flex justify-between items-center text-sm border-b last:border-b-0">
                                                                    <div className="flex items-center gap-2">
                                                                        {mov.type === 'sale' ? <span className="text-green-500">Venta #{saleCounter}</span> : <span className="text-red-500">Gasto</span>}
                                                                        <p className="text-gray-600">{mov.type === 'sale' ? mov.items.map(i => i.fullName).join(', ') : mov.description}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-4">
                                                                        <p className={`font-bold ${mov.type === 'sale' ? 'text-green-600' : 'text-red-500'}`}>
                                                                            {mov.type === 'sale' ? `+${formatNumber(mov.finalAmount)}` : `-${formatNumber(mov.amount)}`}
                                                                        </p>
                                                                        {mov.type === 'sale' ? <button onClick={() => handleSaleClick(mov)} className="text-blue-500 hover:underline text-xs">Ver en Historial</button> : <button onClick={() => deleteExpense(mov.id)} className="text-red-500 p-1 rounded-full hover:bg-red-100"><FiX size={14} /></button>}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'historial' && (
                    <div className="bg-white rounded-lg shadow overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-600">Fecha</th>
                                    <th className="p-4 font-semibold text-gray-600">Ítems</th>
                                    <th className="p-4 font-semibold text-gray-600">Método Pago</th>
                                    <th className="p-4 font-semibold text-gray-600">Total Final</th>
                                    <th className="p-4 font-semibold text-gray-600">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && !completedSales.length ? (
                                    <tr><td colSpan="5" className="text-center p-10">Cargando...</td></tr>
                                ) : completedSales.length > 0 ? (
                                    completedSales.map(sale => (
                                        <tr key={sale.id} className={`border-b transition-colors duration-1000 ${highlightedSaleId === sale.id ? 'bg-red-200 animate-pulse' : ''}`}>
                                            <td className="p-4 whitespace-nowrap">{formatDate(sale.date)}</td>
                                            <td className="p-4 text-sm text-gray-600">{sale.items.map(item => item.fullName).join(', ')}</td>
                                            <td className="p-4 capitalize">{sale.paymentMethod}</td>
                                            <td className="p-4 font-bold text-gray-800">${formatNumber(sale.finalAmount)}</td>
                                            <td className="p-4 flex gap-2">
                                                <button onClick={() => setSaleToApplyTax(sale)} className="text-xs bg-gray-200 px-2 py-1 rounded">Agregar Impuesto</button>
                                                <button onClick={() => deleteCompletedSale(sale.id)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100"><FiTrash /></button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="5" className="text-center p-10 text-gray-500">No hay ventas en el historial.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VentasPage;

