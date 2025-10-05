import React, { useState } from 'react';
import useProductStore from '../store/useProductStore';
import { FiX, FiPackage } from 'react-icons/fi';

const RestockModal = ({ product, onClose }) => {
    const { restockProduct, loading } = useProductStore();
    const [quantity, setQuantity] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const amount = parseInt(quantity, 10);
        if (isNaN(amount) || amount <= 0) {
            alert('Por favor, ingresa una cantidad válida.');
            return;
        }
        await restockProduct(product.id, amount);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2"><FiPackage /> Agregar Stock</h2>
                    <button type="button" onClick={onClose}><FiX size={24} /></button>
                </div>
                <p className="mb-2 text-gray-700">Producto: <span className="font-semibold">{product.name} - {product.subtype}</span></p>
                <p className="mb-4 text-sm text-gray-500">Stock actual: {product.quantity}</p>

                <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Cantidad a agregar</label>
                    <input
                        type="number"
                        id="quantity"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="mt-1 p-2 border rounded w-full"
                        placeholder="0"
                        required
                        autoFocus
                    />
                </div>

                <div className="flex justify-end gap-4 mt-6">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded">Cancelar</button>
                    <button type="submit" disabled={loading} className="py-2 px-4 bg-green-600 text-white rounded disabled:bg-green-300">
                        {loading ? 'Agregando...' : 'Confirmar'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RestockModal;
