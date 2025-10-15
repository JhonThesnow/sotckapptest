const sqlite3 = require('sqlite3').verbose();

// Crea el path a la base de datos
const DB_PATH = './inventory.db';

// Conecta a la base de datos (o la crea si no existe)
const db = new sqlite3.Database(DB_PATH, (err) => {
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

            // --- SEEDING DE DATOS INICIALES ESENCIALES ---
            const seedEssentialData = () => {
                // MODIFICACIÓN: Crear las cuentas específicas solicitadas por el usuario,
                // usando INSERT OR REPLACE para asegurar que los IDs 1 a 4 sean correctos.
                console.log("Seeding: Creando/Actualizando cuentas iniciales...");

                // ID 1: Caja Principal (tipo 'Efectivo' para el cierre de caja)
                db.run(`INSERT OR REPLACE INTO accounts (id, name, type) VALUES (1, 'Caja Principal', 'Efectivo')`);
                // IDs 2, 3, 4: Cuentas de cobro digitales
                db.run(`INSERT OR REPLACE INTO accounts (id, name, type) VALUES (2, 'Débito', 'Digital')`);
                db.run(`INSERT OR REPLACE INTO accounts (id, name, type) VALUES (3, 'Crédito', 'Digital')`);
                db.run(`INSERT OR REPLACE INTO accounts (id, name, type) VALUES (4, 'Cuenta DNI', 'Digital')`);

                db.get("SELECT COUNT(*) as count FROM movement_categories", (err, row) => {
                    if (row.count === 0) {
                        console.log("Seeding: Creando categorías de movimientos...");
                        db.run(`INSERT INTO movement_categories (name, type) VALUES
                            ('Aporte de Capital', 'deposit'), ('Préstamo', 'deposit'),
                            ('Retiro Personal', 'withdrawal'), ('Pago a Proveedores', 'withdrawal'),
                            ('Alquiler', 'withdrawal'), ('Servicios (Luz, Agua)', 'withdrawal'),
                            ('Sueldos', 'withdrawal'), ('Marketing', 'withdrawal'),
                            ('Impuestos', 'withdrawal'), ('Otros Gastos', 'withdrawal')
                        `);
                    }
                });

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

            // --- SEEDING DE DATOS DE KIOSCO (DESACTIVADO) ---
            const seedKioskData = () => {
                // if (process.env.NODE_ENV !== 'production') {
                //     // Código de seeding de productos y ventas omitido (como se solicitó)
                // }
            };

            // Ejecutar las funciones de seeding
            seedEssentialData();
            seedKioskData();
        });
    }
});

module.exports = db;