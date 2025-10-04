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
                surchargePercentage REAL DEFAULT 0,
                finalAmount REAL,
                appliedTax REAL DEFAULT 0
            )`);

            // Tabla de Gastos
            db.run(`CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                description TEXT NOT NULL,
                amount REAL NOT NULL
            )`);

            // NUEVA Tabla para Métodos de Pago
            db.run(`CREATE TABLE IF NOT EXISTS payment_methods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                isFixed INTEGER NOT NULL DEFAULT 0 -- 1 para sí, 0 para no
            )`);

            // NUEVA Tabla para Movimientos de Cuenta (Modificar Fondos)
            db.run(`CREATE TABLE IF NOT EXISTS account_movements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                type TEXT NOT NULL, -- 'deposit' o 'withdrawal'
                amount REAL NOT NULL,
                reason TEXT NOT NULL
            )`);

            // Insertar métodos de pago fijos si no existen
            db.get("SELECT COUNT(*) as count FROM payment_methods WHERE isFixed = 1", (err, row) => {
                if (row.count === 0) {
                    const fixedMethods = ['Efectivo', 'Crédito', 'Débito', 'Cuenta DNI'];
                    const stmt = db.prepare("INSERT INTO payment_methods (name, isFixed) VALUES (?, 1)");
                    fixedMethods.forEach(method => stmt.run(method));
                    stmt.finalize();
                    console.log("Métodos de pago fijos insertados.");
                }
            });
        });
    }
});

module.exports = db;

