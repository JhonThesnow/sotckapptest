import React, { useState, useEffect, useMemo } from 'react';
import useAccountStore from '../store/useAccountStore';
import { formatNumber } from '../utils/formatting';
import { FiTrendingUp, FiTrendingDown, FiPlus, FiX, FiMoreHorizontal, FiFileText, FiSave, FiEdit, FiTrash, FiDollarSign } from 'react-icons/fi';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import EditMovementModal from '../components/EditMovementModal';

const ModifyFundsModal = ({ onClose }) => {
    const { addMovement, loading, categories } = useAccountStore();
    const [type, setType] = useState('deposit');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [categoryId, setCategoryId] = useState('');

    const filteredCategories = categories.filter(c => c.type === type);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || !reason || !categoryId) {
            alert('Por favor, completa todos los campos.');
            return;
        }
        const result = await addMovement({
            type,
            amount: parseFloat(amount),
            reason,
            categoryId: parseInt(categoryId, 10),
        });
        if (result.success) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Modificar Fondos</h2>
                    <button onClick={onClose}><FiX size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Movimiento</label>
                        <div className="flex gap-4">
                            <button type="button" onClick={() => setType('deposit')} className={`flex-1 p-3 rounded-lg border-2 ${type === 'deposit' ? 'border-green-500 bg-green-50' : ''}`}>Agregar Dinero</button>
                            <button type="button" onClick={() => setType('withdrawal')} className={`flex-1 p-3 rounded-lg border-2 ${type === 'withdrawal' ? 'border-red-500 bg-red-50' : ''}`}>Retirar Dinero</button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoría</label>
                        <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 p-2 border rounded w-full" required>
                            <option value="">Selecciona una categoría...</option>
                            {filteredCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Monto</label>
                        <input type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 p-2 border rounded w-full" placeholder="0" required />
                    </div>
                    <div>
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Motivo/Nota</label>
                        <input type="text" id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 p-2 border rounded w-full" placeholder="Ej: Caja inicial, retiro personal" required />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded">Cancelar</button>
                        <button type="submit" disabled={loading} className="py-2 px-4 bg-blue-600 text-white rounded disabled:bg-blue-300">
                            {loading ? 'Guardando...' : 'Confirmar Movimiento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CashClosingModal = ({ onClose }) => {
    const { cashClosingData, fetchCashClosingData, saveCashClosing, selectedAccountId, loading } = useAccountStore();
    const [counted, setCounted] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchCashClosingData();
    }, [fetchCashClosingData]);

    const difference = useMemo(() => {
        const countedAmount = parseFloat(counted);
        if (isNaN(countedAmount) || !cashClosingData) return 0;
        return countedAmount - cashClosingData.expected;
    }, [counted, cashClosingData]);

    const handleSubmit = async () => {
        if (counted === '') {
            alert('Por favor, ingresa el monto contado.');
            return;
        }
        const result = await saveCashClosing({
            accountId: selectedAccountId,
            expected: cashClosingData.expected,
            counted: parseFloat(counted),
            difference,
            notes,
        });
        if (result.success) {
            alert('¡Cierre de caja guardado con éxito!');
            onClose();
        }
    };

    if (!cashClosingData) return <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50"><div className="bg-white p-6 rounded-lg">Cargando...</div></div>;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Realizar Cierre de Caja</h2>
                    <button onClick={onClose}><FiX size={24} /></button>
                </div>
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">Último cierre: {new Date(cashClosingData.lastClosingDate).toLocaleString('es-AR')}</p>
                    <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                        <div className="flex justify-between"><span>Ventas en Efectivo:</span> <span className="font-semibold text-green-600">+ ${formatNumber(cashClosingData.salesTotal)}</span></div>
                        <div className="flex justify-between"><span>Depósitos Manuales:</span> <span className="font-semibold text-green-600">+ ${formatNumber(cashClosingData.deposits)}</span></div>
                        <div className="flex justify-between"><span>Retiros Manuales:</span> <span className="font-semibold text-red-600">- ${formatNumber(cashClosingData.withdrawals)}</span></div>
                        <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Saldo Esperado:</span> <span>${formatNumber(cashClosingData.expected)}</span></div>
                    </div>
                    <div>
                        <label htmlFor="counted" className="block text-sm font-medium text-gray-700">Monto Real Contado</label>
                        <input type="number" id="counted" value={counted} onChange={(e) => setCounted(e.target.value)} className="mt-1 p-2 border rounded w-full font-bold text-lg" placeholder="0" required />
                    </div>
                    <div className="flex justify-between font-bold text-lg p-3 rounded-lg" style={{ backgroundColor: difference === 0 ? '#f0fdf4' : (difference > 0 ? '#eff6ff' : '#fef2f2'), color: difference === 0 ? '#166534' : (difference > 0 ? '#1e40af' : '#991b1b') }}>
                        <span>Diferencia:</span>
                        <span>{difference >= 0 ? '$' : '-$'}{formatNumber(Math.abs(difference))}</span>
                    </div>
                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notas (Opcional)</label>
                        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 p-2 border rounded w-full" placeholder="Ej: Faltó dinero por un error en el vuelto."></textarea>
                    </div>
                </div>
                <div className="flex justify-end gap-4 pt-4 mt-4 border-t">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded">Cancelar</button>
                    <button onClick={handleSubmit} disabled={loading} className="py-2 px-4 bg-blue-600 text-white rounded disabled:bg-blue-300">
                        {loading ? 'Guardando...' : 'Confirmar Cierre'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const AccountPage = () => {
    const {
        accounts, selectedAccountId, setSelectedAccountId,
        accountSummary, movements, cashClosings, loading,
        setDateRange, deleteMovement, fetchInitialData,
        startDate, endDate
    } = useAccountStore();

    const [showModifyFundsModal, setShowModifyFundsModal] = useState(false);
    const [showCashClosingModal, setShowCashClosingModal] = useState(false);
    const [movementToEdit, setMovementToEdit] = useState(null);
    const [activeTab, setActiveTab] = useState('movements');


    useEffect(() => {
        fetchInitialData();
    }, []);

    const handleDateChange = (start, end) => {
        setDateRange(start, end);
    };

    const handleDeleteMovement = async (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este movimiento?')) {
            await deleteMovement(id);
        }
    };

    const formatDate = (dateString, withTime = true) => {
        const options = withTime
            ? { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
            : { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('es-AR', options);
    };

    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    const selectedAccountName = selectedAccount?.name || 'Consolidado';
    const isCashAccountSelected = selectedAccount?.type === 'Efectivo';


    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-full">
            {showModifyFundsModal && <ModifyFundsModal onClose={() => setShowModifyFundsModal(false)} />}
            {showCashClosingModal && <CashClosingModal onClose={() => setShowCashClosingModal(false)} />}
            {movementToEdit && <EditMovementModal movement={movementToEdit} onClose={() => setMovementToEdit(null)} />}

            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Estado de Cuenta</h1>
                    <p className="text-gray-500">Mostrando datos para: <span className="font-semibold text-blue-600">{selectedAccountName}</span></p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setShowCashClosingModal(true)}
                        disabled={!isCashAccountSelected}
                        className="flex items-center justify-center gap-2 bg-yellow-500 text-white py-2 px-4 rounded-lg shadow hover:bg-yellow-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        title={!isCashAccountSelected ? "Selecciona una cuenta de tipo 'Efectivo' para hacer un cierre" : "Realizar Cierre de Caja"}
                    >
                        <FiDollarSign />
                        <span>Cierre de Caja</span>
                    </button>
                    <button onClick={() => setShowModifyFundsModal(true)} className="flex items-center justify-center gap-2 bg-green-600 text-white py-2 px-4 rounded-lg shadow hover:bg-green-700 transition-colors">
                        <FiPlus />
                        <span>Modificar Fondos</span>
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-grow">
                    <label className="text-sm font-medium text-gray-700">Cuenta</label>
                    <select value={selectedAccountId || ''} onChange={(e) => setSelectedAccountId(e.target.value ? parseInt(e.target.value) : null)} className="p-2 border rounded bg-white w-full">
                        <option value="">Consolidado (Todas)</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                </div>
                <div className="flex gap-4 items-center flex-grow">
                    <div>
                        <label className="text-sm font-medium text-gray-700">Desde</label>
                        <DatePicker selected={startDate} onChange={date => handleDateChange(date, endDate)} dateFormat="dd/MM/yyyy" className="p-2 border rounded w-full" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Hasta</label>
                        <DatePicker selected={endDate} onChange={date => handleDateChange(startDate, date)} dateFormat="dd/MM/yyyy" className="p-2 border rounded w-full" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-green-100 border-l-4 border-green-500 p-6 rounded-lg shadow">
                    <p className="text-green-800 font-medium">Total Ingresos</p>
                    <p className="text-3xl font-bold text-green-900 mt-2">${formatNumber(accountSummary.totalIncome)}</p>
                </div>
                <div className="bg-red-100 border-l-4 border-red-500 p-6 rounded-lg shadow">
                    <p className="text-red-800 font-medium">Total Egresos</p>
                    <p className="text-3xl font-bold text-red-900 mt-2">-${formatNumber(accountSummary.totalOutcome)}</p>
                </div>
                <div className="bg-blue-100 border-l-4 border-blue-500 p-6 rounded-lg shadow">
                    <p className="text-blue-800 font-medium">Resultado del Período</p>
                    <p className={`text-3xl font-bold mt-2 ${accountSummary.periodResult >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                        {accountSummary.periodResult >= 0 ? '$' : '-$'}{formatNumber(Math.abs(accountSummary.periodResult))}
                    </p>
                </div>
            </div>

            <div>
                <div className="flex border-b mb-6">
                    <button onClick={() => setActiveTab('movements')} className={`py-2 px-4 ${activeTab === 'movements' ? 'border-b-2 border-blue-600 font-semibold text-blue-600' : 'text-gray-500'}`}>Historial de Movimientos</button>
                    <button onClick={() => setActiveTab('closings')} className={`py-2 px-4 ${activeTab === 'closings' ? 'border-b-2 border-blue-600 font-semibold text-blue-600' : 'text-gray-500'}`}>Historial de Cierres</button>
                </div>

                {activeTab === 'movements' && (
                    <div className="bg-white rounded-lg shadow overflow-x-auto">
                        {loading && movements.length === 0 ? <p className="p-4 text-center">Cargando...</p> :
                            movements.length > 0 ? (
                                <div className="divide-y divide-gray-200">
                                    {movements.map(mov => (
                                        <div key={mov.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center group">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-full ${mov.type === 'deposit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                    {mov.type === 'deposit' ? <FiTrendingUp /> : <FiTrendingDown />}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-800">{mov.reason}</p>
                                                    <p className="text-sm text-gray-500">{mov.categoryName} | {formatDate(mov.date)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                                <p className={`font-bold text-lg ${mov.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {mov.type === 'deposit' ? '+' : '-'}${formatNumber(mov.amount)}
                                                </p>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex">
                                                    <button onClick={() => setMovementToEdit(mov)} title="Editar" className="p-2 text-gray-500 hover:text-blue-600"><FiEdit /></button>
                                                    <button onClick={() => handleDeleteMovement(mov.id)} title="Eliminar" className="p-2 text-gray-500 hover:text-red-600"><FiTrash /></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center p-10 text-gray-500 flex flex-col items-center">
                                    <FiFileText size={32} className="mb-2" />
                                    <p>No hay movimientos de fondos registrados para este rango de fechas.</p>
                                </div>
                            )}
                    </div>
                )}

                {activeTab === 'closings' && (
                    <div className="bg-white rounded-lg shadow overflow-x-auto">
                        {loading && cashClosings.length === 0 ? <p className="p-4 text-center">Cargando...</p> :
                            cashClosings.length > 0 ? (
                                <table className="w-full text-left">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-3">Fecha</th>
                                            <th className="p-3">Cuenta</th>
                                            <th className="p-3 text-right">Esperado</th>
                                            <th className="p-3 text-right">Contado</th>
                                            <th className="p-3 text-right">Diferencia</th>
                                            <th className="p-3">Notas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {cashClosings.map(c => (
                                            <tr key={c.id}>
                                                <td className="p-3 whitespace-nowrap">{formatDate(c.date)}</td>
                                                <td className="p-3">{c.accountName}</td>
                                                <td className="p-3 text-right">${formatNumber(c.expected)}</td>
                                                <td className="p-3 text-right">${formatNumber(c.counted)}</td>
                                                <td className={`p-3 text-right font-bold ${c.difference === 0 ? 'text-gray-700' : c.difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                                    ${formatNumber(c.difference)}
                                                </td>
                                                <td className="p-3 text-sm text-gray-600">{c.notes}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center p-10 text-gray-500 flex flex-col items-center">
                                    <FiFileText size={32} className="mb-2" />
                                    <p>No hay cierres de caja registrados para este rango de fechas.</p>
                                </div>
                            )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccountPage;