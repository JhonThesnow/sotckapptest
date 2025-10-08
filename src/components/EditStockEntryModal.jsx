import React, { useState, useEffect } from 'react';
import useProductStore from '../store/useProductStore';
import { FiX, FiSave } from 'react-icons/fi';

const EditStockEntryModal = ({ entry, onClose }) => {
    const { updateStockEntry } = useProductStore();
    const [products, setProducts] = useState([]);

    useEffect(() => {
        if (entry) {
            setProducts(JSON.parse(entry.products));
        }
    }, [entry]);

    const handleQuantityChange = (productId, newQuantity) => {
        setProducts(currentProducts =>
            currentProducts.map(p =>
                p.id === productId ? { ...p, quantity: parseInt(newQuantity, 10) || 0 } : p
            )
        );
    };

    const handleSave = () => {
        const originalProducts = JSON.parse(entry.products);
        updateStockEntry(entry.id, originalProducts, products);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Editar Ingreso de Stock</h2>
                    <button onClick={onClose}><FiX size={24} /></button>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                    {products.map(product => (
                        <div key={product.id} className="flex justify-between items-center p-2 bg-gray-100 rounded">
                            <span>{product.name} - {product.subtype}</span>
                            <input
                                type="number"
                                value={product.quantity}
                                onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                                className="w-24 p-1 border rounded text-center"
                            />
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-4 mt-6">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded">Cancelar</button>
                    <button onClick={handleSave} className="py-2 px-4 bg-blue-600 text-white rounded flex items-center gap-2">
                        <FiSave /> Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditStockEntryModal;