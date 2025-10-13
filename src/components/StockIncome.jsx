import React, { useState, useEffect, useMemo } from 'react';
import useProductStore from '../store/useProductStore';
import { FiSearch, FiChevronDown, FiChevronUp, FiEdit, FiTrash } from 'react-icons/fi';
import { formatDateOnly } from '../utils/formatting';

const StockIncome = () => {
    const { products, batchRestock, fetchStockEntriesHistory, stockEntriesHistory, deleteStockEntry, updateStockEntry, fetchProducts } = useProductStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProducts, setSelectedProducts] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [openEntries, setOpenEntries] = useState({});

    // Estado para controlar la edición de una entrada existente
    const [editingEntry, setEditingEntry] = useState(null);

    // --- NUEVO: Estado para la paginación de la selección ---
    const [selectionPage, setSelectionPage] = useState(1);
    const SELECTION_ITEMS_PER_PAGE = 5;

    // Cargar todos los productos para la búsqueda y edición
    useEffect(() => {
        fetchProducts({ limit: 9999 });
    }, [fetchProducts]);

    useEffect(() => {
        if (isHistoryOpen) {
            fetchStockEntriesHistory(currentPage, 10);
        }
    }, [currentPage, fetchStockEntriesHistory, isHistoryOpen]);

    // --- NUEVO: Resetear la página de selección si los productos cambian ---
    useEffect(() => {
        setSelectionPage(1);
    }, [Object.keys(selectedProducts).length]);


    const handleConfirm = async () => {
        const productsToProcess = Object.entries(selectedProducts)
            .filter(([, quantity]) => quantity > 0)
            .map(([productId, quantity]) => {
                const product = products.find(p => p.id === parseInt(productId, 10));
                return {
                    id: product.id,
                    name: product.name,
                    subtype: product.subtype,
                    quantity: quantity
                };
            });

        if (productsToProcess.length === 0) {
            alert('No has seleccionado ningún producto.');
            return;
        }

        if (editingEntry) {
            // Lógica de actualización
            if (window.confirm('¿Confirmas los cambios en este ingreso de stock?')) {
                const originalProducts = JSON.parse(editingEntry.products);
                await updateStockEntry(editingEntry.id, originalProducts, productsToProcess);
                setEditingEntry(null);
            }
        } else {
            // Lógica de creación
            const productsToRestock = productsToProcess.map(p => ({ ...p, amountToAdd: p.quantity }));
            if (window.confirm('¿Estás seguro de que quieres agregar estos productos al stock?')) {
                await batchRestock(productsToRestock);
            }
        }

        setSelectedProducts({});
        fetchStockEntriesHistory(1, 10);
    };

    const handleEditClick = (entry) => {
        const productsFromEntry = JSON.parse(entry.products);
        const productsToLoad = productsFromEntry.reduce((acc, p) => {
            acc[p.id] = p.quantity;
            return acc;
        }, {});

        setSelectedProducts(productsToLoad);
        setEditingEntry(entry);

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingEntry(null);
        setSelectedProducts({});
    };

    const handleDelete = (id) => {
        if (window.confirm('¿Estás seguro de eliminar este registro del historial? Esta acción no se puede deshacer.')) {
            deleteStockEntry(id);
        }
    };

    const toggleEntry = (entryId) => {
        setOpenEntries(prev => ({ ...prev, [entryId]: !prev[entryId] }));
    };

    const filteredProducts = useMemo(() => {
        if (!searchTerm) return [];
        return products.filter(product =>
            `${product.brand || ''} ${product.name} ${product.subtype}`.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, searchTerm]);

    const productsInSelection = useMemo(() => {
        return Object.keys(selectedProducts)
            .map(id => products.find(p => p.id === parseInt(id)))
            .filter(Boolean);
    }, [selectedProducts, products]);

    // --- NUEVO: Lógica de paginación para la lista de productos seleccionados ---
    const totalSelectionPages = Math.ceil(productsInSelection.length / SELECTION_ITEMS_PER_PAGE);
    const paginatedProductsInSelection = useMemo(() => {
        const startIndex = (selectionPage - 1) * SELECTION_ITEMS_PER_PAGE;
        const endIndex = startIndex + SELECTION_ITEMS_PER_PAGE;
        return productsInSelection.slice(startIndex, endIndex);
    }, [productsInSelection, selectionPage]);

    return (
        <div>
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <h2 className="text-xl font-bold mb-4">
                    {editingEntry ? `Editando Ingreso del ${formatDateOnly(editingEntry.date)}` : 'Ingresar Stock'}
                </h2>
                <div className="relative mb-4">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar producto para agregar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg"
                    />
                </div>
                {searchTerm && (
                    <div className="max-h-64 overflow-y-auto border rounded-lg p-2 space-y-2 mb-4">
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
                )}

                {productsInSelection.length > 0 && (
                    <div className="mt-4 p-3 border rounded-lg bg-gray-50">
                        <h3 className="font-bold mb-2">Productos en este ingreso:</h3>
                        <div className="space-y-2">
                            {paginatedProductsInSelection.map(product => (
                                <div key={product.id} className="flex justify-between items-center p-2">
                                    <span>{product.name} - {product.subtype}</span>
                                    <span>Cantidad: {selectedProducts[product.id]}</span>
                                </div>
                            ))}
                        </div>
                        {totalSelectionPages > 1 && (
                            <div className="flex justify-center items-center gap-4 pt-2 mt-2 border-t">
                                <button onClick={() => setSelectionPage(p => Math.max(1, p - 1))} disabled={selectionPage === 1} className="px-3 py-1 text-xs rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50">Anterior</button>
                                <span className="text-xs font-medium">Página {selectionPage} de {totalSelectionPages}</span>
                                <button onClick={() => setSelectionPage(p => Math.min(totalSelectionPages, p + 1))} disabled={selectionPage === totalSelectionPages} className="px-3 py-1 text-xs rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50">Siguiente</button>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                    <button onClick={handleConfirm} className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-bold hover:bg-green-700 transition-colors">
                        {editingEntry ? 'Confirmar Cambios' : 'Confirmar Ingreso'}
                    </button>
                    {editingEntry && (
                        <button onClick={handleCancelEdit} className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg font-bold hover:bg-gray-600 transition-colors">
                            Cancelar Edición
                        </button>
                    )}
                </div>
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
                                        <button onClick={() => handleEditClick(entry)} title="Editar" className="p-2 text-gray-500 hover:text-blue-600"><FiEdit /></button>
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
                        {stockEntriesHistory.totalPages > 1 && (
                            <div className="flex justify-between mt-4">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-gray-200 rounded">Anterior</button>
                                <span>Página {currentPage} de {stockEntriesHistory.totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(stockEntriesHistory.totalPages, p + 1))} disabled={currentPage === stockEntriesHistory.totalPages} className="px-4 py-2 bg-gray-200 rounded">Siguiente</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockIncome;