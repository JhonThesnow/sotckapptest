import React, { useState, useEffect, useMemo } from 'react';
import useSalesStore from '../store/useSalesStore';
import useAccountStore from '../store/useAccountStore';
import { FiX, FiTrash, FiEdit, FiRotateCcw, FiAlertTriangle, FiTag } from 'react-icons/fi';
import CompleteSaleModal from '../components/CompleteSaleModal';
import ApplyTaxModal from '../components/ApplyTaxModal';
import EditSaleModal from '../components/EditSaleModal';
import CancelSaleModal from '../components/CancelSaleModal';
import { formatNumber } from '../utils/formatting';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';

const VentasPage = () => {
    const [activeTab, setActiveTab] = useState('a-cobrar');
    const [saleToComplete, setSaleToComplete] = useState(null);
    const [saleToApplyTax, setSaleToApplyTax] = useState(null);
    const [saleToEdit, setSaleToEdit] = useState(null);
    const [saleToCancel, setSaleToCancel] = useState(null);
    const [openDays, setOpenDays] = useState({});
    const [highlightedSaleId, setHighlightedSaleId] = useState(null);

    const {
        pendingSales, completedSales, fetchAllSales, loading, deletePendingSale,
        deleteCompletedSale, monthlySummary, fetchSummary, addExpense, deleteExpense,
    } = useSalesStore();

    const { accounts, categories, fetchAccounts, fetchCategories } = useAccountStore();

    const [startDate, setStartDate] = useState(startOfMonth(new Date()));
    const [endDate, setEndDate] = useState(endOfMonth(new Date()));
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [expenseDescription, setExpenseDescription] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseAccountId, setExpenseAccountId] = useState('');
    const [expenseCategoryId, setExpenseCategoryId] = useState('');

    // State for pagination in history
    const [historyPage, setHistoryPage] = useState(1);
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

    // State for pagination in daily breakdown
    const [dailyPage, setDailyPage] = useState(1);
    const DAILY_ITEMS_PER_PAGE = 10;


    useEffect(() => {
        fetchAllSales();
        fetchAccounts();
        fetchCategories();
    }, [fetchAllSales, fetchAccounts, fetchCategories]);

    useEffect(() => {
        if (activeTab === 'info') {
            fetchSummary(startDate.toISOString(), endDate.toISOString());
        }
    }, [activeTab, startDate, endDate, fetchSummary]);

    useEffect(() => {
        if (highlightedSaleId) {
            const timer = setTimeout(() => {
                setHighlightedSaleId(null);
            }, 2000); // Highlight lasts 2 seconds
            return () => clearTimeout(timer);
        }
    }, [highlightedSaleId]);

    const formatDate = (dateString) => {
        if (!dateString) return 'Fecha no disponible';
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('es-AR', options);
    };

    const handleSaleClick = (sale) => {
        setActiveTab('historial');
        setHighlightedSaleId(sale.id);
    };

    const handleExpenseSubmit = async (e) => {
        e.preventDefault();
        if (!expenseAccountId || !expenseCategoryId) {
            alert('Por favor, selecciona una cuenta y una categoría para el gasto.');
            return;
        }
        await addExpense({
            description: expenseDescription,
            amount: parseFloat(expenseAmount),
            accountId: parseInt(expenseAccountId, 10),
            categoryId: parseInt(expenseCategoryId, 10),
        });
        setExpenseDescription('');
        setExpenseAmount('');
        setExpenseAccountId('');
        setExpenseCategoryId('');
        setShowExpenseForm(false);
    };

    const groupMovementsByDay = (sales, expenses) => {
        const movements = [
            ...(sales || []).map(s => ({ ...s, type: 'sale', key: `sale-${s.id}` })),
            ...(expenses || []).map(e => ({ ...e, type: 'expense', key: `expense-${e.id}` }))
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
    const dailyMovementsDays = Object.keys(dailyMovements);
    const paginatedDailyMovementsDays = useMemo(() => {
        const start = (dailyPage - 1) * DAILY_ITEMS_PER_PAGE;
        const end = start + DAILY_ITEMS_PER_PAGE;
        return dailyMovementsDays.slice(start, end);
    }, [dailyMovementsDays, dailyPage]);


    const toggleDay = (day) => setOpenDays(prev => ({ ...prev, [day]: !prev[day] }));

    const renderSaleItems = (items) => {
        return (
            <ul className="list-disc pl-5">
                {items.map((item, index) => (
                    <li key={index} className="text-sm">
                        {item.quantity}x {item.fullName}
                    </li>
                ))}
            </ul>
        );
    };
    // Group sales by month for the history tab
    const salesByMonth = useMemo(() => {
        return completedSales.reduce((acc, sale) => {
            const month = format(new Date(sale.date), 'yyyy-MM');
            if (!acc[month]) {
                acc[month] = [];
            }
            acc[month].push(sale);
            return acc;
        }, {});
    }, [completedSales]);

    const availableMonths = Object.keys(salesByMonth).sort().reverse();

    const salesForSelectedMonth = salesByMonth[selectedMonth] || [];
    const historyPages = Math.ceil(salesForSelectedMonth.length / 5);
    const paginatedHistory = salesForSelectedMonth.slice((historyPage - 1) * 5, historyPage * 5);


    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-full">
            {saleToComplete && <CompleteSaleModal sale={saleToComplete} onClose={() => setSaleToComplete(null)} />}
            {saleToApplyTax && <ApplyTaxModal sale={saleToApplyTax} onClose={() => setSaleToApplyTax(null)} />}
            {saleToEdit && <EditSaleModal sale={saleToEdit} onClose={() => setSaleToEdit(null)} />}
            {saleToCancel && <CancelSaleModal sale={saleToCancel} onClose={() => setSaleToCancel(null)} />}

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
                                    <th className="p-4 font-semibold text-gray-600">Total</th>
                                    <th className="p-4 font-semibold text-gray-600 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && !pendingSales.length ? (
                                    <tr><td colSpan="4" className="text-center p-10">Cargando...</td></tr>
                                ) : pendingSales.length > 0 ? (
                                    pendingSales.map(sale => (
                                        <tr key={sale.id} className="border-b hover:bg-gray-50">
                                            <td className="p-4 whitespace-nowrap">{formatDate(sale.date)}</td>
                                            <td className="p-4">{renderSaleItems(sale.items)}</td>
                                            <td className="p-4 font-bold text-blue-600">${formatNumber(sale.totalAmount)}</td>
                                            <td className="p-4 text-center flex justify-center items-center gap-2">
                                                <button onClick={() => setSaleToComplete(sale)} className="bg-green-500 text-white py-1 px-3 rounded hover:bg-green-600">Configurar Cobro</button>
                                                <button onClick={() => deletePendingSale(sale.id)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100"><FiTrash /></button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="4" className="text-center p-10 text-gray-500">No hay ventas pendientes de cobro.</td></tr>
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
                                <div className="flex-grow"><label className="text-sm">Cuenta</label>
                                    <select value={expenseAccountId} onChange={e => setExpenseAccountId(e.target.value)} className="p-2 border rounded w-full" required>
                                        <option value="">Seleccionar cuenta</option>
                                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex-grow"><label className="text-sm">Categoría</label>
                                    <select value={expenseCategoryId} onChange={e => setExpenseCategoryId(e.target.value)} className="p-2 border rounded w-full" required>
                                        <option value="">Seleccionar categoría</option>
                                        {categories.filter(c => c.type === 'withdrawal').map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                    </select>
                                </div>
                                <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded w-full md:w-auto">Guardar</button>
                            </form>
                        )}
                        {loading ? <p>Cargando resumen...</p> : monthlySummary && (
                            <div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                                    <div className="bg-white p-6 rounded-lg shadow"><p className="text-gray-500">Ingresos Totales</p><p className="text-3xl font-bold">${formatNumber(monthlySummary.totalRevenue)}</p></div>
                                    <div className="bg-white p-6 rounded-lg shadow"><p className="text-gray-500">Ganancia Bruta</p><p className="text-3xl font-bold text-green-600">${formatNumber(monthlySummary.totalProfit)}</p></div>
                                    <div className="bg-white p-6 rounded-lg shadow"><p className="text-gray-500">Gastos Totales</p><p className="text-3xl font-bold text-red-500">-${formatNumber(monthlySummary.totalExpenses)}</p></div>
                                    <div className="bg-white p-6 rounded-lg shadow"><p className="text-gray-500">Ganancia Neta</p><p className="text-3xl font-bold text-blue-600">${formatNumber(monthlySummary.netProfit)}</p></div>
                                </div>
                                <h3 className="text-xl font-bold mb-4">Desglose Diario</h3>
                                <div className="space-y-2">
                                    {paginatedDailyMovementsDays.map(day => (
                                        <div key={day} className="bg-white rounded-lg shadow-sm">
                                            <button onClick={() => toggleDay(day)} className="w-full p-3 font-semibold text-left flex justify-between"><span>{day}</span><span>{openDays[day] ? '-' : '+'}</span></button>
                                            {openDays[day] && (
                                                <div className="p-3 border-t">
                                                    {dailyMovements[day].map(mov => (
                                                        <div key={mov.key} className={`py-2 flex justify-between items-center text-sm border-b last:border-b-0 ${mov.status === 'canceled' ? 'text-red-500' : ''}`}>
                                                            <div className="flex items-center gap-2">
                                                                {mov.type === 'sale' ? <span className={mov.status === 'canceled' ? 'font-bold' : 'text-green-500'}>{mov.status === 'canceled' ? 'Venta Cancelada' : 'Venta'}</span> : <span className="text-red-500">Gasto</span>}
                                                                <div className="text-gray-600">{mov.type === 'sale' ? renderSaleItems(mov.items) : mov.description}</div>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <p className={`font-bold ${mov.status === 'canceled' ? 'text-red-500' : mov.type === 'sale' ? 'text-green-600' : 'text-red-500'}`}>
                                                                    {mov.type === 'sale' ? (mov.status === 'canceled' ? `-${formatNumber(mov.finalAmount)}` : `+${formatNumber(mov.finalAmount)}`) : `-${formatNumber(mov.amount)}`}
                                                                </p>
                                                                {mov.type === 'sale' && mov.status !== 'canceled' ? <button onClick={() => handleSaleClick(mov)} className="text-blue-500 hover:underline text-xs">Ver en Historial</button> : mov.type === 'expense' ? <button onClick={() => deleteExpense(mov.id)} className="text-red-500 p-1 rounded-full hover:bg-red-100"><FiX size={14} /></button> : null}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {dailyMovementsDays.length > DAILY_ITEMS_PER_PAGE && (
                                    <div className="flex justify-center mt-4">
                                        <button onClick={() => setDailyPage(p => Math.max(1, p - 1))} disabled={dailyPage === 1} className="px-4 py-2 mx-1 bg-white border rounded">Anterior</button>
                                        <span className="px-4 py-2">Página {dailyPage} de {Math.ceil(dailyMovementsDays.length / DAILY_ITEMS_PER_PAGE)}</span>
                                        <button onClick={() => setDailyPage(p => p + 1)} disabled={dailyPage * DAILY_ITEMS_PER_PAGE >= dailyMovementsDays.length} className="px-4 py-2 mx-1 bg-white border rounded">Siguiente</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'historial' && (
                    <div className="bg-white rounded-lg shadow overflow-x-auto">
                        <div className="p-4">
                            <select value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setHistoryPage(1); }} className="p-2 border rounded">
                                {availableMonths.map(month => (
                                    <option key={month} value={month}>{format(new Date(month + '-02'), 'MMMM yyyy', { locale: es })}</option>
                                ))}
                            </select>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-4 font-semibold">Fecha</th>
                                    <th className="p-4 font-semibold">Ítems</th>
                                    <th className="p-4 font-semibold">Método Pago</th>
                                    <th className="p-4 font-semibold">Total</th>
                                    <th className="p-4 font-semibold">Estado</th>
                                    <th className="p-4 font-semibold">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && !completedSales.length ? (
                                    <tr><td colSpan="6" className="text-center p-10">Cargando...</td></tr>
                                ) : paginatedHistory.length > 0 ? (
                                    paginatedHistory.map(sale => (
                                        <tr key={sale.id} className={`border-b transition-colors duration-1000 ${highlightedSaleId === sale.id ? 'bg-blue-100' : ''} ${sale.status === 'canceled' ? 'bg-red-50 text-gray-500' : 'hover:bg-gray-50'}`}>
                                            <td className="p-4 whitespace-nowrap">{formatDate(sale.date)}</td>
                                            <td className="p-4">{renderSaleItems(sale.items)}</td>
                                            <td className="p-4 capitalize">{sale.paymentMethod}</td>
                                            <td className="p-4 font-bold">${formatNumber(sale.finalAmount)}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${sale.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {sale.status === 'completed' ? 'Completada' : 'Cancelada'}
                                                </span>
                                            </td>
                                            <td className="p-4 flex gap-1">
                                                {sale.status === 'completed' && (
                                                    <>
                                                        <button onClick={() => setSaleToEdit(sale)} title="Editar Venta" className="text-yellow-600 p-2 rounded-full hover:bg-yellow-100"><FiEdit /></button>
                                                        <button onClick={() => setSaleToApplyTax(sale)} title="Aplicar Impuesto" className="text-blue-600 p-2 rounded-full hover:bg-blue-100"><FiTag /></button>
                                                        <button onClick={() => setSaleToCancel(sale)} title="Cancelar y Devolver Stock" className="text-orange-600 p-2 rounded-full hover:bg-orange-100"><FiRotateCcw /></button>
                                                    </>
                                                )}
                                                {(sale.status === 'completed' || sale.status === 'canceled') && (
                                                    <button onClick={() => deleteCompletedSale(sale.id)} title="Eliminar Permanentemente" className="text-red-600 p-2 rounded-full hover:bg-red-100"><FiTrash /></button>
                                                )}
                                                {sale.status === 'canceled' && <FiAlertTriangle title={sale.cancellationReason} className="text-red-500" />}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="6" className="text-center p-10 text-gray-500">No hay ventas en el historial para este mes.</td></tr>
                                )}
                            </tbody>
                        </table>
                        {historyPages > 1 && (
                            <div className="p-4 flex justify-center">
                                <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1} className="px-4 py-2 mx-1 bg-white border rounded">Anterior</button>
                                <span className="px-4 py-2">Página {historyPage} de {historyPages}</span>
                                <button onClick={() => setHistoryPage(p => p + 1)} disabled={historyPage === historyPages} className="px-4 py-2 mx-1 bg-white border rounded">Siguiente</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VentasPage;