const express = require('express');
const cors = require('cors');
const db = require('./database.js');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// --- Endpoint para el Dashboard ---
app.get('/api/dashboard-summary', (req, res) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const salesSql = `SELECT finalAmount FROM sales WHERE status = 'completed' AND date >= ? AND date <= ?`;
    const lowStockSql = `SELECT * FROM products WHERE quantity <= lowStockThreshold AND lowStockThreshold > 0 ORDER BY quantity ASC LIMIT 5`;
    const recentMovementsSql = `SELECT * FROM account_movements ORDER BY date DESC LIMIT 5`;

    Promise.all([
        new Promise((resolve, reject) => db.all(salesSql, [todayStart.toISOString(), todayEnd.toISOString()], (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(lowStockSql, [], (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(recentMovementsSql, [], (err, rows) => err ? reject(err) : resolve(rows)))
    ]).then(([salesToday, lowStockProducts, recentMovements]) => {
        const totalRevenueToday = salesToday.reduce((sum, s) => sum + s.finalAmount, 0);
        const salesCountToday = salesToday.length;

        res.json({
            data: {
                totalRevenueToday,
                salesCountToday,
                lowStockProducts: lowStockProducts.map(p => ({ ...p, salePrices: JSON.parse(p.salePrices || '[]') })),
                recentMovements
            }
        });
    }).catch(err => res.status(500).json({ error: err.message }));
});


// --- Endpoints de PRODUCTOS (CON PAGINACIÓN) ---
app.get('/api/products', (req, res) => {
    const { page = 1, limit = 10, brand, name, sortBy, searchTerm } = req.query;
    const offset = (page - 1) * limit;

    let whereClauses = [];
    let params = [];

    if (brand && brand !== 'Todas') {
        whereClauses.push("brand = ?");
        params.push(brand);
    }
    if (name && name !== 'Todos') {
        whereClauses.push("name = ?");
        params.push(name);
    }
    if (searchTerm) {
        whereClauses.push("(name LIKE ? OR subtype LIKE ? OR brand LIKE ? OR code LIKE ?)");
        const term = `%${searchTerm}%`;
        params.push(term, term, term, term);
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let orderBy = 'ORDER BY brand, name';
    if (sortBy) {
        switch (sortBy) {
            case 'stock_asc': orderBy = 'ORDER BY quantity ASC'; break;
            case 'stock_desc': orderBy = 'ORDER BY quantity DESC'; break;
            case 'price_asc': orderBy = `ORDER BY json_extract(salePrices, '$[0].price') ASC`; break;
            case 'price_desc': orderBy = `ORDER BY json_extract(salePrices, '$[0].price') DESC`; break;
        }
    }

    const countSql = `SELECT COUNT(*) as count FROM products ${where}`;
    const dataSql = `SELECT * FROM products ${where} ${orderBy} LIMIT ? OFFSET ?`;

    db.get(countSql, params, (err, row) => {
        if (err) return res.status(500).json({ "error": err.message });

        const totalProducts = row.count;
        const totalPages = Math.ceil(totalProducts / limit);

        db.all(dataSql, [...params, limit, offset], (err, rows) => {
            if (err) return res.status(500).json({ "error": err.message });

            const products = rows.map(p => ({ ...p, salePrices: JSON.parse(p.salePrices || '[]') }));

            res.json({
                message: "success",
                data: products,
                totalPages,
                currentPage: parseInt(page, 10),
            });
        });
    });
});


app.post('/api/products/batch', (req, res) => {
    const products = req.body;
    if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ "error": "Se requiere un array de productos." });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const sql = `INSERT INTO products (code, name, type, brand, subtype, quantity, purchasePrice, salePrices, lowStockThreshold) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const stmt = db.prepare(sql);

        for (const product of products) {
            const { code, name, type, brand, subtype, quantity, purchasePrice, salePrices, lowStockThreshold } = product;
            stmt.run(
                code || null,
                name,
                type,
                brand || null,
                subtype || null,
                quantity,
                purchasePrice,
                JSON.stringify(salePrices),
                lowStockThreshold
            );
        }

        stmt.finalize(err => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Error al finalizar la carga de productos', details: err.message });
            }
            db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Error al confirmar la transacción', details: commitErr.message });
                }
                res.status(201).json({ "message": "Productos agregados exitosamente", "inserted": products.length });
            });
        });
    });
});


app.post('/api/products/:id/restock', (req, res) => {
    const { id } = req.params;
    const { amountToAdd } = req.body;
    if (!amountToAdd || amountToAdd <= 0) return res.status(400).json({ "error": "La cantidad debe ser un número positivo." });

    const sql = `UPDATE products SET quantity = quantity + ? WHERE id = ?`;
    db.run(sql, [amountToAdd, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Stock actualizado' });
    });
});
app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { code, name, type, brand, subtype, quantity, purchasePrice, salePrices, lowStockThreshold } = req.body;
    const sql = `UPDATE products SET code = ?, name = ?, type = ?, brand = ?, subtype = ?, quantity = ?, purchasePrice = ?, salePrices = ?, lowStockThreshold = ? WHERE id = ?`;
    const params = [code, name, type, brand, subtype, quantity, purchasePrice, JSON.stringify(salePrices), lowStockThreshold, id];
    db.run(sql, params, function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ "message": "success", "changes": this.changes });
    });
});
app.delete('/api/products/:id', (req, res) => {
    db.run('DELETE FROM products WHERE id = ?', req.params.id, function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ "message": "deleted", "changes": this.changes });
    });
});


// --- Nuevos Endpoints de INVENTARIO ---

app.post('/api/products/batch-restock', (req, res) => {
    const { products } = req.body; // Array de { id, amountToAdd, name, subtype }
    if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ error: "Se requiere un array de productos." });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stockUpdateSql = `UPDATE products SET quantity = quantity + ? WHERE id = ?`;
        const stmt = db.prepare(stockUpdateSql);

        for (const product of products) {
            stmt.run(product.amountToAdd, product.id);
        }

        stmt.finalize(err => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Error al actualizar el stock', details: err.message });
            }

            const historyProducts = products.map(p => ({ id: p.id, name: p.name, subtype: p.subtype, quantity: p.amountToAdd }));
            const historySql = `INSERT INTO stock_entries (date, products) VALUES (?, ?)`;
            db.run(historySql, [new Date().toISOString(), JSON.stringify(historyProducts)], function (err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Error al registrar la entrada de stock', details: err.message });
                }

                db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Error al confirmar la transacción', details: commitErr.message });
                    }
                    res.status(200).json({ message: "Stock actualizado y registrado exitosamente." });
                });
            });
        });
    });
});


app.get('/api/stock-entry-history', (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const offset = (page - 1) * limit;

    const dataSql = `SELECT * FROM stock_entries ORDER BY date DESC LIMIT ? OFFSET ?`;
    const countSql = `SELECT COUNT(*) as count FROM stock_entries`;

    Promise.all([
        new Promise((resolve, reject) => db.all(dataSql, [limit, offset], (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.get(countSql, (err, row) => err ? reject(err) : resolve(row.count)))
    ]).then(([entries, total]) => {
        res.json({
            entries,
            totalPages: Math.ceil(total / limit)
        });
    }).catch(err => res.status(500).json({ error: err.message }));
});

app.post('/api/products/increase-prices', (req, res) => {
    const { products, type, value, targets } = req.body;
    const productIds = products.map(p => p.id);

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const productsForHistory = [];
        const updatePromises = products.map(originalProduct => {
            return new Promise((resolve, reject) => {
                let { purchasePrice, salePrices } = originalProduct;

                const oldPurchasePrice = purchasePrice;
                const oldRetailPrice = salePrices[0].price;

                let newPurchasePrice = oldPurchasePrice;
                let newRetailPrice = oldRetailPrice;

                if (targets.purchase) {
                    newPurchasePrice = type === 'percentage'
                        ? oldPurchasePrice * (1 + value / 100)
                        : oldPurchasePrice + value;
                }
                if (targets.retail) {
                    newRetailPrice = type === 'percentage'
                        ? oldRetailPrice * (1 + value / 100)
                        : oldRetailPrice + value;
                }

                const newSalePrices = [{ ...salePrices[0], price: newRetailPrice }];

                db.run('UPDATE products SET purchasePrice = ?, salePrices = ? WHERE id = ?', [newPurchasePrice, JSON.stringify(newSalePrices), originalProduct.id], function (err) {
                    if (err) return reject(err);

                    productsForHistory.push({
                        id: originalProduct.id,
                        name: originalProduct.name,
                        subtype: originalProduct.subtype,
                        oldPurchasePrice: oldPurchasePrice.toFixed(2),
                        newPurchasePrice: newPurchasePrice.toFixed(2),
                        oldRetailPrice: oldRetailPrice.toFixed(2),
                        newRetailPrice: newRetailPrice.toFixed(2),
                    });
                    resolve();
                });
            });
        });

        Promise.all(updatePromises).then(() => {
            const historySql = `INSERT INTO price_increases (date, details, products) VALUES (?, ?, ?)`;
            const details = JSON.stringify({ type, value, targets });

            db.run(historySql, [new Date().toISOString(), details, JSON.stringify(productsForHistory)], (err) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Error al registrar el aumento de precios' });
                }

                db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Error al confirmar la transacción' });
                    }
                    res.status(200).json({ message: 'Precios actualizados y registrados' });
                });
            });
        }).catch(err => {
            db.run('ROLLBACK');
            res.status(500).json({ error: 'Error al actualizar productos', details: err.message });
        });
    });
});


app.get('/api/price-increase-history', (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const offset = (page - 1) * limit;

    const dataSql = `SELECT * FROM price_increases ORDER BY date DESC LIMIT ? OFFSET ?`;
    const countSql = `SELECT COUNT(*) as count FROM price_increases`;

    Promise.all([
        new Promise((resolve, reject) => db.all(dataSql, [limit, offset], (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.get(countSql, (err, row) => err ? reject(err) : resolve(row.count)))
    ]).then(([entries, total]) => {
        res.json({
            entries,
            totalPages: Math.ceil(total / limit)
        });
    }).catch(err => res.status(500).json({ error: err.message }));
});

app.delete('/api/stock-entry-history/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM stock_entries WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Entrada de historial eliminada.' });
    });
});

app.delete('/api/price-increase-history/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM price_increases WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Aumento de historial eliminado.' });
    });
});

app.put('/api/stock-entry-history/:id', (req, res) => {
    const { id } = req.params;
    const { products: updatedProducts, originalProducts } = req.body;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const reversalPromises = originalProducts.map(p => {
            return new Promise((resolve, reject) => {
                db.run('UPDATE products SET quantity = quantity - ? WHERE id = ?', [p.quantity, p.id], err => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });

        Promise.all(reversalPromises).then(() => {
            const applicationPromises = updatedProducts.map(p => {
                return new Promise((resolve, reject) => {
                    db.run('UPDATE products SET quantity = quantity + ? WHERE id = ?', [p.quantity, p.id], err => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            });

            Promise.all(applicationPromises).then(() => {
                db.run('UPDATE stock_entries SET products = ? WHERE id = ?', [JSON.stringify(updatedProducts), id], err => {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: "Error al actualizar el historial" });
                    }
                    db.run('COMMIT', commitErr => {
                        if (commitErr) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: "Error al confirmar la transacción" });
                        }
                        res.status(200).json({ message: "Ingreso de stock actualizado" });
                    });
                });
            }).catch(err => {
                db.run('ROLLBACK');
                res.status(500).json({ error: 'Error al aplicar el nuevo stock', details: err.message });
            });
        }).catch(err => {
            db.run('ROLLBACK');
            res.status(500).json({ error: 'Error al revertir el stock original', details: err.message });
        });
    });
});


// --- Endpoints de VENTAS ---
app.post('/api/sales', (req, res) => {
    const { items, subtotal, discount, totalAmount, paymentMethod } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'La venta debe contener al menos un producto.' });
    }
    const sql = `INSERT INTO sales (date, items, subtotal, discount, totalAmount, status, paymentMethod) VALUES (?, ?, ?, ?, ?, 'pending', ?)`;
    const params = [new Date().toISOString(), JSON.stringify(items), subtotal, discount, totalAmount, paymentMethod || null];
    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: 'Error al crear la venta pendiente', details: err.message });
        res.status(201).json({ message: 'Venta pendiente creada exitosamente', saleId: this.lastID });
    });
});

app.get('/api/sales', (req, res) => {
    const sql = "SELECT * FROM sales ORDER BY date DESC";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json({ "message": "success", "data": rows });
    });
});

app.put('/api/sales/:id/complete', (req, res) => {
    const { id } = req.params;
    const { paymentMethod, finalDiscountPercentage, accountId } = req.body; // Recibir accountId

    if (!accountId) {
        return res.status(400).json({ error: "No se proporcionó una cuenta para la venta." });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.get('SELECT * FROM sales WHERE id = ? AND status = "pending"', [id], (err, sale) => {
            if (err || !sale) {
                db.run('ROLLBACK');
                return res.status(404).json({ error: 'Venta pendiente no encontrada' });
            }
            const finalAmount = sale.totalAmount - (sale.totalAmount * ((finalDiscountPercentage || 0) / 100));
            const items = JSON.parse(sale.items);
            // Actualizar la venta para incluir el accountId
            const updateSaleSql = `UPDATE sales SET status = 'completed', paymentMethod = ?, finalDiscount = ?, finalAmount = ?, date = ?, accountId = ? WHERE id = ?`;
            db.run(updateSaleSql, [paymentMethod, (finalDiscountPercentage || 0), finalAmount, new Date().toISOString(), accountId, id], function (err) {
                if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Error al actualizar la venta', details: err.message }); }

                const updatePromises = items.map(item => new Promise((resolve, reject) => {
                    if (!item.productId) return resolve();
                    const stockSql = `UPDATE products SET quantity = quantity - ? WHERE id = ? AND quantity >= ?`;
                    db.run(stockSql, [item.quantity, item.productId, item.quantity], function (err) {
                        if (err || this.changes === 0) return reject(new Error(`Stock insuficiente para el producto ID ${item.productId}`));
                        resolve();
                    });
                }));

                Promise.all(updatePromises).then(() => {
                    db.run('COMMIT');
                    res.status(200).json({ message: 'Venta completada y stock actualizado' });
                }).catch(error => {
                    db.run('ROLLBACK');
                    res.status(400).json({ error: 'Error al actualizar el stock', details: error.message });
                });
            });
        });
    });
});


app.post('/api/sales/history/:id/cancel', (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) {
        return res.status(400).json({ error: "Se requiere un motivo de cancelación." });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.get("SELECT * FROM sales WHERE id = ? AND status = 'completed'", [id], (err, sale) => {
            if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
            if (!sale) { db.run('ROLLBACK'); return res.status(404).json({ error: 'Venta no encontrada o no está completada.' }); }
            if (!sale.accountId) { db.run('ROLLBACK'); return res.status(400).json({ error: 'La venta no tiene una cuenta asociada para revertir el movimiento.' }); }

            const items = JSON.parse(sale.items);
            const updateSaleSql = `UPDATE sales SET status = 'canceled', cancellationReason = ? WHERE id = ?`;

            db.run(updateSaleSql, [reason, id], function (err) {
                if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Error al actualizar el estado de la venta.' }); }

                const movementReason = `Cancelación Venta #${id}: ${reason}`;
                const addMovementSql = `INSERT INTO account_movements (date, type, amount, reason, accountId) VALUES (?, 'withdrawal', ?, ?, ?)`;

                db.run(addMovementSql, [new Date().toISOString(), sale.finalAmount, movementReason, sale.accountId], (err) => {
                    if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Error al registrar el movimiento en la cuenta.' }); }

                    const stockPromises = items.map(item => new Promise((resolve, reject) => {
                        if (!item.productId) return resolve();
                        const restockSql = `UPDATE products SET quantity = quantity + ? WHERE id = ?`;
                        db.run(restockSql, [item.quantity, item.productId], (err) => {
                            if (err) reject(err); else resolve();
                        });
                    }));

                    Promise.all(stockPromises)
                        .then(() => {
                            db.run('COMMIT');
                            res.json({ message: 'Venta cancelada, stock devuelto y movimiento registrado.' });
                        })
                        .catch((err) => {
                            db.run('ROLLBACK');
                            res.status(500).json({ error: 'Error al devolver el stock.', details: err.message });
                        });
                });
            });
        });
    });
});

