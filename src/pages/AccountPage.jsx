import React, { useState, useEffect } from 'react';
import useAccountStore from '../store/useAccountStore';
import { formatNumber } from '../utils/formatting';
import { FiTrendingUp, FiTrendingDown, FiPlus, FiX, FiMoreHorizontal, FiFileText, FiSave, FiEdit, FiTrash } from 'react-icons/fi';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { startOfMonth, endOfMonth } from 'date-fns';
import EditMovementModal from '../components/EditMovementModal';

const ModifyFundsModal = ({ onClose }) => {
    const { addMovement, loading } = useAccountStore();
    const [type, setType] = useState('deposit');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || !reason) {
            alert('Por favor, completa todos los campos.');
            return;
        }
        const result = await addMovement({
            type,
            amount: parseFloat(amount),
            reason,
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
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Monto</label>
                        <input type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 p-2 border rounded w-full" placeholder="0" required />
                    </div>
                    <div>
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Motivo</label>
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

const AccountPage = () => {
    const { accountSummary, movements, loading, setDateRange, deleteMovement } = useAccountStore();
    const [showModal, setShowModal] = useState(false);
    const [movementToEdit, setMovementToEdit] = useState(null);
    const [selectedMethod, setSelectedMethod] = useState(null);

    const [localStartDate, setLocalStartDate] = useState(startOfMonth(new Date()));
    const [localEndDate, setLocalEndDate] = useState(endOfMonth(new Date()));

    useEffect(() => {
        const savedStartDate = localStorage.getItem('defaultStartDate');
        const savedEndDate = localStorage.getItem('defaultEndDate');
        const startDate = savedStartDate ? new Date(savedStartDate) : startOfMonth(new Date());
        const endDate = savedEndDate ? new Date(savedEndDate) : endOfMonth(new Date());

        setLocalStartDate(startDate);
        setLocalEndDate(endDate);
        setDateRange(startDate, endDate);
    }, [setDateRange]);

    const handleDateChange = (start, end) => {
        setLocalStartDate(start);
        setLocalEndDate(end);
        setDateRange(start, end);
    };

    const saveDateRangeAsDefault = () => {
        localStorage.setItem('defaultStartDate', localStartDate.toISOString());
        localStorage.setItem('defaultEndDate', localEndDate.toISOString());
        alert('Rango de fechas guardado como predeterminado.');
    };

    const handleDeleteMovement = async (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este movimiento?')) {
            await deleteMovement(id);
        }
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('es-AR', options);
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-full">
            {showModal && <ModifyFundsModal onClose={() => setShowModal(false)} />}
            {movementToEdit && <EditMovementModal movement={movementToEdit} onClose={() => setMovementToEdit(null)} />}

            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Estado de Cuenta</h1>
                <button onClick={() => setShowModal(true)} className="flex items-center justify-center gap-2 bg-green-600 text-white py-2 px-4 rounded-lg shadow hover:bg-green-700 transition-colors">
                    <FiPlus />
                    <span>Modificar Fondos</span>
                </button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex gap-4 items-center flex-grow">
                    <DatePicker selected={localStartDate} onChange={date => handleDateChange(date, localEndDate)} dateFormat="dd/MM/yyyy" className="p-2 border rounded w-full" />
                    <span>-</span>
                    <DatePicker selected={localEndDate} onChange={date => handleDateChange(localStartDate, date)} dateFormat="dd/MM/yyyy" className="p-2 border rounded w-full" />
                </div>
                <button onClick={saveDateRangeAsDefault} className="flex items-center gap-2 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300">
                    <FiSave />
                    <span>Guardar Rango</span>
                </button>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-lg col-span-1 md:col-span-2 lg:col-span-3 border-l-4 border-blue-500">
                    <p className="text-gray-500 font-medium">Saldo Total en Cuenta</p>
                    <p className="text-4xl font-bold text-gray-800 mt-2">${formatNumber(accountSummary.totalBalance)}</p>
                </div>

                {Object.entries(accountSummary.incomeByMethod).map(([method, data]) => (
                    <div key={method} className="bg-white p-6 rounded-lg shadow relative cursor-pointer" onClick={() => setSelectedMethod(selectedMethod === method ? null : method)}>
                        <p className="text-gray-500 font-medium">{`Ingresos ${method}`}</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">${formatNumber(data.total)}</p>
                        <FiMoreHorizontal className="absolute top-4 right-4 text-gray-400" />
                        {selectedMethod === method && (
                            <div className="mt-4 pt-4 border-t border-dashed">
                                <p className="text-sm text-gray-600 flex justify-between">Ganancia Bruta: <span className="font-semibold">${formatNumber(data.profit)}</span></p>
                                <p className="text-sm text-gray-600 flex justify-between">Ganancia Neta: <span className="font-semibold">${formatNumber(data.netProfit)}</span></p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Historial de Movimientos</h2>
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
                                                <p className="text-sm text-gray-500">{formatDate(mov.date)}</p>
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
            </div>
        </div>
    );
};

export default AccountPage;

