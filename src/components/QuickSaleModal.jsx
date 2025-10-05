import React, { useState } from 'react';
import useSalesStore from '../store/useSalesStore';
import { FiX, FiShoppingCart } from 'react-icons/fi';

const QuickSaleModal = ({ onClose }) => {
    const { addItemToCart } = useSalesStore();
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('Artículo Vario');
    const [quantity, setQuantity] = useState(1);

    const handleAddItem = (e) => {
        e.preventDefault();
        const finalPrice = parseFloat(price);
        if (isNaN(finalPrice) || finalPrice <= 0) {
            alert('Por favor, ingresa un precio válido.');
            return;
        }

        const quickSaleItem = {
            id: `qs-${Date.now()}`, // ID único temporal
            name: description.trim() || 'Artículo Vario',
            subtype: '',
            quantity: parseInt(quantity, 10),
            purchasePrice: 0, // No hay costo de compra para estos items
            salePrices: [{ name: 'Minorista', price: finalPrice }],
        };

        addItemToCart(quickSaleItem);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <form onSubmit={handleAddItem} className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2"><FiShoppingCart /> Venta Rápida</h2>
                    <button type="button" onClick={onClose}><FiX size={24} /></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción</label>
                        <input
                            type="text"
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 p-2 border rounded w-full"
                        />
                    </div>
                    <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-700">Precio Unitario</label>
                        <input
                            type="number"
                            id="price"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="mt-1 p-2 border rounded w-full"
                            placeholder="0"
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Cantidad</label>
                        <input
                            type="number"
                            id="quantity"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="mt-1 p-2 border rounded w-full"
                            min="1"
                            required
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-6">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded">Cancelar</button>
                    <button type="submit" className="py-2 px-4 bg-purple-600 text-white rounded">
                        Agregar al Carrito
                    </button>
                </div>
            </form>
        </div>
    );
};

export default QuickSaleModal;