app.put('/api/sales/history/:id', (req, res) => {
    const { id } = req.params;
    const { finalAmount, paymentMethod } = req.body;
    if (finalAmount === undefined || !paymentMethod) return res.status(400).json({ error: "Monto final y método de pago son requeridos." });
    const sql = `UPDATE sales SET finalAmount = ?, paymentMethod = ? WHERE id = ? AND status = 'completed'`;
    db.run(sql, [finalAmount, paymentMethod, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Venta completada no encontrada o sin cambios.' });
        res.json({ message: 'Venta actualizada exitosamente' });
    });
});

app.delete('/api/sales/pending/:id', (req, res) => {
    db.run(`DELETE FROM sales WHERE id = ? AND status = 'pending'`, req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Venta pendiente eliminada' });
    });
});

app.delete('/api/sales/history/:id', (req, res) => {
    db.run(`DELETE FROM sales WHERE id = ? AND (status = 'completed' OR status = 'canceled')`, req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Venta no encontrada en el historial.' });
        res.json({ message: 'Venta del historial eliminada', changes: this.changes });
    });
});

app.put('/api/sales/history/:id/tax', (req, res) => {
    const { id } = req.params;
    const { taxPercentage } = req.body;
    if (typeof taxPercentage !== 'number' || taxPercentage < 0 || taxPercentage > 100) return res.status(400).json({ error: "Porcentaje de impuesto inválido." });
    db.get('SELECT finalAmount FROM sales WHERE id = ?', [id], (err, sale) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!sale) return res.status(404).json({ error: 'Venta no encontrada.' });
        const taxAmount = (sale.finalAmount * taxPercentage) / 100;
        db.run(`UPDATE sales SET appliedTax = ? WHERE id = ?`, [taxAmount, id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Impuesto aplicado' });
        });
    });
});

