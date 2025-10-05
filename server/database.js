const sqlite3 = require('sqlite3').verbose();

// Se crea o se abre el archivo de la base de datos 'inventory.db'
const db = new sqlite3.Database('./inventory.db', (err) => {
    if (err) {
        console.error("Error al abrir la base de datos: " + err.message);
    } else {
        console.log("¡Base de datos conectada!");

        db.serialize(() => {
            // Tabla de Productos
            db.run(`CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                brand TEXT,
                subtype TEXT,
                quantity INTEGER NOT NULL,
                purchasePrice REAL NOT NULL,
                salePrices TEXT NOT NULL,
                lowStockThreshold INTEGER DEFAULT 10
            )`);

            // Tabla de Ventas
            db.run(`CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                items TEXT NOT NULL,
                subtotal REAL NOT NULL,
                discount REAL,
                totalAmount REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                paymentMethod TEXT, 
                finalDiscount REAL DEFAULT 0,
                finalAmount REAL,
                appliedTax REAL DEFAULT 0,
                cancellationReason TEXT
            )`);

            // Tabla de Gastos
            db.run(`CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                description TEXT NOT NULL,
                amount REAL NOT NULL
            )`);

            // Tabla para Métodos de Pago
            db.run(`CREATE TABLE IF NOT EXISTS payment_methods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                isFixed INTEGER NOT NULL DEFAULT 0
            )`);

            // Tabla para Movimientos de Cuenta
            db.run(`CREATE TABLE IF NOT EXISTS account_movements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                reason TEXT NOT NULL
            )`);

            // --- SEEDING DATA ---
            // Insertar métodos de pago por defecto si no existen
            const defaultMethods = ['Efectivo', 'Crédito', 'Débito', 'Cuenta DNI'];
            const sql = `INSERT OR IGNORE INTO payment_methods (name, isFixed) VALUES (?, ?)`;

            db.get("SELECT COUNT(*) as count FROM payment_methods", (err, row) => {
                if (err) {
                    console.error("Error checking payment methods:", err.message);
                    return;
                }
                if (row.count === 0) {
                    console.log("No payment methods found, seeding default ones.");
                    db.serialize(() => {
                        const stmt = db.prepare(sql);
                        defaultMethods.forEach((method, index) => {
                            // 'Efectivo' es fijo (isFixed = 1), los demás no.
                            stmt.run(method, method === 'Efectivo' ? 1 : 0);
                        });
                        stmt.finalize((err) => {
                            if (err) {
                                console.error("Error seeding payment methods:", err.message);
                            } else {
                                console.log("Default payment methods seeded successfully.");
                            }
                        });
                    });
                }
            });
        });
    }
});

module.exports = db;
