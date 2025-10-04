import React, { useState, useEffect, useMemo } from 'react';
import ProductForm from '../components/ProductForm';
import { FiPlusCircle, FiBox, FiEdit, FiTrash2, FiAlertCircle, FiChevronDown, FiChevronRight, FiDollarSign, FiTrendingUp, FiSearch } from 'react-icons/fi';
import useProductStore from '../store/useProductStore';

const ProductDetailView = ({ product }) => {
    if (!product) return null;
    return (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-2 ml-4 md:ml-10">
            <h4 className="font-bold text-gray-800">Detalles del Producto</h4>
            <p className="text-sm text-gray-600 mb-3">ID: {product.id} - Código: {product.code || 'N/A'}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className='space-y-2'>
                    {product.salePrices.map((salePrice, index) => {
                        const currentSalePrice = salePrice.price ?? 0;
                        const profit = currentSalePrice - product.purchasePrice;
                        const profitMargin = product.purchasePrice > 0 ? (profit / product.purchasePrice) * 100 : Infinity;
                        return (
                            <div key={index} className="bg-white p-3 rounded-md shadow-sm border">
                                <p className="font-semibold text-gray-700">{salePrice.name}: <span className="font-bold text-blue-600">${currentSalePrice.toFixed(2)}</span></p>
                                <div className={`flex items-center text-sm ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    <FiTrendingUp className="mr-1" />
                                    <span>Ganancia: ${profit.toFixed(2)}</span>
                                    <span className="ml-2 font-bold">({profitMargin === Infinity ? '∞' : profitMargin.toFixed(0)}%)</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className='space-y-2'>
                    <div className="bg-white p-3 rounded-md shadow-sm border">
                        <p className="font-semibold text-gray-700">Precio de Compra</p>
                        <div className="flex items-center text-sm text-gray-600">
                            <FiDollarSign className="mr-1" />
                            <span className="font-bold">${(product.purchasePrice ?? 0).toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="bg-white p-3 rounded-md shadow-sm border">
                        <p className="font-semibold text-gray-700">Stock Actual</p>
                        <div className={`flex items-center text-sm font-bold ${product.quantity <= product.lowStockThreshold ? 'text-red-500' : 'text-gray-800'}`}>
                            <FiBox className="mr-1" />
                            <span>{product.quantity} unidades</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


const InventoryPage = () => {
    const [showForm, setShowForm] = useState(false);
    const [productToEdit, setProductToEdit] = useState(null);
    const [openSections, setOpenSections] = useState({});
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilters, setActiveFilters] = useState({ brand: '', name: '', sortBy: '' });

    const { products, loading, error, fetchProducts, deleteProduct } = useProductStore();

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const uniqueBrands = useMemo(() => [...new Set(products.map(p => p.brand).filter(Boolean))].sort(), [products]);
    const uniqueNames = useMemo(() => [...new Set(products.map(p => p.name).filter(Boolean))].sort(), [products]);

    const filteredProducts = useMemo(() => {
        let result = [...products];

        if (searchTerm.trim()) {
            const searchWords = searchTerm.toLowerCase().split(' ').filter(word => word);
            result = result.filter(product => {
                const searchableString = `${product.brand || ''} ${product.name} ${product.subtype}`.toLowerCase();
                return searchWords.every(word => searchableString.includes(word));
            });
        }

        if (activeFilters.brand) {
            result = result.filter(p => p.brand === activeFilters.brand);
        }
        if (activeFilters.name) {
            result = result.filter(p => p.name === activeFilters.name);
        }

        if (activeFilters.sortBy === 'stock_asc') {
            result.sort((a, b) => a.quantity - b.quantity);
        } else if (activeFilters.sortBy === 'stock_desc') {
            result.sort((a, b) => b.quantity - a.quantity);
        } else if (activeFilters.sortBy === 'price_asc') {
            result.sort((a, b) => (a.salePrices[0]?.price ?? 0) - (b.salePrices[0]?.price ?? 0));
        } else if (activeFilters.sortBy === 'price_desc') {
            result.sort((a, b) => (b.salePrices[0]?.price ?? 0) - (a.salePrices[0]?.price ?? 0));
        }

        return result;
    }, [products, searchTerm, activeFilters]);

    const groupedProducts = useMemo(() => {
        if (activeFilters.sortBy) {
            return { 'Resultados del Filtro': { 'Todos': filteredProducts } };
        }
        const groups = {};
        filteredProducts.forEach(product => {
            const brand = (product.brand || 'Sin Marca').trim();
            const name = product.name;
            if (!groups[brand]) groups[brand] = {};
            if (!groups[brand][name]) groups[brand][name] = [];
            groups[brand][name].push(product);
        });
        return groups;
    }, [filteredProducts, activeFilters.sortBy]);

    useEffect(() => {
        if (searchTerm.trim() || activeFilters.brand || activeFilters.name || activeFilters.sortBy) {
            const newOpenSections = {};
            for (const brand in groupedProducts) {
                newOpenSections[brand] = true;
                for (const name in groupedProducts[brand]) {
                    newOpenSections[`${brand}-${name}`] = true;
                }
            }
            setOpenSections(newOpenSections);
        } else {
            setOpenSections({});
        }
    }, [searchTerm, groupedProducts, activeFilters]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setActiveFilters(prev => ({ ...prev, [name]: value }));
    };

    const toggleSection = (key) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSelectProduct = (productId) => {
        setSelectedProductId(prev => (prev === productId ? null : productId));
    };

    const handleEdit = (product) => {
        setProductToEdit(product);
        setShowForm(true);
    };

    const handleAddNew = () => {
        setProductToEdit(null);
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setProductToEdit(null);
    }

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
            await deleteProduct(id);
            if (selectedProductId === id) {
                setSelectedProductId(null);
            }
        }
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-full">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Inventario</h1>
                <button
                    onClick={handleAddNew}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg shadow hover:bg-blue-700 transition-colors"
                >
                    <FiPlusCircle />
                    <span>Agregar Producto</span>
                </button>
            </div>

            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-4">
                        <div className="relative">
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input type="text" placeholder="Buscar por nombre, línea, aroma..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border rounded-lg text-base focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                    </div>
                    <select name="brand" value={activeFilters.brand} onChange={handleFilterChange} className="w-full p-3 border rounded-lg bg-white">
                        <option value="">Todas las Marcas</option>
                        {uniqueBrands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                    <select name="name" value={activeFilters.name} onChange={handleFilterChange} className="w-full p-3 border rounded-lg bg-white">
                        <option value="">Todos los Tipos</option>
                        {uniqueNames.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                    <select name="sortBy" value={activeFilters.sortBy} onChange={handleFilterChange} className="w-full p-3 border rounded-lg bg-white col-span-1 md:col-span-2">
                        <option value="">Ordenar por...</option>
                        <option value="stock_asc">Stock (Menor a Mayor)</option>
                        <option value="stock_desc">Stock (Mayor a Menor)</option>
                        <option value="price_asc">Precio (Menor a Mayor)</option>
                        <option value="price_desc">Precio (Mayor a Menor)</option>
                    </select>
                </div>
            </div>

            {showForm && <ProductForm productToEdit={productToEdit} onClose={handleCloseForm} />}

            {loading && <div className="text-center py-10">Cargando productos...</div>}

            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert"><p><strong className="font-bold">Error:</strong> {error}</p></div>}

            {!loading && !error && (
                <div className="space-y-2">
                    {Object.keys(groupedProducts).length > 0 ? (
                        Object.keys(groupedProducts).map(brand => (
                            <div key={brand} className="bg-white rounded-lg shadow-sm">
                                <button onClick={() => toggleSection(brand)} className="w-full flex justify-between items-center p-4 font-bold text-lg text-left">
                                    <span>{brand}</span>
                                    {openSections[brand] ? <FiChevronDown /> : <FiChevronRight />}
                                </button>
                                {openSections[brand] && (
                                    <div className="px-4 pb-2">
                                        {Object.keys(groupedProducts[brand]).map(name => (
                                            <div key={name} className="border-t">
                                                <button onClick={() => toggleSection(`${brand}-${name}`)} className="w-full flex justify-between items-center py-3 px-2 font-semibold text-left">
                                                    <span>{name}</span>
                                                    {openSections[`${brand}-${name}`] ? <FiChevronDown /> : <FiChevronRight />}
                                                </button>
                                                {openSections[`${brand}-${name}`] && (
                                                    <div className='pl-4 pb-2'>
                                                        {groupedProducts[brand][name].map(product => (
                                                            <div key={product.id}>
                                                                <div className="flex items-center justify-between p-2 my-1 hover:bg-gray-100 rounded-md cursor-pointer" onClick={() => handleSelectProduct(product.id)}>
                                                                    <div className="flex-1">
                                                                        <p className="font-medium text-gray-800">{product.subtype || 'Producto base'}</p>
                                                                        <p className="text-sm text-gray-500 flex items-center">
                                                                            <span>Stock: {product.quantity}</span>
                                                                            <span className="mx-2 text-gray-300">|</span>
                                                                            <span className="font-semibold text-gray-700">
                                                                                ${(product.salePrices[0]?.price ?? 0).toFixed(2)}
                                                                            </span>
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <button onClick={(e) => { e.stopPropagation(); handleEdit(product); }} className="p-2 text-yellow-600 hover:bg-yellow-100 rounded-full" title="Editar"><FiEdit size={16} /></button>
                                                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }} className="p-2 text-red-600 hover:bg-red-100 rounded-full" title="Eliminar"><FiTrash2 size={16} /></button>
                                                                    </div>
                                                                </div>
                                                                {selectedProductId === product.id && <ProductDetailView product={product} />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center p-10 text-gray-500 bg-white rounded-lg shadow-sm">
                            <FiSearch size={40} className="mx-auto mb-2" />
                            No se encontraron productos que coincidan con tu búsqueda.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default InventoryPage;