// --- Endpoints de REPORTES ---
app.get('/api/reports/monthly-summary', (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: "startDate and endDate are required." });
    const salesSql = `SELECT * FROM sales WHERE (status = 'completed' OR status = 'canceled') AND date >= ? AND date <= ?`;
    const expensesSql = `SELECT * FROM expenses WHERE date >= ? AND date <= ?`;
    Promise.all([
        new Promise((resolve, reject) => db.all(salesSql, [startDate, endDate], (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(expensesSql, [startDate, endDate], (err, rows) => err ? reject(err) : resolve(rows)))
    ]).then(([sales, expenses]) => {
        const parsedSales = sales.map(s => ({ ...s, items: JSON.parse(s.items) }));
        let totalRevenue = 0;
        let totalProfit = 0;
        const completedSales = parsedSales.filter(s => s.status === 'completed');
        completedSales.forEach(s => {
            totalRevenue += s.finalAmount;
            const costOfGoods = s.items.reduce((acc, i) => acc + (i.purchasePrice * i.quantity), 0);
            totalProfit += s.finalAmount - costOfGoods;
        });
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalTaxes = completedSales.reduce((sum, s) => sum + (s.appliedTax || 0), 0);
        const netProfit = totalProfit - totalExpenses - totalTaxes;
        res.json({
            data: {
                totalRevenue, totalProfit, totalExpenses, netProfit,
                sales: parsedSales,
                expenses
            }
        });
    }).catch(err => res.status(500).json({ error: err.message }));
});

// Helper function to process sales data for a given period
const processReportData = (sales, productMap) => {
    let totalRevenue = 0;
    let totalProductsSold = 0;
    let grossProfit = 0;
    const salesByDay = {};
    const productData = {};
    const revenueByBrand = {};
    const revenueByName = {};

    sales.forEach(sale => {
        const saleDate = sale.date.split('T')[0];
        totalRevenue += sale.finalAmount;

        if (!salesByDay[saleDate]) {
            salesByDay[saleDate] = { sales: 0, items: 0 };
        }
        salesByDay[saleDate].sales += sale.finalAmount;

        const items = JSON.parse(sale.items);
        items.forEach(item => {
            if (!item.productId) return; // Skip quick sale items

            totalProductsSold += item.quantity;
            salesByDay[saleDate].items += item.quantity;

            const itemRevenue = item.unitPrice * item.quantity;
            const itemCost = (item.purchasePrice || 0) * item.quantity;
            const itemProfit = itemRevenue - itemCost;
            grossProfit += itemProfit;

            const productInfo = productMap.get(item.productId);

            if (!productData[item.fullName]) {
                productData[item.fullName] = { name: item.fullName, quantity: 0, revenue: 0, profit: 0 };
            }
            productData[item.fullName].quantity += item.quantity;
            productData[item.fullName].revenue += itemRevenue;
            productData[item.fullName].profit += itemProfit;

            const brand = productInfo?.brand || 'Sin Marca';
            const name = productInfo?.name || 'Varios';

            if (!revenueByBrand[brand]) revenueByBrand[brand] = 0;
            revenueByBrand[brand] += itemRevenue;

            if (!revenueByName[name]) revenueByName[name] = 0;
            revenueByName[name] += itemRevenue;
        });
    });

    const topProducts = Object.values(productData)
        .sort((a, b) => b.quantity - a.quantity);

    return {
        summary: {
            totalRevenue,
            totalProductsSold,
            totalSales: sales.length,
            grossProfit,
            profitMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
        },
        salesByDay,
        topProducts,
        revenueByBrand: Object.entries(revenueByBrand).map(([name, value]) => ({ name, value })),
        revenueByName: Object.entries(revenueByName).map(([name, value]) => ({ name, value })),
    };
};

