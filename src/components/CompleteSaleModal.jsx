import React, { useState, useEffect, useMemo } from 'react';
import useSalesStore from '../store/useSalesStore.js';
import { FiX, FiSave, FiPercent } from 'react-icons/fi';
import { formatNumber, roundCash } from '../utils/formatting.js';

const CompleteSaleModal = ({ sale, onClose }) => {
    const { completeSale, paymentMethods, fetchPaymentMethods, loading, error } = useSalesStore();

    const [paymentMethod, setPaymentMethod] = useState(sale.paymentMethod || '');
    const [discountPercentage, setDiscountPercentage] = useState(sale.finalDiscount || 0);

    useEffect(() => {
        if (paymentMethods.length === 0) {
            fetchPaymentMethods();
        }
    }, [paymentMethods, fetchPaymentMethods]);

    const totalAmount = sale.totalAmount;
    const discountAmount = useMemo(() => (totalAmount * discountPercentage) / 100, [totalAmount, discountPercentage]);
    const totalAfterDiscount = useMemo(() => totalAmount - discountAmount, [totalAmount, discountAmount]);
    const finalTotal = useMemo(() => {
        if (paymentMethod === 'Efectivo') {
            return roundCash(totalAfterDiscount);
        }
        return totalAfterDiscount;
    }, [totalAfterDiscount, paymentMethod]);


    const handleConfirm = async () => {
        if (!paymentMethod) {
            alert('Por favor, selecciona un método de pago.');
            return;
        }

        // CORRECCIÓN: Asegurar que el totalAmount enviado para la base de datos sea el redondeado
        // Esto es necesario porque el backend confía en que el finalAmount sea el valor cobrado
        const finalAmountForDB = finalTotal;

        const result = await completeSale(sale.id, {
            paymentMethod,
            finalDiscountPercentage: discountPercentage,
            // Envía el monto final redondeado o no redondeado, según el método de pago.
            // Aunque el backend lo calcula, es buena práctica en el frontend para consistencia.
            finalAmount: finalAmountForDB,
        });
        if (result && result.success) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-6 border-b pb-3">
                    <h2 className="text-2xl font-bold">Configurar Cobro</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><FiX size={24} /></button>
                </div>

                <div className="space-y-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Items: {sale.items.map(i => i.fullName).join(', ')}</p>
                        {/* CORRECCIÓN: Usar sale.subtotal que no lleva descuento inicial */}
                        <p className="text-right font-semibold">Monto Original: ${formatNumber(sale.subtotal)}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago:</label>
                        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="p-3 border rounded-lg bg-white w-full">
                            <option value="">Seleccionar método</option>
                            {paymentMethods.map(method => <option key={method.id} value={method.name}>{method.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descuento Final (%):</label>
                        <div className="relative">
                            <FiPercent className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="number"
                                value={discountPercentage}
                                onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                                className="w-full pl-9 pr-4 py-2 border rounded-lg"
                                min="0" max="100"
                            />
                        </div>
                        {discountPercentage > 0 && (
                            <p className="text-sm text-red-500 mt-1">Descuento aplicado: -${formatNumber(discountAmount)}</p>
                        )}
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t">
                    <div className="flex justify-between items-center text-3xl font-bold text-blue-600">
                        <span>TOTAL A COBRAR:</span>
                        <span>${formatNumber(finalTotal)}</span>
                    </div>
                    {paymentMethod === 'Efectivo' && totalAfterDiscount !== finalTotal && (
                        <p className="text-right text-sm text-gray-500">Monto sin redondear: ${formatNumber(totalAfterDiscount)}</p>
                    )}
                </div>

                {error && <p className="text-red-600 bg-red-100 p-2 rounded-lg mt-4 text-center text-sm">{error}</p>}

                <div className="flex justify-end gap-4 mt-8">
                    <button onClick={onClose} disabled={loading} className="py-2 px-6 bg-gray-200 rounded hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleConfirm} disabled={loading || !paymentMethod} className="py-2 px-6 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 disabled:bg-green-300">
                        <FiSave />
                        {loading ? 'Confirmando...' : 'Confirmar Cobro'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CompleteSaleModal;