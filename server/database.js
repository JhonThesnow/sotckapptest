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
            };

            seedData();
        });
    }
});

module.exports = db;