app.post('/api/sales-report-data', async (req, res) => {
    try {
        const { startDate, endDate, names = [], brands = [], lines = [], compare } = req.body;

        const products = await new Promise((resolve, reject) => {
            db.all('SELECT id, name, brand, subtype FROM products', [], (err, rows) => err ? reject(err) : resolve(rows));
        });
        const productMap = new Map(products.map(p => [p.id, p]));

        const getSalesForPeriod = (start, end) => new Promise((resolve, reject) => {
            let salesQuery = `
                SELECT s.id, s.date, s.finalAmount, s.items
                FROM sales s
                WHERE s.status = 'completed' AND s.date >= ? AND s.date <= ?
            `;
            let params = [start, end];

            let productFilterClauses = [];
            let filterParams = [];

            if (names.length > 0) {
                productFilterClauses.push(`p.name IN (${names.map(() => '?').join(',')})`);
                filterParams.push(...names);
            }
            if (brands.length > 0) {
                productFilterClauses.push(`p.brand IN (${brands.map(() => '?').join(',')})`);
                filterParams.push(...brands);
            }
            if (lines.length > 0) {
                const lineClauses = lines.map(() => `p.subtype LIKE ?`);
                productFilterClauses.push(`(${lineClauses.join(' OR ')})`);
                filterParams.push(...lines.map(line => `${line}%`));
            }

            if (productFilterClauses.length > 0) {
                salesQuery += `
                    AND s.id IN (
                        SELECT s2.id
                        FROM sales s2, json_each(s2.items) AS item
                        JOIN products p ON p.id = CAST(json_extract(item.value, '$.productId') AS INTEGER)
                        WHERE ${productFilterClauses.join(' AND ')}
                    )
                `;
                params.push(...filterParams);
            }

            db.all(salesQuery, params, (err, sales) => err ? reject(err) : resolve(sales));
        });

        const currentSales = await getSalesForPeriod(startDate, endDate);
        const currentPeriodData = processReportData(currentSales, productMap);

        let previousPeriodData = null;
        if (compare) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diff = end.getTime() - start.getTime();
            const prevStart = new Date(start.getTime() - diff - 1);
            const prevEnd = new Date(start.getTime() - 1);
            const previousSales = await getSalesForPeriod(prevStart.toISOString(), prevEnd.toISOString());
            previousPeriodData = processReportData(previousSales, productMap);
        }

        res.json({ currentPeriod: currentPeriodData, previousPeriod: previousPeriodData });

    } catch (err) {
        res.status(500).json({ error: "Database error", details: err.message });
    }
});


// --- Endpoints de CUENTA ---
app.get('/api/accounts', (req, res) => {
    db.all("SELECT * FROM accounts", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.get('/api/movement-categories', (req, res) => {
    db.all("SELECT * FROM movement_categories", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// CORREGIDO Y MEJORADO
app.get('/api/account/summary', (req, res) => {
    const { startDate, endDate, accountId } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ error: "Fechas de inicio y fin son requeridas." });
    }

    const baseParams = [startDate, endDate];
    let accountFilter = '';
    let queryParams = [...baseParams];

    if (accountId) {
        accountFilter = ' AND accountId = ?';
        queryParams.push(accountId);
    }

    const salesSql = `SELECT finalAmount FROM sales WHERE status = 'completed' AND date >= ? AND date <= ? ${accountFilter}`;
    const expensesSql = `SELECT amount FROM expenses WHERE date >= ? AND date <= ? ${accountFilter}`;
    const movementsSql = `SELECT type, amount FROM account_movements WHERE date >= ? AND date <= ? ${accountFilter}`;

    Promise.all([
        new Promise((resolve, reject) => db.all(salesSql, queryParams, (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(expensesSql, queryParams, (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(movementsSql, queryParams, (err, rows) => err ? reject(err) : resolve(rows))),
    ]).then(([sales, expenses, movements]) => {
        const totalSales = sales.reduce((sum, s) => sum + s.finalAmount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalDeposits = movements.filter(m => m.type === 'deposit').reduce((sum, m) => sum + m.amount, 0);
        const totalWithdrawals = movements.filter(m => m.type === 'withdrawal').reduce((sum, m) => sum + m.amount, 0);

        const totalIncome = totalSales + totalDeposits;
        const totalOutcome = totalExpenses + totalWithdrawals;

        res.json({
            data: {
                totalIncome,
                totalOutcome,
                periodResult: totalIncome - totalOutcome,
            }
        });
    }).catch(err => res.status(500).json({ error: err.message }));
});


app.get('/api/accounts/:id/cash-closing-data', (req, res) => {
    const { id } = req.params;

    db.get('SELECT date FROM cash_closings WHERE accountId = ? ORDER BY date DESC LIMIT 1', [id], (err, lastClosing) => {
        if (err) return res.status(500).json({ error: err.message });

        const startDate = lastClosing ? lastClosing.date : new Date(0).toISOString();
        const endDate = new Date().toISOString();

        const salesSql = `SELECT SUM(finalAmount) as total FROM sales WHERE accountId = ? AND paymentMethod = 'Efectivo' AND status = 'completed' AND date > ? AND date <= ?`;
        const movementsSql = `SELECT type, SUM(amount) as total FROM account_movements WHERE accountId = ? AND date > ? AND date <= ? GROUP BY type`;

        Promise.all([
            new Promise((resolve, reject) => db.get(salesSql, [id, startDate, endDate], (err, row) => err ? reject(err) : resolve(row.total || 0))),
            new Promise((resolve, reject) => db.all(movementsSql, [id, startDate, endDate], (err, rows) => err ? reject(err) : resolve(rows))),
        ]).then(([salesTotal, movements]) => {
            const deposits = movements.find(m => m.type === 'deposit')?.total || 0;
            const withdrawals = movements.find(m => m.type === 'withdrawal')?.total || 0;

            const expected = salesTotal + deposits - withdrawals;

            res.json({
                data: {
                    lastClosingDate: startDate,
                    salesTotal,
                    deposits,
                    withdrawals,
                    expected
                }
            });
        }).catch(err => res.status(500).json({ error: err.message }));
    });
});

app.post('/api/cash-closings', (req, res) => {
    const { accountId, expected, counted, difference, notes } = req.body;
    const sql = `INSERT INTO cash_closings (accountId, date, expected, counted, difference, notes) VALUES (?, ?, ?, ?, ?, ?)`;
    const params = [accountId, new Date().toISOString(), expected, counted, difference, notes];

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: "Cierre de caja guardado exitosamente", id: this.lastID });
    });
});

app.get('/api/cash-closings', (req, res) => {
    const { startDate, endDate, accountId } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ error: "Fechas de inicio y fin son requeridas." });
    }

    let sql = `
        SELECT cc.*, a.name as accountName 
        FROM cash_closings cc
        JOIN accounts a ON a.id = cc.accountId
        WHERE cc.date >= ? AND cc.date <= ?`;
    let params = [startDate, endDate];

    if (accountId) {
        sql += " AND cc.accountId = ?";
        params.push(accountId);
    }
    sql += " ORDER BY cc.date DESC";

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});


app.delete('/api/account/movements/:id', (req, res) => {
    db.run('DELETE FROM account_movements WHERE id = ?', req.params.id, function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Movimiento no encontrado.' });
        res.json({ message: "Movimiento eliminado", changes: this.changes });
    });
});

