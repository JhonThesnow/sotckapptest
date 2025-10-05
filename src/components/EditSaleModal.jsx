import React, { useState, useEffect } from 'react';
import useSalesStore from '../store/useSalesStore';
import { FiX, FiSave, FiDollarSign } from 'react-icons/fi';
import { formatNumber } from '../utils/formatting';

const EditSaleModal = ({ sale, onClose }) => {
    const { updateCompletedSale, paymentMethods, fetchPaymentMethods, loading, error } = useSalesStore();

    const [paymentMethod, setPaymentMethod] = useState(sale.paymentMethod);
    const [finalAmount, setFinalAmount] = useState(sale.finalAmount);

    useEffect(() => {
        if (!paymentMethods.length) {
            fetchPaymentMethods();
        }
    }, [paymentMethods, fetchPaymentMethods]);

    const handleSave = async () => {
        const result = await updateCompletedSale(sale.id, {
            finalAmount: parseFloat(finalAmount),
            paymentMethod,
        });
        if (result && result.success) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-6 border-b pb-3">
                    <h2 className="text-2xl font-bold">Editar Venta Completada</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><FiX size={24} /></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago:</label>
                        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="p-3 border rounded-lg bg-white w-full">
                            {paymentMethods.map(method => <option key={method.id} value={method.name}>{method.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Monto Final Cobrado:</label>
                        <div className="relative">
                            <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="number"
                                value={finalAmount}
                                onChange={(e) => setFinalAmount(e.target.value)}
                                className="w-full pl-8 pr-4 py-2 border rounded-lg"
                            />
                        </div>
                    </div>
                </div>

                {error && <p className="text-red-600 bg-red-100 p-2 rounded-lg mt-4 text-center text-sm">{error}</p>}

                <div className="flex justify-end gap-4 mt-8">
                    <button onClick={onClose} disabled={loading} className="py-2 px-6 bg-gray-200 rounded hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleSave} disabled={loading} className="py-2 px-6 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 disabled:bg-blue-300">
                        <FiSave />
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditSaleModal;

