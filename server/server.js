const express = require('express');
const cors = require('cors');
const db = require('./database.js');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// --- API Endpoints for PRODUCTS ---

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
    if (!Array.isArray(products) || products.length === 0) return res.status(400).json({ "error": "Se esperaba un array de productos." });
    const sql = `INSERT INTO products (code, name, type, brand, subtype, quantity, purchasePrice, salePrices, lowStockThreshold) VALUES (?,?,?,?,?,?,?,?,?)`;
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const promises = products.map(p => new Promise((resolve, reject) => {
            const params = [p.code, p.name, p.type, p.brand, p.subtype, p.quantity, p.purchasePrice, JSON.stringify(p.salePrices), p.lowStockThreshold];
            db.run(sql, params, function (err) { if (err) reject(err); else resolve({ id: this.lastID }); });
        }));
        Promise.all(promises).then(() => {
            db.run('COMMIT');
            res.status(201).json({ message: 'Productos creados exitosamente' });
        }).catch(error => {
            db.run('ROLLBACK');
            res.status(500).json({ error: 'Falló la creación de productos por lote.', details: error.message });
        });
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

app.post('/api/products/:id/restock', (req, res) => {
    const { amountToAdd } = req.body;
    if (!amountToAdd || amountToAdd <= 0) return res.status(400).json({ "error": "La cantidad a agregar debe ser mayor a 0." });
    const sql = `UPDATE products SET quantity = quantity + ? WHERE id = ?`;
    db.run(sql, [amountToAdd, req.params.id], function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ "message": "restocked", "changes": this.changes });
    });
});


// --- API Endpoints for SALES ---

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
    const { paymentMethod, finalDiscount } = req.body;
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.get('SELECT * FROM sales WHERE id = ? AND status = "pending"', [id], (err, sale) => {
            if (err || !sale) {
                db.run('ROLLBACK');
                return res.status(404).json({ error: 'Venta pendiente no encontrada' });
            }
            const finalAmount = sale.totalAmount - (sale.totalAmount * ((finalDiscount || 0) / 100));
            const items = JSON.parse(sale.items);
            const updateSaleSql = `UPDATE sales SET status = 'completed', paymentMethod = ?, finalDiscount = ?, finalAmount = ?, date = ? WHERE id = ?`;
            db.run(updateSaleSql, [paymentMethod, (finalDiscount || 0), finalAmount, new Date().toISOString(), id], function (err) {
                if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Error al actualizar la venta', details: err.message }); }
                const updatePromises = items.map(item => new Promise((resolve, reject) => {
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

app.delete('/api/sales/pending/:id', (req, res) => {
    db.run(`DELETE FROM sales WHERE id = ? AND status = 'pending'`, req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Venta pendiente eliminada', changes: this.changes });
    });
});

app.delete('/api/sales/history/:id', (req, res) => {
    db.run(`DELETE FROM sales WHERE id = ? AND status = 'completed'`, req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Venta del historial eliminada', changes: this.changes });
    });
});

app.put('/api/sales/history/:id/tax', (req, res) => {
    const { taxAmount } = req.body;
    db.run(`UPDATE sales SET tax = ? WHERE id = ?`, [taxAmount, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Impuesto aplicado', changes: this.changes });
    });
});

// --- API Endpoints for EXPENSES ---

app.post('/api/expenses', (req, res) => {
    const { description, amount } = req.body;
    if (!description || !amount || amount <= 0) return res.status(400).json({ "error": "Descripción y monto son requeridos." });
    const sql = `INSERT INTO expenses (date, description, amount) VALUES (?, ?, ?)`;
    db.run(sql, [new Date().toISOString(), description, amount], function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.status(201).json({ "message": "success", "data": { id: this.lastID, ...req.body } });
    });
});

app.get('/api/expenses', (req, res) => {
    const sql = "SELECT * FROM expenses ORDER BY date DESC";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json({ "message": "success", "data": rows });
    });
});

app.delete('/api/expenses/:id', (req, res) => {
    db.run('DELETE FROM expenses WHERE id = ?', req.params.id, function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ "message": "deleted", "changes": this.changes });
    });
});

