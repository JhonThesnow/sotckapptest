import React, { useState, useEffect } from 'react';
import useAccountStore from '../store/useAccountStore';
import { FiX } from 'react-icons/fi';

const EditMovementModal = ({ movement, onClose }) => {
    const { updateMovement, loading } = useAccountStore();
    const [type, setType] = useState('deposit');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (movement) {
            setType(movement.type);
            setAmount(movement.amount);
            setReason(movement.reason);
        }
    }, [movement]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await updateMovement(movement.id, {
            type,
            amount: parseFloat(amount),
            reason,
        });
        if (result && result.success) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Editar Movimiento</h2>
                    <button onClick={onClose}><FiX size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Movimiento</label>
                        <div className="flex gap-4">
                            <button type="button" onClick={() => setType('deposit')} className={`flex-1 p-3 rounded-lg border-2 ${type === 'deposit' ? 'border-green-500 bg-green-50' : ''}`}>Depósito</button>
                            <button type="button" onClick={() => setType('withdrawal')} className={`flex-1 p-3 rounded-lg border-2 ${type === 'withdrawal' ? 'border-red-500 bg-red-50' : ''}`}>Retiro</button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Monto</label>
                        <input type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 p-2 border rounded w-full" required />
                    </div>
                    <div>
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Motivo</label>
                        <input type="text" id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 p-2 border rounded w-full" required />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded">Cancelar</button>
                        <button type="submit" disabled={loading} className="py-2 px-4 bg-blue-600 text-white rounded disabled:bg-blue-300">
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditMovementModal;