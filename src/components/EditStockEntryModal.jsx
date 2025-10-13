import React, { useState, useEffect } from 'react';
import useProductStore from '../store/useProductStore.js';
import { FiX, FiPlus, FiTrash, FiSave } from 'react-icons/fi';

const EditStockEntryModal = ({ entry, onClose }) => {
    const { updateStockEntry, products: allProducts } = useProductStore();
    const [products, setProducts] = useState([]);
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [productToAdd, setProductToAdd] = useState('');

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

    const handleRemoveProduct = (productId) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este producto del ingreso?')) {
            setProducts(currentProducts => currentProducts.filter(p => p.id !== productId));
        }
    };

    const handleAddProduct = () => {
        const product = allProducts.find(p => p.id === parseInt(productToAdd, 10));
        if (product && !products.some(p => p.id === product.id)) {
            setProducts(currentProducts => [...currentProducts, { ...product, quantity: 1 }]);
        }
        setShowAddProduct(false);
        setProductToAdd('');
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
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={product.quantity}
                                    onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                                    className="w-24 p-1 border rounded text-center"
                                />
                                <button onClick={() => handleRemoveProduct(product.id)} className="text-red-500 hover:text-red-700">
                                    <FiTrash />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                {showAddProduct ? (
                    <div className="flex gap-2 mt-4">
                        <select
                            value={productToAdd}
                            onChange={(e) => setProductToAdd(e.target.value)}
                            className="p-2 border rounded w-full"
                        >
                            <option value="">Selecciona un producto...</option>
                            {allProducts.filter(p => !products.some(ep => ep.id === p.id)).map(p => (
                                <option key={p.id} value={p.id}>{p.name} - {p.subtype}</option>
                            ))}
                        </select>
                        <button onClick={handleAddProduct} className="py-2 px-4 bg-blue-600 text-white rounded">Agregar</button>
                    </div>
                ) : (
                    <button onClick={() => setShowAddProduct(true)} className="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:underline">
                        <FiPlus /> Agregar Producto
                    </button>
                )}
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