// --- API Endpoints for REPORTS ---

app.get('/api/reports/monthly-summary', (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required query parameters." });
    }
    const salesSql = `SELECT * FROM sales WHERE status = 'completed' AND date >= ? AND date <= ?`;
    const expensesSql = `SELECT * FROM expenses WHERE date >= ? AND date <= ?`;

    Promise.all([
        new Promise((resolve, reject) => db.all(salesSql, [startDate, endDate], (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(expensesSql, [startDate, endDate], (err, rows) => err ? reject(err) : resolve(rows)))
    ]).then(([sales, expenses]) => {
        let totalRevenue = 0;
        let totalProfit = 0;
        sales.forEach(s => {
            const saleItems = JSON.parse(s.items);
            totalRevenue += s.finalAmount;
            saleItems.forEach(i => {
                totalProfit += (i.unitPrice - i.purchasePrice) * i.quantity;
            });
        });
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = totalProfit - totalExpenses - sales.reduce((sum, s) => sum + (s.tax || 0), 0);

        res.json({
            data: {
                totalRevenue,
                totalProfit,
                totalExpenses,
                netProfit,
                sales,
                expenses
            }
        });
    }).catch(err => res.status(500).json({ error: err.message }));
});


// --- API Endpoints for PAYMENT METHODS ---

app.get('/api/payment-methods', (req, res) => {
    db.all("SELECT * FROM payment_methods", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.post('/api/payment-methods', (req, res) => {
    const { name } = req.body;
    db.run("INSERT INTO payment_methods (name) VALUES (?)", [name], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ id: this.lastID });
    });
});

app.delete('/api/payment-methods/:id', (req, res) => {
    db.run("DELETE FROM payment_methods WHERE id = ? AND is_fixed = 0", req.params.id, function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ changes: this.changes });
    });
});

// --- API Endpoints for ACCOUNT ---

app.post('/api/account/movements', (req, res) => {
    const { type, amount, reason } = req.body;
    db.run("INSERT INTO account_movements (date, type, amount, reason) VALUES (?, ?, ?, ?)", [new Date().toISOString(), type, amount, reason], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ id: this.lastID });
    });
});

app.get('/api/account/movements', (req, res) => {
    db.all("SELECT * FROM account_movements ORDER BY date DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.get('/api/account/summary', (req, res) => {
    const salesSql = "SELECT finalAmount, paymentMethod, items, tax FROM sales WHERE status = 'completed'";
    const expensesSql = "SELECT amount FROM expenses";
    const movementsSql = "SELECT type, amount FROM account_movements";

    Promise.all([
        new Promise((resolve, reject) => db.all(salesSql, [], (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(expensesSql, [], (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(movementsSql, [], (err, rows) => err ? reject(err) : resolve(rows))),
    ]).then(([sales, expenses, movements]) => {
        const incomeByMethod = {};
        sales.forEach(s => {
            if (!s.paymentMethod) return;
            if (!incomeByMethod[s.paymentMethod]) {
                incomeByMethod[s.paymentMethod] = { total: 0, profit: 0, netProfit: 0 };
            }
            incomeByMethod[s.paymentMethod].total += s.finalAmount;
            const saleItems = JSON.parse(s.items);
            let saleProfit = 0;
            saleItems.forEach(i => {
                saleProfit += (i.unitPrice - i.purchasePrice) * i.quantity;
            });
            incomeByMethod[s.paymentMethod].profit += saleProfit;
            incomeByMethod[s.paymentMethod].netProfit += saleProfit - (s.tax || 0);
        });

        const totalIncome = sales.reduce((sum, s) => sum + s.finalAmount, 0);
        const totalMovements = movements.reduce((sum, m) => sum + (m.type === 'deposit' ? m.amount : -m.amount), 0);

        const totalBalance = totalIncome + totalMovements;

        res.json({
            data: {
                totalBalance,
                incomeByMethod,
            }
        });
    }).catch(err => res.status(500).json({ error: err.message }));
});


app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

