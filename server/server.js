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
    const lowStockSql = `SELECT * FROM products WHERE quantity <= lowStockThreshold ORDER BY quantity ASC LIMIT 5`;
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


// --- Endpoints de PRODUCTOS ---
app.get('/api/products', (req, res) => {
    const sql = "SELECT * FROM products ORDER BY brand, name";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        const products = rows.map(p => ({ ...p, salePrices: JSON.parse(p.salePrices || '[]') }));
        res.json({ "message": "success", "data": products });
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
                lowStockThreshold || 10
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
    const { paymentMethod, finalDiscountPercentage } = req.body;
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.get('SELECT * FROM sales WHERE id = ? AND status = "pending"', [id], (err, sale) => {
            if (err || !sale) {
                db.run('ROLLBACK');
                return res.status(404).json({ error: 'Venta pendiente no encontrada' });
            }
            const finalAmount = sale.totalAmount - (sale.totalAmount * ((finalDiscountPercentage || 0) / 100));
            const items = JSON.parse(sale.items);
            const updateSaleSql = `UPDATE sales SET status = 'completed', paymentMethod = ?, finalDiscount = ?, finalAmount = ?, date = ? WHERE id = ?`;
            db.run(updateSaleSql, [paymentMethod, (finalDiscountPercentage || 0), finalAmount, new Date().toISOString(), id], function (err) {
                if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Error al actualizar la venta', details: err.message }); }
                const updatePromises = items.map(item => new Promise((resolve, reject) => {
                    if (!item.productId) return resolve(); // Ignora items genéricos
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

            const items = JSON.parse(sale.items);
            const updateSaleSql = `UPDATE sales SET status = 'canceled', cancellationReason = ? WHERE id = ?`;

            db.run(updateSaleSql, [reason, id], function (err) {
                if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Error al actualizar el estado de la venta.' }); }

                const movementReason = `Cancelación Venta #${id}: ${reason}`;
                const addMovementSql = `INSERT INTO account_movements (date, type, amount, reason) VALUES (?, 'withdrawal', ?, ?)`;

                db.run(addMovementSql, [new Date().toISOString(), sale.finalAmount, movementReason], (err) => {
                    if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Error al registrar el movimiento en la cuenta.' }); }

                    const stockPromises = items.map(item => new Promise((resolve, reject) => {
                        if (!item.productId) return resolve(); // Ignora items genéricos
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


// --- Endpoints de CUENTA ---

app.get('/api/account/summary', (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: "Fechas de inicio y fin son requeridas." });
    const salesSql = "SELECT finalAmount, paymentMethod, items, appliedTax FROM sales WHERE status = 'completed' AND date >= ? AND date <= ?";
    const expensesSql = "SELECT amount FROM expenses WHERE date >= ? AND date <= ?";
    const movementsSql = "SELECT type, amount FROM account_movements WHERE date >= ? AND date <= ?";
    Promise.all([
        new Promise((resolve, reject) => db.all(salesSql, [startDate, endDate], (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(expensesSql, [startDate, endDate], (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(movementsSql, [startDate, endDate], (err, rows) => err ? reject(err) : resolve(rows))),
    ]).then(([sales, expenses, movements]) => {
        const incomeByMethod = {};
        sales.forEach(s => {
            if (!s.paymentMethod) return;
            if (!incomeByMethod[s.paymentMethod]) {
                incomeByMethod[s.paymentMethod] = { total: 0, profit: 0, netProfit: 0 };
            }
            incomeByMethod[s.paymentMethod].total += s.finalAmount;
            const saleItems = JSON.parse(s.items);
            const costOfGoodsSold = saleItems.reduce((acc, i) => acc + (i.purchasePrice * i.quantity), 0);
            const saleGrossProfit = s.finalAmount - costOfGoodsSold;

            incomeByMethod[s.paymentMethod].profit += saleGrossProfit;
            incomeByMethod[s.paymentMethod].netProfit += saleGrossProfit - (s.appliedTax || 0);
        });
        const totalIncome = sales.reduce((sum, s) => sum + s.finalAmount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalMovements = movements.reduce((sum, m) => sum + (m.type === 'deposit' ? m.amount : -m.amount), 0);
        const totalBalance = totalIncome + totalMovements - totalExpenses;
        res.json({ data: { totalBalance, incomeByMethod } });
    }).catch(err => res.status(500).json({ error: err.message }));
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
    const { description, amount } = req.body;
    if (!description || !amount || amount <= 0) return res.status(400).json({ "error": "Descripción y monto son requeridos." });
    db.run(`INSERT INTO expenses (date, description, amount) VALUES (?, ?, ?)`, [new Date().toISOString(), description, amount], function (err) {
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
    const { type, amount, reason } = req.body;
    db.run("INSERT INTO account_movements (date, type, amount, reason) VALUES (?, ?, ?, ?)", [new Date().toISOString(), type, amount, reason], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ id: this.lastID });
    });
});
app.get('/api/account/movements', (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: "Fechas de inicio y fin son requeridas." });
    db.all("SELECT * FROM account_movements WHERE date >= ? AND date <= ? ORDER BY date DESC", [startDate, endDate], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

