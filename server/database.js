const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./inventory.db', (err) => {
    if (err) {
        console.error("Error al abrir la base de datos: " + err.message);
    } else {
        console.log("¡Base de datos conectada!");

        db.serialize(() => {
            // Habilitar claves foráneas
            db.run('PRAGMA foreign_keys = ON;');

            // --- TABLAS ---
            db.run(`CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                type TEXT NOT NULL,
                initialBalance REAL DEFAULT 0
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS movement_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                type TEXT NOT NULL
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS cash_closings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                accountId INTEGER NOT NULL,
                date TEXT NOT NULL,
                expected REAL NOT NULL,
                counted REAL NOT NULL,
                difference REAL NOT NULL,
                notes TEXT,
                FOREIGN KEY (accountId) REFERENCES accounts (id) ON DELETE CASCADE
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT, name TEXT NOT NULL, type TEXT NOT NULL, brand TEXT, subtype TEXT,
                quantity INTEGER NOT NULL, purchasePrice REAL NOT NULL, salePrices TEXT NOT NULL,
                lowStockThreshold INTEGER DEFAULT 10
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                accountId INTEGER,
                date TEXT NOT NULL, items TEXT NOT NULL, subtotal REAL NOT NULL, discount REAL,
                totalAmount REAL NOT NULL, status TEXT NOT NULL DEFAULT 'pending', paymentMethod TEXT,
                finalDiscount REAL DEFAULT 0, finalAmount REAL, appliedTax REAL DEFAULT 0,
                cancellationReason TEXT,
                FOREIGN KEY (accountId) REFERENCES accounts (id) ON DELETE SET NULL
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                accountId INTEGER NOT NULL,
                categoryId INTEGER,
                date TEXT NOT NULL, description TEXT NOT NULL, amount REAL NOT NULL,
                FOREIGN KEY (accountId) REFERENCES accounts (id) ON DELETE CASCADE,
                FOREIGN KEY (categoryId) REFERENCES movement_categories (id) ON DELETE SET NULL
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS payment_methods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                isFixed INTEGER NOT NULL DEFAULT 0
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS account_movements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                accountId INTEGER NOT NULL,
                categoryId INTEGER,
                date TEXT NOT NULL, type TEXT NOT NULL, amount REAL NOT NULL, reason TEXT NOT NULL,
                FOREIGN KEY (accountId) REFERENCES accounts (id) ON DELETE CASCADE,
                FOREIGN KEY (categoryId) REFERENCES movement_categories (id) ON DELETE SET NULL
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS stock_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL, products TEXT NOT NULL
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS price_increases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL, details TEXT NOT NULL, products TEXT NOT NULL
            )`);

            // --- SEEDING DE DATOS INICIALES (Lógica mejorada) ---
            const seedData = () => {
                db.get("SELECT COUNT(*) as count FROM accounts", (err, row) => {
                    if (row.count === 0) {
                        console.log("Seeding Cuentas...");
                        db.run(`INSERT INTO accounts (name, type) VALUES ('Caja Principal', 'Efectivo'), ('Banco', 'Digital')`, () => {
                            // Una vez creadas las cuentas, podemos crear movimientos de ejemplo
                            db.get("SELECT COUNT(*) as count FROM account_movements", (err, row) => {
                                if (row.count === 0) {
                                    console.log("Seeding Movimientos de ejemplo...");
                                    const yesterday = new Date();
                                    yesterday.setDate(yesterday.getDate() - 1);
                                    db.run(`INSERT INTO account_movements (accountId, categoryId, date, type, amount, reason) VALUES
                                        (1, 1, '${new Date().toISOString()}', 'deposit', 5000, 'Aporte inicial para caja'),
                                        (2, 7, '${yesterday.toISOString()}', 'withdrawal', 1200, 'Pago de sueldo')
                                    `);
                                }
                            });
                        });
                    }
                });

                db.get("SELECT COUNT(*) as count FROM movement_categories", (err, row) => {
                    if (row.count === 0) {
                        console.log("Seeding Categorías...");
                        db.run(`INSERT INTO movement_categories (name, type) VALUES
                            ('Aporte de Capital', 'deposit'), ('Préstamo', 'deposit'),
                            ('Retiro Personal', 'withdrawal'), ('Pago a Proveedores', 'withdrawal'),
                            ('Alquiler', 'withdrawal'), ('Servicios (Luz, Agua)', 'withdrawal'),
                            ('Sueldos', 'withdrawal'), ('Marketing', 'withdrawal'),
                            ('Impuestos', 'withdrawal'), ('Otros Gastos', 'withdrawal')
                        `);
                    }
                });

                // Lógica robusta para asegurar que los métodos de pago existan
                const defaultMethods = [
                    { name: 'Efectivo', isFixed: 1 },
                    { name: 'Crédito', isFixed: 0 },
                    { name: 'Débito', isFixed: 0 },
                    { name: 'Cuenta DNI', isFixed: 0 }
                ];
                const stmt = db.prepare(`INSERT OR IGNORE INTO payment_methods (name, isFixed) VALUES (?, ?)`);
                console.log("Verificando/sembrando métodos de pago...");
                for (const method of defaultMethods) {
                    stmt.run(method.name, method.isFixed);
                }
                stmt.finalize((err) => {
                    if (err) {
                        console.error("Error al sembrar métodos de pago:", err.message);
                    } else {
                        console.log("Métodos de pago verificados.");
                    }
                });

                // --- PRODUCTOS ---
                const products = [
                    // Bebidas
                    { code: '7790895000997', name: 'Coca-Cola', type: 'Bebida', brand: 'Coca-Cola', subtype: '500ml', quantity: 50, purchasePrice: 80, salePrices: [{ name: 'Minorista', price: 150 }] },
                    { code: '7790895000980', name: 'Coca-Cola', type: 'Bebida', brand: 'Coca-Cola', subtype: '1.5L', quantity: 30, purchasePrice: 150, salePrices: [{ name: 'Minorista', price: 250 }] },
                    { code: '7790895001444', name: 'Sprite', type: 'Bebida', brand: 'Coca-Cola', subtype: '500ml', quantity: 40, purchasePrice: 80, salePrices: [{ name: 'Minorista', price: 150 }] },
                    { code: '7790070520288', name: 'Agua Mineral', type: 'Bebida', brand: 'Villavicencio', subtype: '500ml', quantity: 60, purchasePrice: 50, salePrices: [{ name: 'Minorista', price: 90 }] },
                    { code: '7790070520301', name: 'Agua Mineral', type: 'Bebida', brand: 'Villavicencio', subtype: '1.5L', quantity: 40, purchasePrice: 80, salePrices: [{ name: 'Minorista', price: 140 }] },
                    { code: '7790040001016', name: 'Cerveza', type: 'Bebida', brand: 'Quilmes', subtype: 'Lata 473ml', quantity: 24, purchasePrice: 120, salePrices: [{ name: 'Minorista', price: 200 }] },
                    { code: '7790040001030', name: 'Cerveza', type: 'Bebida', brand: 'Quilmes', subtype: 'Porrón 340ml', quantity: 36, purchasePrice: 90, salePrices: [{ name: 'Minorista', price: 160 }] },

                    // Golosinas
                    { code: '7790040232403', name: 'Alfajor', type: 'Golosina', brand: 'Jorgito', subtype: 'Chocolate', quantity: 50, purchasePrice: 60, salePrices: [{ name: 'Minorista', price: 100 }] },
                    { code: '7790040232410', name: 'Alfajor', type: 'Golosina', brand: 'Jorgito', subtype: 'Dulce de Leche', quantity: 50, purchasePrice: 60, salePrices: [{ name: 'Minorista', price: 100 }] },
                    { code: '7790040232427', name: 'Alfajor', type: 'Golosina', brand: 'Fantoche', subtype: 'Triple Chocolate', quantity: 40, purchasePrice: 80, salePrices: [{ name: 'Minorista', price: 130 }] },
                    { code: '77905805', name: 'Chupetín', type: 'Golosina', brand: 'Pico Dulce', subtype: 'Unidad', quantity: 100, purchasePrice: 15, salePrices: [{ name: 'Minorista', price: 30 }] },
                    { code: '7790040004543', name: 'Caramelos', type: 'Golosina', brand: 'Arcor', subtype: 'Menta', quantity: 200, purchasePrice: 5, salePrices: [{ name: 'Minorista', price: 10 }] },
                    { code: '7790040004550', name: 'Caramelos', type: 'Golosina', brand: 'Arcor', subtype: 'Frutales', quantity: 200, purchasePrice: 5, salePrices: [{ name: 'Minorista', price: 10 }] },
                    { code: '7790580100021', name: 'Turrón', type: 'Golosina', brand: 'Arcor', subtype: 'Maní', quantity: 30, purchasePrice: 40, salePrices: [{ name: 'Minorista', price: 70 }] },

                    // Snacks
                    { code: '7790040002013', name: 'Papas Fritas', type: 'Snack', brand: 'Lays', subtype: 'Clásicas 85g', quantity: 20, purchasePrice: 100, salePrices: [{ name: 'Minorista', price: 180 }] },
                    { code: '7790040002020', name: 'Papas Fritas', type: 'Snack', brand: 'Lays', subtype: 'Clásicas 150g', quantity: 15, purchasePrice: 150, salePrices: [{ name: 'Minorista', price: 250 }] },
                    { code: '7790040002037', name: 'Doritos', type: 'Snack', brand: 'Pepsico', subtype: 'Queso 80g', quantity: 20, purchasePrice: 110, salePrices: [{ name: 'Minorista', price: 190 }] },
                    { code: '7790040002044', name: 'Cheetos', type: 'Snack', brand: 'Pepsico', subtype: 'Queso 95g', quantity: 25, purchasePrice: 100, salePrices: [{ name: 'Minorista', price: 180 }] },
                    { code: '7790040002051', name: 'Maní', type: 'Snack', brand: 'Pehuamar', subtype: 'Salado 120g', quantity: 30, purchasePrice: 80, salePrices: [{ name: 'Minorista', price: 140 }] },

                    // Cigarrillos
                    { code: '7790200001017', name: 'Cigarrillos', type: 'Tabaco', brand: 'Marlboro', subtype: 'Box 20', quantity: 10, purchasePrice: 250, salePrices: [{ name: 'Minorista', price: 350 }] },
                    { code: '7790200001024', name: 'Cigarrillos', type: 'Tabaco', brand: 'Marlboro', subtype: 'Común 20', quantity: 10, purchasePrice: 240, salePrices: [{ name: 'Minorista', price: 340 }] },
                    { code: '7790200001031', name: 'Cigarrillos', type: 'Tabaco', brand: 'Philip Morris', subtype: 'Box 20', quantity: 15, purchasePrice: 230, salePrices: [{ name: 'Minorista', price: 320 }] },
                    { code: '7790200001048', name: 'Cigarrillos', type: 'Tabaco', brand: 'Camel', subtype: 'Box 20', quantity: 12, purchasePrice: 260, salePrices: [{ name: 'Minorista', price: 360 }] },
                ];

                const productStmt = db.prepare(`INSERT OR IGNORE INTO products (code, name, type, brand, subtype, quantity, purchasePrice, salePrices, lowStockThreshold) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
                console.log("Seeding Productos...");
                for (const product of products) {
                    productStmt.run(product.code, product.name, product.type, product.brand, product.subtype, product.quantity, product.purchasePrice, JSON.stringify(product.salePrices), 10);
                }
                productStmt.finalize((err) => {
                    if (err) {
                        console.error("Error al sembrar productos:", err.message);
                    } else {
                        console.log("Productos verificados.");
                    }
                });

                // --- VENTAS ---
                db.get("SELECT COUNT(*) as count FROM sales", (err, row) => {
                    if (row.count === 0) {
                        console.log("Seeding Ventas...");
                        const salesStmt = db.prepare(`INSERT INTO sales (accountId, date, items, subtotal, discount, totalAmount, status, paymentMethod, finalDiscount, finalAmount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

                        const startDate = new Date();
                        startDate.setFullYear(startDate.getFullYear() - 1);

                        for (let i = 0; i < 365; i++) {
                            const date = new Date(startDate);
                            date.setDate(startDate.getDate() + i);

                            const salesCount = Math.floor(Math.random() * 20) + 5; // Entre 5 y 25 ventas por día

                            for (let j = 0; j < salesCount; j++) {
                                const itemsCount = Math.floor(Math.random() * 5) + 1;
                                let subtotal = 0;
                                const items = [];

                                for (let k = 0; k < itemsCount; k++) {
                                    const product = products[Math.floor(Math.random() * products.length)];
                                    const quantity = Math.floor(Math.random() * 3) + 1;
                                    const item = {
                                        productId: product.code, // Usamos el código como ID de producto para este ejemplo
                                        fullName: `${product.name} - ${product.subtype}`,
                                        quantity,
                                        unitPrice: product.salePrices[0].price,
                                        purchasePrice: product.purchasePrice,
                                    };
                                    items.push(item);
                                    subtotal += item.unitPrice * quantity;
                                }

                                const discount = Math.random() > 0.9 ? Math.floor(Math.random() * 15) : 0;
                                const totalAmount = subtotal - (subtotal * (discount / 100));
                                const paymentMethod = defaultMethods[Math.floor(Math.random() * defaultMethods.length)].name;
                                const finalAmount = totalAmount; // Para este ejemplo no aplicamos descuentos finales adicionales

                                salesStmt.run(1, date.toISOString(), JSON.stringify(items), subtotal, discount, totalAmount, 'completed', paymentMethod, discount, finalAmount);
                            }
                        }

                        salesStmt.finalize((err) => {
                            if (err) {
                                console.error("Error al sembrar ventas:", err.message);
                            } else {
                                console.log("Ventas sembradas.");
                            }
                        });
                    }
                });
            };

            seedData();
        });
    }
});

module.exports = db;