app.put('/api/account/movements/:id', (req, res) => {
    const { id } = req.params;
    const { amount, reason, type } = req.body;
    if (!amount || !reason || !type) return res.status(400).json({ error: 'Faltan datos para actualizar.' });
    const sql = `UPDATE account_movements SET amount = ?, reason = ?, type = ? WHERE id = ?`;
    db.run(sql, [amount, reason, type, id], function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Movimiento no encontrado.' });
        res.json({ message: "Movimiento actualizado", changes: this.changes });
    });
});


// --- OTROS Endpoints ---
app.post('/api/expenses', (req, res) => {
    const { description, amount, accountId, categoryId } = req.body;
    if (!description || !amount || amount <= 0 || !accountId || !categoryId) {
        return res.status(400).json({ "error": "Todos los campos son requeridos." });
    }
    db.run(`INSERT INTO expenses (date, description, amount, accountId, categoryId) VALUES (?, ?, ?, ?, ?)`,
        [new Date().toISOString(), description, amount, accountId, categoryId],
        function (err) {
            if (err) return res.status(400).json({ "error": err.message });
            res.status(201).json({ "data": { id: this.lastID, ...req.body } });
        });
});

app.get('/api/payment-methods', (req, res) => {
    db.all("SELECT * FROM payment_methods", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.post('/api/account/movements', (req, res) => {
    const { type, amount, reason, accountId, categoryId } = req.body;
    if (!type || !amount || !reason || !accountId || !categoryId) {
        return res.status(400).json({ error: 'Faltan datos para crear el movimiento.' });
    }
    db.run("INSERT INTO account_movements (date, type, amount, reason, accountId, categoryId) VALUES (?, ?, ?, ?, ?, ?)",
        [new Date().toISOString(), type, amount, reason, accountId, categoryId],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.status(201).json({ id: this.lastID });
        });
});

app.get('/api/account/movements', (req, res) => {
    const { startDate, endDate, accountId } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: "Fechas de inicio y fin son requeridas." });

    let sql = "SELECT m.*, c.name as categoryName FROM account_movements m LEFT JOIN movement_categories c ON c.id = m.categoryId WHERE m.date >= ? AND m.date <= ?";
    let params = [startDate, endDate];

    if (accountId) {
        sql += " AND m.accountId = ?";
        params.push(accountId);
    }
    sql += " ORDER BY m.date DESC";

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});


app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});