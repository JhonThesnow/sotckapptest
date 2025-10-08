import React, { useState, useEffect } from 'react';
import useProductStore from '../store/useProductStore';
import { FiSearch, FiPlus, FiChevronDown, FiChevronUp, FiEdit, FiTrash } from 'react-icons/fi';
import EditStockEntryModal from './EditStockEntryModal';
import { formatDateOnly } from '../utils/formatting';

const StockIncome = () => {
    const { products, batchRestock, fetchStockEntriesHistory, stockEntriesHistory, deleteStockEntry } = useProductStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProducts, setSelectedProducts] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [openEntries, setOpenEntries] = useState({});
    const [editingEntry, setEditingEntry] = useState(null);

    useEffect(() => {
        if (isHistoryOpen) {
            fetchStockEntriesHistory(currentPage, 5);
        }
    }, [currentPage, fetchStockEntriesHistory, isHistoryOpen]);

    const handleConfirmRestock = async () => {
        const productsToRestock = Object.entries(selectedProducts)
            .filter(([, quantity]) => quantity > 0)
            .map(([productId, quantity]) => {
                const product = products.find(p => p.id === parseInt(productId, 10));
                return {
                    id: product.id,
                    amountToAdd: quantity,
                    name: product.name,
                    subtype: product.subtype
                };
            });

        if (productsToRestock.length === 0) {
            alert('No has seleccionado ningún producto para agregar al stock.');
            return;
        }

        if (window.confirm('¿Estás seguro de que quieres agregar estos productos al stock?')) {
            await batchRestock(productsToRestock);
            setSelectedProducts({});
            fetchStockEntriesHistory(1, 5); // Refresh history
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('¿Estás seguro de eliminar este registro del historial? Esta acción no se puede deshacer.')) {
            deleteStockEntry(id);
        }
    };

    const toggleEntry = (entryId) => {
        setOpenEntries(prev => ({ ...prev, [entryId]: !prev[entryId] }));
    };

    const filteredProducts = products.filter(product =>
        `${product.brand || ''} ${product.name} ${product.subtype}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            {editingEntry && <EditStockEntryModal entry={editingEntry} onClose={() => setEditingEntry(null)} />}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <h2 className="text-xl font-bold mb-4">Ingresar Stock</h2>
                <div className="relative mb-4">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar producto para agregar stock..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg"
                    />
                </div>
                <div className="max-h-64 overflow-y-auto border rounded-lg p-2 space-y-2">
                    {filteredProducts.map(product => (
                        <div key={product.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                                <p className="font-semibold">{product.name} - {product.subtype}</p>
                                <p className="text-sm text-gray-500">Actual: {product.quantity}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    className="w-20 p-1 border rounded text-center"
                                    value={selectedProducts[product.id] || ''}
                                    onChange={(e) => setSelectedProducts(prev => ({ ...prev, [product.id]: parseInt(e.target.value, 10) || 0 }))}
                                    placeholder="Cant."
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={handleConfirmRestock} className="w-full mt-4 bg-green-600 text-white py-2 rounded-lg font-bold">
                    Confirmar Ingreso de Stock
                </button>
            </div>

            <div>
                <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className="w-full flex justify-between items-center p-4 font-bold text-lg text-left bg-white rounded-lg shadow-sm">
                    <h3>Historial de Ingresos</h3>
                    {isHistoryOpen ? <FiChevronUp /> : <FiChevronDown />}
                </button>
                {isHistoryOpen && (
                    <div className="bg-white p-4 rounded-lg shadow mt-2">
                        {stockEntriesHistory.entries.map(entry => (
                            <div key={entry.id} className="border-b py-2 group">
                                <div className="flex justify-between items-center">
                                    <button onClick={() => toggleEntry(entry.id)} className="flex-grow flex justify-between items-center font-semibold text-left">
                                        <span>{formatDateOnly(entry.date)}</span>
                                        {openEntries[entry.id] ? <FiChevronUp /> : <FiChevronDown />}
                                    </button>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex">
                                        <button onClick={() => setEditingEntry(entry)} title="Editar" className="p-2 text-gray-500 hover:text-blue-600"><FiEdit /></button>
                                        <button onClick={() => handleDelete(entry.id)} title="Eliminar" className="p-2 text-gray-500 hover:text-red-600"><FiTrash /></button>
                                    </div>
                                </div>
                                {openEntries[entry.id] && (
                                    <ul className="list-disc pl-5 text-sm mt-2">
                                        {JSON.parse(entry.products).map(p => (
                                            <li key={p.id}>{p.name} - {p.subtype}: {p.quantity} unidades</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                        <div className="flex justify-between mt-4">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</button>
                            <span>Página {currentPage} de {stockEntriesHistory.totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(stockEntriesHistory.totalPages, p + 1))} disabled={currentPage === stockEntriesHistory.totalPages}>Siguiente</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockIncome;