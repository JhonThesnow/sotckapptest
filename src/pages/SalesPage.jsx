import React, { useState, useMemo, useEffect, useRef } from 'react';
import useProductStore from '../store/useProductStore';
import useSalesStore from '../store/useSalesStore';
import { FiSearch, FiPlus, FiMinus, FiXCircle, FiShoppingCart, FiChevronLeft, FiChevronRight, FiCamera, FiPlusCircle } from 'react-icons/fi';
import CheckoutModal from '../components/CheckoutModal';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import QuickSaleModal from '../components/QuickSaleModal';
import { formatNumber } from '../utils/formatting';

const SalesPage = () => {
    const [showCartOnMobile, setShowCartOnMobile] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [showQuickSale, setShowQuickSale] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('Todas');
    const [selectedType, setSelectedType] = useState('Todos');
    const searchInputRef = useRef(null);

    // --- Paginación State ---
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 7;

    const { products, fetchProducts, loading: productsLoading } = useProductStore();
    const {
        cart,
        addItemToCart,
        removeItemFromCart,
        updateItemQuantity,
        currentPaymentMethod,
        setCurrentPaymentMethod,
        paymentMethods,
        fetchPaymentMethods
    } = useSalesStore();

    useEffect(() => {
        fetchProducts();
        fetchPaymentMethods();
    }, [fetchProducts, fetchPaymentMethods]);

    const brands = useMemo(() => {
        if (!products) return ['Todas'];
        const brandSet = new Set(products.map(p => p.brand || 'Sin Marca'));
        return ['Todas', ...Array.from(brandSet)];
    }, [products]);

    const productTypes = useMemo(() => {
        if (!products || selectedBrand === 'Todas') return ['Todos'];
        const typeSet = new Set(
            products
                .filter(p => (p.brand || 'Sin Marca') === selectedBrand)
                .map(p => p.name)
        );
        return ['Todos', ...Array.from(typeSet)];
    }, [products, selectedBrand]);

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        let tempProducts = [...products];
        if (selectedBrand !== 'Todas') {
            tempProducts = tempProducts.filter(p => (p.brand || 'Sin Marca') === selectedBrand);
        }
        if (selectedType !== 'Todos') {
            tempProducts = tempProducts.filter(p => p.name === selectedType);
        }
        if (searchTerm.trim()) {
            const lowercasedSearchTerm = searchTerm.toLowerCase();
            tempProducts = tempProducts.filter(product => {
                const searchableString = `${product.brand || ''} ${product.name} ${product.subtype} ${product.code || ''}`.toLowerCase();
                return searchableString.includes(lowercasedSearchTerm);
            });
        }
        return tempProducts;
    }, [products, searchTerm, selectedBrand, selectedType]);

    // --- Lógica de Paginación ---
    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredProducts, currentPage]);

    useEffect(() => {
        setCurrentPage(1); // Resetea a la página 1 cada vez que cambian los filtros
    }, [selectedBrand, selectedType, searchTerm]);


    const cartSubtotal = useMemo(() => {
        return cart.reduce((total, item) => {
            const price = item.salePrices[0]?.price || 0;
            return total + (price * item.quantity);
        }, 0);
    }, [cart]);

    const handleAddItem = (product) => {
        addItemToCart(product);
        setSearchTerm(''); // Limpia la búsqueda después de agregar
        if (window.innerWidth > 768) {
            searchInputRef.current?.focus();
        }
    };

    const onBarcodeDetected = (code) => {
        setShowScanner(false);
        const productFound = products.find(p => p.code && p.code.toLowerCase() === code.toLowerCase());
        if (productFound) {
            handleAddItem(productFound);
        } else {
            setSearchTerm('');
            if (window.innerWidth > 768) {
                searchInputRef.current?.focus();
            }
        }
    };

    return (
        <div className="flex flex-col md:grid md:grid-cols-3 md:gap-6 h-full p-4 md:p-6">
            {showCheckout && <CheckoutModal subtotal={cartSubtotal} preselectedPaymentMethod={currentPaymentMethod} onClose={() => setShowCheckout(false)} />}
            {showScanner && <BarcodeScannerModal onDetected={onBarcodeDetected} onClose={() => setShowScanner(false)} />}
            {showQuickSale && <QuickSaleModal onClose={() => setShowQuickSale(false)} />}


            <div className={`lg:col-span-2 bg-white p-4 rounded-lg shadow flex flex-col ${showCartOnMobile ? 'hidden' : 'flex'} md:flex`}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Seleccionar Productos</h2>
                    <button onClick={() => setShowQuickSale(true)} className="flex items-center gap-2 text-sm bg-purple-100 text-purple-700 py-2 px-3 rounded-lg hover:bg-purple-200">
                        <FiPlusCircle /> Venta Rápida
                    </button>
                </div>
                <div className="mb-4 space-y-2">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Buscar por nombre, código o escanear..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-12 py-3 border rounded-lg text-lg focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                            disabled={productsLoading}
                        />
                        <button onClick={() => setShowScanner(true)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600 p-1">
                            <FiCamera size={24} />
                        </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <select
                            value={selectedBrand}
                            onChange={(e) => { setSelectedBrand(e.target.value); setSelectedType('Todos'); }}
                            className="p-2 border rounded bg-white w-full sm:flex-1 disabled:bg-gray-100"
                            disabled={productsLoading}
                        >
                            {(brands || []).map(brand => <option key={brand} value={brand}>{brand}</option>)}
                        </select>
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            disabled={selectedBrand === 'Todas' || productsLoading}
                            className="p-2 border rounded bg-white w-full sm:flex-1 disabled:bg-gray-100"
                        >
                            {(productTypes || []).map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto space-y-2 pr-2">
                    {productsLoading ? <p className="text-center text-gray-500">Cargando productos...</p> : paginatedProducts.map(product => {
                        const itemInCart = cart.find(item => item.id === product.id);
                        return (
                            <div key={product.id} className="border rounded-lg p-3 flex justify-between items-center">
                                <div>
                                    <p className="font-bold">{product.name} - {product.subtype}</p>
                                    <p className="text-sm text-gray-500">
                                        Stock: {product.quantity} | ${formatNumber(product.salePrices[0]?.price || 0)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleAddItem(product)}
                                    disabled={product.quantity === 0}
                                    className={`flex items-center gap-2 py-2 px-4 rounded-lg transition-colors text-sm ${itemInCart ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'} disabled:bg-gray-100 disabled:text-gray-400`}
                                >
                                    <FiPlus size={16} />
                                    <span>{itemInCart ? `(${itemInCart.quantity}) Agregar` : 'Agregar'}</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
                {/* Controles de Paginación */}
                <div className="flex justify-center items-center gap-4 pt-4 mt-auto border-t">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                    >
                        <FiChevronLeft />
                    </button>
                    <span className="font-medium text-gray-700">Página {currentPage} de {totalPages}</span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                    >
                        <FiChevronRight />
                    </button>
                </div>
            </div>

            <div className={`bg-white p-4 rounded-lg shadow flex flex-col ${!showCartOnMobile ? 'hidden' : 'flex'} md:flex`}>
                <div className="flex items-center justify-between border-b pb-2 mb-4">
                    <button onClick={() => setShowCartOnMobile(false)} className="md:hidden p-2 -ml-2"><FiChevronLeft size={24} /></button>
                    <h2 className="text-2xl font-bold text-center flex-grow">Venta Actual</h2>
                    <div className="w-8 md:hidden"></div>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {cart.length > 0 ? cart.map(item => (
                        <div key={item.id} className="flex items-center gap-2 mb-4">
                            <div className="flex-grow">
                                <p className="font-semibold text-sm">{item.name}{item.subtype ? ` - ${item.subtype}` : ''}</p>
                                <p className="text-sm text-gray-600">${formatNumber(item.salePrices[0]?.price || 0)}</p>
                            </div>
                            <div className="flex items-center gap-1 border rounded-lg p-1">
                                <button onClick={() => updateItemQuantity(item.id, item.quantity - 1)} className="p-1"><FiMinus size={14} /></button>
                                <input type="number" value={item.quantity} onChange={(e) => updateItemQuantity(item.id, e.target.value)} className="w-10 text-center font-bold" />
                                <button onClick={() => updateItemQuantity(item.id, item.quantity + 1)} className="p-1"><FiPlus size={14} /></button>
                            </div>
                            <button onClick={() => removeItemFromCart(item.id)} className="text-red-500 p-1"><FiXCircle /></button>
                        </div>
                    )) : (
                        <div className="text-center pt-20 text-gray-500">
                            <FiShoppingCart size={48} className="mx-auto mb-4" />
                            <p>El carrito está vacío.</p>
                        </div>
                    )}
                </div>
                <div className="border-t pt-4">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago (Opcional)</label>
                        <select value={currentPaymentMethod || ''} onChange={(e) => setCurrentPaymentMethod(e.target.value)} className="p-2 border rounded bg-white w-full">
                            <option value="">Seleccionar...</option>
                            {(paymentMethods || []).map(method => <option key={method.id} value={method.name}>{method.name}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-between items-center text-xl font-bold mb-4">
                        <span>Subtotal:</span>
                        <span>${formatNumber(cartSubtotal)}</span>
                    </div>
                    <button onClick={() => setShowCheckout(true)} disabled={cart.length === 0} className="w-full bg-blue-600 text-white py-3 rounded-lg text-lg font-bold hover:bg-blue-700 disabled:bg-gray-400">
                        Enviar a Cobrar
                    </button>
                </div>
            </div>

            <button onClick={() => setShowCartOnMobile(true)} className="md:hidden fixed bottom-4 right-4 bg-blue-600 text-white rounded-full p-4 shadow-lg flex items-center gap-2">
                <FiShoppingCart />
                <span className="font-bold">{cart.length}</span>
                <FiChevronRight />
            </button>
        </div>
    );
};

export default SalesPage;