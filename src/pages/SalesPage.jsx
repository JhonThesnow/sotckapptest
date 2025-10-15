import React, { useState, useEffect, useMemo, useCallback } from 'react';
import useProductStore from '../store/useProductStore.js';
import useSalesStore from '../store/useSalesStore.js';
import { formatNumber } from '../utils/formatting.js';
import CheckoutModal from '../components/CheckoutModal.jsx';
import QuickSaleModal from '../components/QuickSaleModal.jsx';
import BarcodeScannerModal from '../components/BarcodeScannerModal.jsx';
import { FiShoppingCart, FiSearch, FiX, FiPlus, FiMinus, FiTrash2, FiCamera, FiDollarSign } from 'react-icons/fi';

const SalesPage = () => {
    const { products, fetchProducts, loading: productsLoading, brands, types, subtypes } = useProductStore();
    const { pendingSale, startNewSale, addItemToSale, updateItemQuantity, applyDiscount, savePendingSale, deleteSale, loading: salesLoading, error: salesError, addQuickSaleItem } = useSalesStore();

    const cart = pendingSale?.items || [];

    const [searchTerm, setSearchTerm] = useState('');
    const [filterBrand, setFilterBrand] = useState('Todas');
    const [filterType, setFilterType] = useState('Todos');
    const [filterSubtype, setFilterSubtype] = useState('Todos');

    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [showQuickSaleModal, setShowQuickSaleModal] = useState(false);
    const [showBarcodeScannerModal, setShowBarcodeScannerModal] = useState(false);

    useEffect(() => {
        if (products.length === 0) {
            fetchProducts();
        }
    }, [products, fetchProducts]);

    useEffect(() => {
        if (!pendingSale) {
            startNewSale();
        }
    }, [pendingSale, startNewSale]);

    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const matchesSearch = searchTerm === '' ||
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.code.includes(searchTerm);

            const matchesBrand = filterBrand === 'Todas' || product.brand === filterBrand;
            const matchesType = filterType === 'Todos' || product.type === filterType;
            const matchesSubtype = filterSubtype === 'Todos' || product.subtype === filterSubtype;

            return matchesSearch && matchesBrand && matchesType && matchesSubtype;
        });
    }, [products, searchTerm, filterBrand, filterType, filterSubtype]);

    const cartSubtotal = useMemo(() => {
        // CORRECCIÓN CLAVE: Aseguramos que item.salePrices exista y sea un array antes de acceder a [0]
        return cart.reduce((total, item) => {
            // Manejar items de venta rápida (que no tienen salePrices)
            if (item.productId && typeof item.productId === 'string' && item.productId.startsWith('qs-')) {
                return total + (item.unitPrice * item.quantity);
            }
            // Productos normales
            const price = item.salePrices?.[0]?.price || item.unitPrice || 0;
            return total + (price * item.quantity);
        }, 0);
    }, [cart]);

    const handleAddItem = useCallback((product) => {
        const productSalePrice = product.salePrices?.[0]?.price || 0;
        if (productSalePrice === 0) {
            alert("No se puede agregar el producto. No tiene precio de venta asignado.");
            return;
        }
        addItemToSale(product, 1);
    }, [addItemToSale]);

    const handleBarcodeScanned = useCallback((code) => {
        setShowBarcodeScannerModal(false);
        const product = products.find(p => p.code === code);
        if (product) {
            handleAddItem(product);
        } else {
            alert(`Producto con código ${code} no encontrado.`);
        }
    }, [products, handleAddItem]);

    const handleSaveAndCheckout = async () => {
        // Si la venta aún no tiene ID (es nueva), la guardamos primero
        if (!pendingSale.id) {
            const result = await savePendingSale();
            if (result.success) {
                // Ahora que tiene ID, podemos abrir el modal de checkout
                setShowCheckoutModal(true);
            } else {
                alert(`Error al guardar la venta: ${result.error}`);
            }
        } else {
            // Si ya tiene ID, simplemente abrimos el modal
            setShowCheckoutModal(true);
        }
    };

    const handleRemoveItem = (productId) => {
        const item = cart.find(i => i.productId === productId);
        if (item && item.quantity > 1) {
            updateItemQuantity(productId, item.quantity - 1);
        } else {
            updateItemQuantity(productId, 0);
        }
    };

    const handleRemoveAllItem = (productId) => {
        updateItemQuantity(productId, 0);
    };

    const handleCancelSale = async () => {
        if (!pendingSale || cart.length === 0) {
            startNewSale();
            return;
        }

        if (window.confirm("¿Estás seguro de que quieres cancelar esta venta? Los productos del carrito se perderán.")) {
            if (pendingSale.id) {
                // Si la venta está guardada como pendiente, la borramos de la DB
                await deleteSale(pendingSale.id, 'pending');
            }
            startNewSale(); // Iniciamos una nueva venta
        }
    };

    const handleSetDiscount = (e) => {
        const value = e.target.value;
        const discount = value === '' ? 0 : Math.max(0, Math.min(100, Number(value)));
        applyDiscount(discount);
    };


    if (productsLoading && products.length === 0) {
        return <div className="p-4 text-center">Cargando productos...</div>;
    }

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
            {/* Panel de Productos */}
            <div className="w-2/3 p-4 flex flex-col">
                <h1 className="text-3xl font-bold mb-4 text-gray-800">Punto de Venta</h1>

                {/* Controles y Filtros */}
                <div className="flex flex-col md:flex-row gap-3 mb-4 sticky top-0 bg-white p-3 rounded-lg shadow-sm z-10">
                    <div className="flex-grow relative">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, marca o código..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <button onClick={() => setShowBarcodeScannerModal(true)} className="flex items-center justify-center bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition">
                        <FiCamera size={20} className="mr-2" />Escanear
                    </button>
                    <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className="py-2 px-4 border rounded-lg bg-white">
                        <option value="Todas">Todas las Marcas</option>
                        {brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="py-2 px-4 border rounded-lg bg-white">
                        <option value="Todos">Todos los Tipos</option>
                        {types.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                </div>

                {/* Lista de Productos */}
                <div className="flex-grow overflow-y-auto pr-2">
                    {filteredProducts.length === 0 ? (
                        <p className="text-center text-gray-500 p-8">No se encontraron productos.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredProducts.map(product => {
                                const itemInCart = cart.find(item => item.productId === product.id);
                                const currentPrice = product.salePrices?.[0]?.price || 0;

                                return (
                                    <div key={product.id} className="border rounded-xl p-4 flex justify-between items-center bg-white hover:shadow-md transition duration-200">
                                        <div>
                                            <p className="font-bold text-gray-800">{product.name} - {product.subtype}</p>
                                            <p className="text-sm text-gray-500">
                                                Stock: <span className={product.quantity <= product.lowStockThreshold ? 'text-red-500 font-semibold' : ''}>{product.quantity}</span>
                                            </p>
                                            <p className="text-lg font-extrabold text-blue-600">
                                                {product.salePrices?.[0]?.name}: ${formatNumber(currentPrice)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleAddItem(product)}
                                            // RECOMENDACIÓN ADICIONAL IMPLEMENTADA: Deshabilitar si no hay stock o no tiene precio válido
                                            disabled={product.quantity <= 0 || currentPrice === 0}
                                            className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors text-white ${itemInCart ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'} disabled:bg-gray-300 disabled:cursor-not-allowed`}
                                            title={currentPrice === 0 ? 'Producto sin precio de venta' : product.quantity <= 0 ? 'Sin stock' : 'Agregar'}
                                        >
                                            <FiPlus size={20} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Panel de Carrito */}
            <div className="w-1/3 bg-white border-l flex flex-col p-4 shadow-2xl">
                <h2 className="text-2xl font-bold mb-4 flex items-center text-gray-800">
                    <FiShoppingCart className="mr-2" /> Carrito
                </h2>

                <div className="flex-grow overflow-y-auto space-y-3 pr-2">
                    {cart.length === 0 ? (
                        <p className="text-center text-gray-500 p-8">El carrito está vacío. Agrega productos o una venta rápida.</p>
                    ) : (
                        cart.map((item) => {
                            // CORRECCIÓN: Manejar precio de venta rápida
                            const price = item.productId.toString().startsWith('qs-')
                                ? item.unitPrice
                                : item.salePrices?.[0]?.price || item.unitPrice || 0;

                            return (
                                <div key={item.productId} className="flex justify-between items-center p-3 border rounded-lg bg-gray-50">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold truncate text-gray-800">{item.fullName}</p>
                                        <p className="text-sm text-gray-500">${formatNumber(price)} x {item.quantity}</p>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => handleRemoveItem(item.productId)}
                                            className="p-1 text-red-500 hover:text-red-700 bg-red-100 rounded"
                                            title="Restar cantidad"
                                        >
                                            <FiMinus size={16} />
                                        </button>
                                        <span className="font-bold text-gray-700 w-6 text-center">{item.quantity}</span>
                                        <button
                                            onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                                            className="p-1 text-green-500 hover:text-green-700 bg-green-100 rounded"
                                            title="Agregar cantidad"
                                        >
                                            <FiPlus size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleRemoveAllItem(item.productId)}
                                            className="p-1 text-gray-500 hover:text-gray-700 bg-gray-200 rounded ml-2"
                                            title="Eliminar de la lista"
                                        >
                                            <FiTrash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Resumen de la Venta */}
                <div className="mt-4 pt-4 border-t space-y-2">
                    <div className="flex justify-between text-gray-600">
                        <span>Subtotal:</span>
                        <span className="font-semibold">${formatNumber(cartSubtotal)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                        <label className="text-gray-600" htmlFor="discount">Descuento (%):</label>
                        <input
                            id="discount"
                            type="number"
                            value={pendingSale?.discount || 0}
                            onChange={handleSetDiscount}
                            className="w-20 text-right py-1 px-2 border rounded-lg"
                            min="0"
                            max="100"
                        />
                    </div>
                    {pendingSale?.discount > 0 && (
                        <div className="flex justify-between text-red-500 text-sm">
                            <span>Descuento aplicado:</span>
                            <span className="font-semibold">-${formatNumber(cartSubtotal * (pendingSale.discount / 100))}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-center text-2xl font-extrabold text-blue-700 pt-2 border-t mt-2">
                        <span>TOTAL:</span>
                        <span>${formatNumber(pendingSale?.totalAmount || 0)}</span>
                    </div>
                </div>

                {/* Acciones del Carrito */}
                <div className="mt-4 space-y-3">
                    <button
                        onClick={handleSaveAndCheckout}
                        disabled={cart.length === 0 || salesLoading}
                        className="w-full py-3 bg-green-600 text-white font-bold rounded-lg flex items-center justify-center hover:bg-green-700 transition disabled:bg-green-300"
                    >
                        <FiDollarSign className="mr-2" size={20} />
                        {salesLoading ? 'Cargando...' : 'Guardar y Cobrar'}
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowQuickSaleModal(true)}
                            className="flex-1 py-3 bg-indigo-500 text-white font-bold rounded-lg flex items-center justify-center hover:bg-indigo-600 transition disabled:bg-indigo-300"
                        >
                            <FiPlus className="mr-1" /> Venta Rápida
                        </button>
                        <button
                            onClick={handleCancelSale}
                            disabled={salesLoading}
                            className="flex-1 py-3 bg-red-500 text-white font-bold rounded-lg flex items-center justify-center hover:bg-red-600 transition disabled:bg-red-300"
                        >
                            <FiTrash2 className="mr-1" /> Cancelar
                        </button>
                    </div>
                </div>
            </div>

            {/* Modales */}
            {showCheckoutModal && pendingSale && (
                <CheckoutModal
                    sale={pendingSale}
                    onClose={() => setShowCheckoutModal(false)}
                />
            )}
            {showQuickSaleModal && (
                <QuickSaleModal
                    onClose={() => setShowQuickSaleModal(false)}
                    onAddQuickSale={addQuickSaleItem}
                />
            )}
            {showBarcodeScannerModal && (
                <BarcodeScannerModal
                    onClose={() => setShowBarcodeScannerModal(false)}
                    onScan={handleBarcodeScanned}
                />
            )}
        </div>
    );
};

export default SalesPage;