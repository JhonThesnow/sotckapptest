import React, { useState, useMemo, useEffect } from 'react';
import useSalesStore from '../store/useSalesStore';
import { FiX, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { formatNumber, roundCash } from '../utils/formatting';

const CheckoutModal = ({ subtotal, preselectedPaymentMethod, onClose }) => {
    const { cart, createPendingSale, loading, error, paymentMethods, fetchPaymentMethods } = useSalesStore();
    const [discount, setDiscount] = useState(0);
    const [showSummary, setShowSummary] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(preselectedPaymentMethod || '');

    useEffect(() => {
        if (paymentMethods.length === 0) {
            fetchPaymentMethods();
        }
    }, [paymentMethods, fetchPaymentMethods]);

    const discountAmount = useMemo(() => (subtotal * discount) / 100, [subtotal, discount]);
    const totalAfterDiscount = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);

    // Lógica de redondeo visual
    const finalTotal = useMemo(() => {
        if (selectedPaymentMethod === 'Efectivo') {
            return roundCash(totalAfterDiscount);
        }
        return totalAfterDiscount;
    }, [totalAfterDiscount, selectedPaymentMethod]);

    const handleCreatePendingSale = async () => {
        const saleDetails = {
            subtotal,
            discount,
            totalAmount: totalAfterDiscount, // Enviamos el total ANTES de redondear
            paymentMethod: selectedPaymentMethod || null,
        };
        const result = await createPendingSale(saleDetails);
        if (result.success) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                    <h2 className="text-2xl font-bold">Enviar Venta a Cobrar</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><FiX size={24} /></button>
                </div>

                {/* Resumen de la Venta */}
                <button onClick={() => setShowSummary(!showSummary)} className="w-full flex justify-between items-center text-left py-2 text-gray-600">
                    <span>Ver Resumen de la Venta</span>
                    {showSummary ? <FiChevronUp /> : <FiChevronDown />}
                </button>
                {showSummary && (
                    <div className="border-t border-b py-2 mb-4 max-h-32 overflow-y-auto">
                        {cart.map(item => (
                            <div key={item.id} className="flex justify-between text-sm py-1">
                                <span>{item.quantity}x {item.name}{item.subtype ? ` - ${item.subtype}` : ''}</span>
                                {/* CORRECCIÓN: Usar encadenamiento opcional en el cálculo del precio */}
                                <span>${formatNumber((item.salePrices?.[0]?.price || 0) * item.quantity)}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="space-y-4 text-lg">
                    <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>${formatNumber(subtotal)}</span>
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                        <select value={selectedPaymentMethod} onChange={(e) => setSelectedPaymentMethod(e.target.value)} className="p-2 border rounded bg-white w-full">
                            <option value="">Seleccionar después...</option>
                            {paymentMethods.map(method => <option key={method.id} value={method.name}>{method.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t">
                    <div className="flex justify-between items-center text-3xl font-bold text-blue-600">
                        <span>TOTAL:</span>
                        <span>${formatNumber(finalTotal)}</span>
                    </div>
                    {selectedPaymentMethod === 'Efectivo' && totalAfterDiscount !== finalTotal && (
                        <p className="text-right text-sm text-gray-500">Monto original: ${formatNumber(totalAfterDiscount)}</p>
                    )}
                </div>

                {error && <p className="text-red-600 bg-red-100 p-3 rounded-lg mt-4 text-center text-sm">{error}</p>}

                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onClose} disabled={loading} className="py-2 px-6 bg-gray-200 rounded hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleCreatePendingSale} disabled={loading} className="py-2 px-6 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300">
                        {loading ? 'Enviando...' : 'Enviar a Cobrar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CheckoutModal;

