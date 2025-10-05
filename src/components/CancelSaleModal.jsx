import React, { useState } from 'react';
import useSalesStore from '../store/useSalesStore';
import { FiX, FiAlertTriangle } from 'react-icons/fi';

const CancelSaleModal = ({ sale, onClose }) => {
    const { cancelSale, loading, error } = useSalesStore();
    const [reason, setReason] = useState('');

    const handleConfirm = async () => {
        if (!reason.trim()) {
            alert('Por favor, ingresa un motivo para la cancelación.');
            return;
        }
        const result = await cancelSale(sale.id, reason);
        if (result.success) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                    <h2 className="text-2xl font-bold text-red-600 flex items-center gap-2">
                        <FiAlertTriangle />
                        Cancelar Venta
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><FiX size={24} /></button>
                </div>

                <p className="mb-4">Estás a punto de cancelar la venta #{sale.id}. El stock de los productos será devuelto. Esta acción no se puede deshacer.</p>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Motivo de la cancelación</label>
                        <textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="mt-1 p-2 border rounded w-full"
                            placeholder="Ej: Cliente se arrepintió, error de cobro..."
                            rows="3"
                            required
                        ></textarea>
                    </div>
                </div>

                {error && <p className="text-red-600 bg-red-100 p-2 rounded-lg mt-4 text-center">{error}</p>}

                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onClose} disabled={loading} className="py-2 px-6 bg-gray-200 rounded hover:bg-gray-300">Volver</button>
                    <button onClick={handleConfirm} disabled={loading || !reason.trim()} className="py-2 px-6 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-300">
                        {loading ? 'Cancelando...' : 'Confirmar Cancelación'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CancelSaleModal;
