import React, { useState, useMemo } from 'react';
import useSalesStore from '../store/useSalesStore';
import { FiX, FiPercent } from 'react-icons/fi';

const ApplyTaxModal = ({ sale, onClose }) => {
    const { applyTaxToSale, loading, error } = useSalesStore();
    const [taxPercentage, setTaxPercentage] = useState(sale.taxPercentage || 0);

    const taxAmount = useMemo(() => (sale.finalAmount * taxPercentage) / 100, [sale.finalAmount, taxPercentage]);
    const netAmount = useMemo(() => sale.finalAmount - taxAmount, [sale.finalAmount, taxAmount]);

    const handleApplyTax = async () => {
        const result = await applyTaxToSale(sale.id, { taxPercentage });
        if (result.success) onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-6 border-b pb-3">
                    <h2 className="text-2xl font-bold">Aplicar Impuesto</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><FiX size={24} /></button>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between text-lg"><span>Total Cobrado:</span> <span>${sale.finalAmount.toFixed(2)}</span></div>

                    <div className="flex items-center gap-2">
                        <FiPercent />
                        <label>Impuesto a restar (%):</label>
                        <input type="number" value={taxPercentage} onChange={(e) => setTaxPercentage(Number(e.target.value))} className="w-20 p-1 border rounded text-right" min="0" max="100" />
                    </div>
                    {taxPercentage > 0 && <div className="flex justify-between text-orange-500"><span>Monto Impuesto:</span> <span>-${taxAmount.toFixed(2)}</span></div>}
                </div>

                <div className="mt-6 pt-4 border-t">
                    <div className="flex justify-between items-center text-3xl font-bold text-green-600">
                        <span>MONTO NETO:</span>
                        <span>${netAmount.toFixed(2)}</span>
                    </div>
                </div>

                {error && <p className="text-red-600 bg-red-100 p-2 rounded-lg mt-4 text-center">{error}</p>}

                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onClose} disabled={loading} className="py-2 px-6 bg-gray-200 rounded hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleApplyTax} disabled={loading} className="py-2 px-6 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-orange-300">
                        {loading ? 'Aplicando...' : 'Aplicar Impuesto'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApplyTaxModal;

