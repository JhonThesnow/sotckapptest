import React, { useState, useMemo } from 'react';
import useSalesStore from '../store/useSalesStore';
import { FiX, FiTag } from 'react-icons/fi';

const CompleteSaleModal = ({ sale, onClose }) => {
    const { completeSale, loading, error } = useSalesStore();
    const [paymentMethod, setPaymentMethod] = useState('');
    const [customPaymentMethod, setCustomPaymentMethod] = useState('');
    const [showCustom, setShowCustom] = useState(false);
    const [finalDiscountPercentage, setFinalDiscountPercentage] = useState(0);

    const finalDiscountAmount = useMemo(() => (sale.totalAmount * finalDiscountPercentage) / 100, [sale.totalAmount, finalDiscountPercentage]);
    const finalTotal = useMemo(() => sale.totalAmount - finalDiscountAmount, [sale.totalAmount, finalDiscountAmount]);

    const handleComplete = async () => {
        const method = showCustom ? customPaymentMethod : paymentMethod;
        if (!method) {
            alert("Por favor, selecciona o ingresa un método de pago.");
            return;
        }
        const result = await completeSale(sale.id, { paymentMethod: method, finalDiscountPercentage });
        if (result.success) onClose();
    };

    const paymentOptions = ['Efectivo', 'Tarjeta', 'Débito', 'Mercado Pago'];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-6 border-b pb-3">
                    <h2 className="text-2xl font-bold">Configurar Cobro</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><FiX size={24} /></button>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between text-lg"><span>Total Inicial:</span> <span>${sale.totalAmount.toFixed(2)}</span></div>

                    <div className="flex items-center gap-2">
                        <FiTag />
                        <label>Descuento Final (%):</label>
                        <input type="number" value={finalDiscountPercentage} onChange={(e) => setFinalDiscountPercentage(Number(e.target.value))} className="w-20 p-1 border rounded text-right" min="0" max="100" />
                    </div>
                    {finalDiscountPercentage > 0 && <div className="flex justify-between text-red-500"><span>Descuento Aplicado:</span> <span>-${finalDiscountAmount.toFixed(2)}</span></div>}

                    <div>
                        <p className="font-semibold mb-2">Método de Pago:</p>
                        <div className="grid grid-cols-2 gap-2">
                            {paymentOptions.map(opt => (
                                <button key={opt} onClick={() => { setPaymentMethod(opt); setShowCustom(false); }} className={`p-3 rounded-lg border-2 ${paymentMethod === opt && !showCustom ? 'border-blue-500 bg-blue-50' : ''}`}>{opt}</button>
                            ))}
                        </div>
                        <button onClick={() => { setShowCustom(!showCustom); setPaymentMethod(''); }} className={`w-full mt-2 p-3 rounded-lg border-2 text-left ${showCustom ? 'border-blue-500 bg-blue-50' : ''}`}>Otro...</button>
                        {showCustom && (
                            <input type="text" value={customPaymentMethod} onChange={(e) => setCustomPaymentMethod(e.target.value)} placeholder="Ingresar método de pago" className="w-full mt-2 p-2 border rounded" />
                        )}
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t">
                    <div className="flex justify-between items-center text-3xl font-bold text-green-600">
                        <span>TOTAL A COBRAR:</span>
                        <span>${finalTotal.toFixed(2)}</span>
                    </div>
                </div>

                {error && <p className="text-red-600 bg-red-100 p-2 rounded-lg mt-4 text-center">{error}</p>}

                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onClose} disabled={loading} className="py-2 px-6 bg-gray-200 rounded hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleComplete} disabled={loading} className="py-2 px-6 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-300">
                        {loading ? 'Procesando...' : 'Confirmar Cobro'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CompleteSaleModal;

