import React, { useState, useEffect, useMemo } from 'react';
import useProductStore from '../store/useProductStore';
import { FiSearch, FiPercent, FiDollarSign, FiChevronDown, FiChevronUp, FiTrash } from 'react-icons/fi';
import { formatDateOnly } from '../utils/formatting';


const PriceIncreases = () => {
    const { products, increasePrices, fetchPriceIncreaseHistory, priceIncreaseHistory, deletePriceIncrease } = useProductStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [increaseType, setIncreaseType] = useState('percentage'); // 'percentage' or 'fixed'
    const [increaseValue, setIncreaseValue] = useState('');
    const [targetPrice, setTargetPrice] = useState({ purchase: false, retail: true });
    const [currentPage, setCurrentPage] = useState(1);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [openDays, setOpenDays] = useState({});
    const [openEntries, setOpenEntries] = useState({});

    useEffect(() => {
        if (isHistoryOpen) {
            fetchPriceIncreaseHistory(currentPage, 5);
        }
    }, [currentPage, fetchPriceIncreaseHistory, isHistoryOpen]);

    const groupedHistory = useMemo(() => {
        return priceIncreaseHistory.entries.reduce((acc, entry) => {
            const date = formatDateOnly(entry.date);
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(entry);
            return acc;
        }, {});
    }, [priceIncreaseHistory.entries]);

    const handleToggleProduct = (product) => {
        const isSelected = selectedProducts.some(p => p.id === product.id);
        const firstSelectedPrice = selectedProducts[0]?.salePrices[0]?.price;

        if (isSelected) {
            setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
        } else {
            if (selectedProducts.length > 0 && product.salePrices[0]?.price !== firstSelectedPrice) {
                alert('Solo puedes seleccionar productos con el mismo precio minorista.');
                return;
            }
            setSelectedProducts([...selectedProducts, product]);
        }
    };

    const handleApplyIncrease = async () => {
        if (selectedProducts.length === 0 || !increaseValue) {
            alert('Selecciona productos y define un valor de aumento.');
            return;
        }

        if (window.confirm('¿Confirmas el aumento de precio para los productos seleccionados?')) {
            await increasePrices({
                products: selectedProducts,
                type: increaseType,
                value: parseFloat(increaseValue),
                targets: targetPrice
            });
            setSelectedProducts([]);
            setIncreaseValue('');
            fetchPriceIncreaseHistory(1, 5);
        }
    };

    const toggleDay = (date) => {
        setOpenDays(prev => ({ ...prev, [date]: !prev[date] }));
    };

    const toggleEntry = (entryId) => {
        setOpenEntries(prev => ({ ...prev, [entryId]: !prev[entryId] }));
    };

    const handleDelete = (id) => {
        if (window.confirm('¿Estás seguro de eliminar este registro del historial? Esta acción no se puede deshacer.')) {
            deletePriceIncrease(id);
        }
    };

    const filteredProducts = products.filter(product =>
        `${product.brand || ''} ${product.name} ${product.subtype}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <h2 className="text-xl font-bold mb-4">Aumentar Precios</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <button onClick={() => setIncreaseType('percentage')} className={`w-full p-2 border rounded ${increaseType === 'percentage' ? 'bg-blue-500 text-white' : ''}`}>Porcentaje</button>
                    </div>
                    <div>
                        <button onClick={() => setIncreaseType('fixed')} className={`w-full p-2 border rounded ${increaseType === 'fixed' ? 'bg-blue-500 text-white' : ''}`}>Monto Fijo</button>
                    </div>
                </div>
                <div className="relative mb-4">
                    {increaseType === 'percentage' ? <FiPercent className="absolute left-3 top-1/2 -translate-y-1/2" /> : <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2" />}
                    <input
                        type="number"
                        placeholder={`Valor de aumento ${increaseType === 'percentage' ? '(%)' : '($)'}`}
                        value={increaseValue}
                        onChange={(e) => setIncreaseValue(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg"
                    />
                </div>
                <div className="flex gap-4 mb-4">
                    <label><input type="checkbox" checked={targetPrice.purchase} onChange={e => setTargetPrice(p => ({ ...p, purchase: e.target.checked }))} /> P. Compra</label>
                    <label><input type="checkbox" checked={targetPrice.retail} onChange={e => setTargetPrice(p => ({ ...p, retail: e.target.checked }))} /> Minorista</label>
                </div>
                <div className="relative mb-4">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar productos para aumentar precio..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg"
                    />
                </div>
                <div className="max-h-64 overflow-y-auto border rounded-lg p-2 space-y-2">
                    {filteredProducts.map(product => (
                        <div key={product.id} className="flex items-center p-2 bg-gray-50 rounded">
                            <input
                                type="checkbox"
                                className="mr-4"
                                checked={selectedProducts.some(p => p.id === product.id)}
                                onChange={() => handleToggleProduct(product)}
                            />
                            <div className="flex-grow">
                                <p className="font-semibold">{product.name} - {product.subtype}</p>
                                <p className="text-sm text-gray-500">P. Compra: ${product.purchasePrice} | Minorista: ${product.salePrices[0]?.price}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={handleApplyIncrease} className="w-full mt-4 bg-orange-500 text-white py-2 rounded-lg font-bold">
                    Aplicar Aumento
                </button>
            </div>
            <div>
                <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className="w-full flex justify-between items-center p-4 font-bold text-lg text-left bg-white rounded-lg shadow-sm">
                    <h3>Historial de Aumentos</h3>
                    {isHistoryOpen ? <FiChevronUp /> : <FiChevronDown />}
                </button>
                {isHistoryOpen && (
                    <div className="bg-white p-4 rounded-lg shadow mt-2">
                        {Object.keys(groupedHistory).map(date => (
                            <div key={date} className="border-b py-2">
                                <button onClick={() => toggleDay(date)} className="w-full flex justify-between items-center font-semibold text-left">
                                    <span>{date}</span>
                                    {openDays[date] ? <FiChevronUp /> : <FiChevronDown />}
                                </button>
                                {openDays[date] && (
                                    <div className="pl-4 mt-2 space-y-2">
                                        {groupedHistory[date].map(entry => (
                                            <div key={entry.id} className="border-t py-2 group">
                                                <div className="flex justify-between items-center">
                                                    <button onClick={() => toggleEntry(entry.id)} className="flex-grow flex justify-between items-center text-sm font-semibold text-left">
                                                        <span>Aumento de {JSON.parse(entry.details).type === 'percentage' ? `${JSON.parse(entry.details).value}%` : `$${JSON.parse(entry.details).value}`}</span>
                                                        {openEntries[entry.id] ? <FiChevronUp /> : <FiChevronDown />}
                                                    </button>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex">
                                                        <button onClick={() => handleDelete(entry.id)} title="Eliminar" className="p-2 text-gray-500 hover:text-red-600"><FiTrash /></button>
                                                    </div>
                                                </div>
                                                {openEntries[entry.id] && (
                                                    <ul className="list-disc pl-5 text-xs mt-2">
                                                        {JSON.parse(entry.products).map(p => (
                                                            <li key={p.id}>
                                                                {p.name} - {p.subtype}:
                                                                {p.oldPurchasePrice !== p.newPurchasePrice && <span> Compra: ${p.oldPurchasePrice} -{'>'} ${p.newPurchasePrice}</span>}
                                                                {p.oldRetailPrice !== p.newRetailPrice && <span> Minorista: ${p.oldRetailPrice} -{'>'} ${p.newRetailPrice}</span>}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        <div className="flex justify-between mt-4">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</button>
                            <span>Página {currentPage} de {priceIncreaseHistory.totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(priceIncreaseHistory.totalPages, p + 1))} disabled={currentPage === priceIncreaseHistory.totalPages}>Siguiente</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PriceIncreases;