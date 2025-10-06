// src/components/ProductForm.jsx

import React, { useState, useEffect } from 'react';
import useProductStore from '../store/useProductStore.js';
import { FiX, FiPlus, FiTrash, FiArrowLeft, FiCamera } from 'react-icons/fi';
import BarcodeScannerModal from './BarcodeScannerModal.jsx';

const newVariation = {
    variationName: '',
    purchasePrice: '',
    quantity: '',
    code: '',
    salePrices: [{ name: 'Minorista', price: '' }],
    notifyLowStock: true,
    lowStockThreshold: 10,
};

const ProductForm = ({ productToEdit, onClose }) => {
    const { addBatchProducts, updateProduct } = useProductStore();

    const isEditMode = Boolean(productToEdit);
    const [step, setStep] = useState(1);
    const [template, setTemplate] = useState(null);

    const [commonData, setCommonData] = useState({});
    const [variations, setVariations] = useState([JSON.parse(JSON.stringify(newVariation))]);

    const [editData, setEditData] = useState(null);
    const [notifyLowStock, setNotifyLowStock] = useState(true);

    // State for barcode scanner
    const [showScanner, setShowScanner] = useState(false);
    const [scanningVariationIndex, setScanningVariationIndex] = useState(null);

    useEffect(() => {
        if (isEditMode) {
            setEditData({
                ...productToEdit,
                lowStockThreshold: productToEdit.lowStockThreshold == null ? 10 : productToEdit.lowStockThreshold,
            });
            setNotifyLowStock(productToEdit.lowStockThreshold > 0);
        }
    }, [productToEdit, isEditMode]);

    const handleBarcodeDetected = (scannedCode) => {
        setShowScanner(false);
        if (isEditMode) {
            setEditData(prev => ({ ...prev, code: scannedCode }));
        } else if (scanningVariationIndex !== null) {
            const newVariations = [...variations];
            newVariations[scanningVariationIndex].code = scannedCode;
            setVariations(newVariations);
            setScanningVariationIndex(null);
        }
    };


    const handleTemplateSelect = (selectedTemplate) => {
        setTemplate(selectedTemplate);
        if (selectedTemplate === 'unbranded') {
            setCommonData({ type: 'sin-marca', productType: '' });
        } else {
            setCommonData({ type: 'con-marca', brand: '', productType: '', productLine: '' });
        }
        setStep(2);
    };

    const handleCommonChange = (e) => {
        setCommonData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleVariationChange = (index, e) => {
        const { name, value, type, checked } = e.target;
        const newVariations = [...variations];
        const targetVariation = newVariations[index];

        if (type === 'checkbox') {
            targetVariation[name] = checked;
            if (name === 'notifyLowStock' && !checked) {
                targetVariation.lowStockThreshold = 0;
            } else if (name === 'notifyLowStock' && checked && (!targetVariation.lowStockThreshold || targetVariation.lowStockThreshold <= 0)) {
                targetVariation.lowStockThreshold = 10;
            }
        } else {
            targetVariation[name] = value;
        }

        setVariations(newVariations);
    };

    const handlePriceChange = (vIndex, pIndex, e) => {
        const newVariations = [...variations];
        newVariations[vIndex].salePrices[pIndex][e.target.name] = e.target.value;
        setVariations(newVariations);
    };

    const addPriceToVariation = (vIndex) => {
        const newVariations = [...variations];
        newVariations[vIndex].salePrices.push({ name: '', price: '' });
        setVariations(newVariations);
    };

    const removePriceFromVariation = (vIndex, pIndex) => {
        const newVariations = [...variations];
        newVariations[vIndex].salePrices.splice(pIndex, 1);
        setVariations(newVariations);
    };

    const addVariationRow = () => {
        setVariations([...variations, JSON.parse(JSON.stringify(newVariation))]);
    };

    const removeVariationRow = (index) => {
        setVariations(variations.filter((_, i) => i !== index));
    };

    const goBackToTemplates = () => {
        setStep(1);
        setTemplate(null);
        setVariations([JSON.parse(JSON.stringify(newVariation))]);
    }

    const handleEditChange = (e) => {
        setEditData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }

    const handleNotifyLowStockChange = (e) => {
        const isChecked = e.target.checked;
        setNotifyLowStock(isChecked);
        if (!isChecked) {
            setEditData(prev => ({ ...prev, lowStockThreshold: 0 }));
        } else {
            setEditData(prev => ({ ...prev, lowStockThreshold: productToEdit.lowStockThreshold > 0 ? productToEdit.lowStockThreshold : 10 }));
        }
    };

    const handleEditPriceChange = (pIndex, e) => {
        const newPrices = [...editData.salePrices];
        newPrices[pIndex][e.target.name] = e.target.value;
        setEditData(prev => ({ ...prev, salePrices: newPrices }));
    }

    const addPriceToEdit = () => {
        setEditData(prev => ({ ...prev, salePrices: [...prev.salePrices, { name: '', price: '' }] }));
    }

    const removePriceFromEdit = (pIndex) => {
        const newPrices = editData.salePrices.filter((_, i) => i !== pIndex);
        setEditData(prev => ({ ...prev, salePrices: newPrices }));
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isEditMode) {
            const finalEditData = {
                ...editData,
                purchasePrice: parseFloat(editData.purchasePrice),
                quantity: parseInt(editData.quantity, 10),
                salePrices: editData.salePrices.map(p => ({ ...p, price: parseFloat(p.price || 0) })),
                lowStockThreshold: notifyLowStock ? parseInt(editData.lowStockThreshold, 10) : 0,
            };
            await updateProduct(finalEditData.id, finalEditData);
        } else {
            const productsToCreate = variations.map(v => {
                let name, subtype;
                if (template === 'sahumerios') {
                    name = commonData.productType;
                    subtype = `${commonData.productLine} - ${v.variationName}`;
                } else if (template === 'velas' || template === 'unbranded') {
                    name = commonData.productType;
                    subtype = v.variationName;
                }
                return {
                    brand: commonData.brand || null, name, subtype, type: commonData.type,
                    purchasePrice: parseFloat(v.purchasePrice),
                    quantity: parseInt(v.quantity, 10),
                    code: v.code,
                    lowStockThreshold: v.notifyLowStock ? parseInt(v.lowStockThreshold, 10) || 10 : 0,
                    salePrices: v.salePrices.map(p => ({ ...p, price: parseFloat(p.price || 0) })),
                };
            });
            await addBatchProducts(productsToCreate);
        }
        onClose();
    };

    if (isEditMode) {
        if (!editData) return null;
        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                {showScanner && <BarcodeScannerModal onDetected={handleBarcodeDetected} onClose={() => setShowScanner(false)} />}
                <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">Editar Producto</h2>
                        <button onClick={onClose}><FiX size={24} /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input name="brand" value={editData.brand || ''} onChange={handleEditChange} placeholder="Marca" className="p-2 border rounded" />
                            <input name="name" value={editData.name} onChange={handleEditChange} placeholder="Nombre del Producto" className="p-2 border rounded" required />
                        </div>
                        <input name="subtype" value={editData.subtype} onChange={handleEditChange} placeholder="Subtipo / Variación" className="p-2 border rounded w-full" required />

                        <div>
                            <label htmlFor="code-edit" className="text-sm font-medium text-gray-700">Código (Opcional)</label>
                            <div className="relative mt-1">
                                <input
                                    id="code-edit"
                                    name="code"
                                    value={editData.code || ''}
                                    onChange={handleEditChange}
                                    placeholder="Escanear o ingresar código de barras"
                                    className="p-2 border rounded w-full pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowScanner(true)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-blue-600"
                                    aria-label="Escanear código de barras"
                                >
                                    <FiCamera size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="number" step="0.01" name="purchasePrice" value={editData.purchasePrice} onChange={handleEditChange} placeholder="Precio de compra" className="p-2 border rounded" required />
                            <input type="number" name="quantity" value={editData.quantity} onChange={handleEditChange} placeholder="Stock" className="p-2 border rounded" required />
                        </div>

                        <div className="p-3 border rounded-lg bg-gray-50">
                            <div className="flex items-center">
                                <input id="notify-edit" type="checkbox" checked={notifyLowStock} onChange={handleNotifyLowStockChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                <label htmlFor="notify-edit" className="ml-2 block text-sm font-medium text-gray-700">Notificar bajo stock</label>
                            </div>
                            {notifyLowStock && (
                                <div className="mt-2">
                                    <label htmlFor="threshold-edit" className="text-xs text-gray-600">Umbral de stock bajo</label>
                                    <input id="threshold-edit" type="number" name="lowStockThreshold" value={editData.lowStockThreshold} onChange={handleEditChange} className="p-2 border rounded w-full mt-1" placeholder="Ej: 10" />
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2">Precios de Venta</h3>
                            {editData.salePrices.map((p, index) => (
                                <div key={index} className="flex items-center gap-2 mb-2">
                                    <input name="name" value={p.name} onChange={(e) => handleEditPriceChange(index, e)} placeholder="Nombre (ej: Minorista)" className="p-2 border rounded w-1/3" />
                                    <input type="number" step="0.01" name="price" value={p.price || ''} onChange={(e) => handleEditPriceChange(index, e)} placeholder="Precio" className="p-2 border rounded w-1/3" />
                                    {editData.salePrices.length > 1 && <button type="button" onClick={() => removePriceFromEdit(index)} className="text-red-500 p-2 rounded hover:bg-red-100"><FiTrash /></button>}
                                </div>
                            ))}
                            <button type="button" onClick={addPriceToEdit} className="flex items-center gap-2 text-sm text-blue-600 hover:underline"><FiPlus /> Agregar precio</button>
                        </div>
                        <div className="flex justify-end gap-4 mt-6">
                            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded">Cancelar</button>
                            <button type="submit" className="py-2 px-4 bg-blue-600 text-white rounded">Guardar Cambios</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    if (step === 1) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold">Seleccionar Plantilla</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><FiX size={24} /></button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <button onClick={() => handleTemplateSelect('sahumerios')} className="text-left p-4 border rounded-lg hover:bg-gray-50">
                            <h3 className="font-bold">Marca {'>'} Tipo {'>'} Línea {'>'} Variación</h3>
                            <p className="text-sm text-gray-600">Ej: Aromanza {'>'} Sahumerios {'>'} Tibetanos {'>'} Palo Santo, Ruda...</p>
                        </button>
                        <button onClick={() => handleTemplateSelect('velas')} className="text-left p-4 border rounded-lg hover:bg-gray-50">
                            <h3 className="font-bold">Marca {'>'} Tipo {'>'} Variación</h3>
                            <p className="text-sm text-gray-600">Ej: Iluminarte {'>'} Velas de Noche {'>'} Rojas, Verdes...</p>
                        </button>
                        <button onClick={() => handleTemplateSelect('unbranded')} className="text-left p-4 border rounded-lg hover:bg-gray-50">
                            <h3 className="font-bold">Tipo {'>'} Variación</h3>
                            <p className="text-sm text-gray-600">Ej: Budas de Yeso {'>'} Buda Ojo Dorado, Buda Ojo Plateado...</p>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 2) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                {showScanner && <BarcodeScannerModal onDetected={handleBarcodeDetected} onClose={() => setShowScanner(false)} />}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                    <div className="flex justify-between items-center mb-4 border-b pb-3">
                        <div className="flex items-center gap-4">
                            <button onClick={goBackToTemplates} className="text-gray-600 hover:text-gray-900"><FiArrowLeft size={20} /></button>
                            <h2 className="text-xl sm:text-2xl font-bold">Cargar Producto</h2>
                        </div>
                        <button onClick={onClose} className="text-gray-600 hover:text-gray-900"><FiX size={24} /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2 sm:pr-4">
                        <div className="flex flex-col md:grid md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                            {template !== 'unbranded' && <input name="brand" placeholder="Nombre de la Marca" onChange={handleCommonChange} className="p-2 border rounded w-full" required />}
                            <input name="productType" placeholder="Tipo de Producto (Ej: Sahumerios)" onChange={handleCommonChange} className="p-2 border rounded w-full" required />
                            {template === 'sahumerios' && <input name="productLine" placeholder="Línea de Producto (Ej: Tibetanos)" onChange={handleCommonChange} className="p-2 border rounded w-full" />}
                        </div>

                        {variations.map((v, vIndex) => (
                            <div key={vIndex} className="flex flex-col gap-4 mb-4 p-3 border rounded-lg">
                                <div className="flex flex-col md:flex-row md:items-end gap-2">
                                    <div className="flex-grow">
                                        <label className="text-xs font-bold text-gray-600">Variación</label>
                                        <input name="variationName" placeholder="Ej: Palo Santo" value={v.variationName} onChange={e => handleVariationChange(vIndex, e)} className="p-2 border rounded w-full" required />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="text-xs font-bold text-gray-600">P. Compra</label>
                                            <input name="purchasePrice" type="number" step="0.01" placeholder="$" value={v.purchasePrice} onChange={e => handleVariationChange(vIndex, e)} className="p-2 border rounded w-full" required />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs font-bold text-gray-600">Stock</label>
                                            <input name="quantity" type="number" placeholder="Cant." value={v.quantity} onChange={e => handleVariationChange(vIndex, e)} className="p-2 border rounded w-full" required />
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <label className="text-xs font-bold text-gray-600">Código</label>
                                        <div className="relative flex items-center">
                                            <input name="code" placeholder="Opcional" value={v.code || ''} onChange={e => handleVariationChange(vIndex, e)} className="p-2 border rounded w-full pr-10" />
                                            <button
                                                type="button"
                                                onClick={() => { setScanningVariationIndex(vIndex); setShowScanner(true); }}
                                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-blue-600"
                                                aria-label="Escanear código de barras"
                                            >
                                                <FiCamera size={20} />
                                            </button>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => removeVariationRow(vIndex)} className="text-red-500 hover:bg-red-100 p-2 rounded-full self-center md:self-end"><FiTrash /></button>
                                </div>

                                <div className="mt-2 p-3 border rounded-lg bg-gray-50">
                                    <div className="flex items-center">
                                        <input id={`notify-${vIndex}`} type="checkbox" name="notifyLowStock" checked={v.notifyLowStock} onChange={(e) => handleVariationChange(vIndex, e)} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                        <label htmlFor={`notify-${vIndex}`} className="ml-2 block text-sm font-medium text-gray-700">Notificar bajo stock</label>
                                    </div>
                                    {v.notifyLowStock && (
                                        <div className="mt-2">
                                            <label htmlFor={`threshold-${vIndex}`} className="text-xs text-gray-600">Umbral de stock bajo</label>
                                            <input id={`threshold-${vIndex}`} type="number" name="lowStockThreshold" value={v.lowStockThreshold} onChange={(e) => handleVariationChange(vIndex, e)} className="p-2 border rounded w-full mt-1" placeholder="Ej: 10" />
                                        </div>
                                    )}
                                </div>

                                <div className="pl-2 border-l-2 border-gray-200 mt-2">
                                    {v.salePrices.map((p, pIndex) => (
                                        <div key={pIndex} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2">
                                            <input name="name" value={p.name} onChange={e => handlePriceChange(vIndex, pIndex, e)} placeholder="Nombre de Precio" className="p-2 border rounded flex-1" />
                                            <input name="price" type="number" step="0.01" value={p.price} onChange={e => handlePriceChange(vIndex, pIndex, e)} placeholder="Monto" className="p-2 border rounded flex-1" />
                                            {v.salePrices.length > 1 && <button type="button" onClick={() => removePriceFromVariation(vIndex, pIndex)} className="text-red-500 hover:bg-red-100 p-2 rounded-full self-start sm:self-center"><FiTrash size={14} /></button>}
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => addPriceToVariation(vIndex)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline"><FiPlus /> Agregar Precio</button>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={addVariationRow} className="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:underline"><FiPlus /> Agregar otra variación</button>
                        <div className="flex justify-end gap-4 mt-6 border-t pt-4">
                            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded hover:bg-gray-300">Cancelar</button>
                            <button type="submit" className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar Productos</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return null;
};

export default ProductForm;

