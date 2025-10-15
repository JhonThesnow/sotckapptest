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

            // --- SEEDING DE DATOS INICIALES ESENCIALES ---
            const seedEssentialData = () => {
                db.get("SELECT COUNT(*) as count FROM accounts", (err, row) => {
                    if (row.count === 0) {
                        console.log("Seeding: Creando cuentas iniciales...");
                        db.run(`INSERT INTO accounts (name, type) VALUES ('Caja Principal', 'Efectivo'), ('Banco', 'Digital')`);
                    }
                });

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

            // --- SEEDING DE DATOS DE KIOSCO ---
            const seedKioskData = () => {
                db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
                    if (row.count === 0) {
                        console.log("Seeding: Insertando datos de prueba para el kiosco...");
                        db.run(`
                            INSERT INTO "products" ("code", "name", "type", "brand", "subtype", "quantity", "purchasePrice", "salePrices", "lowStockThreshold")
                            VALUES
                                ('77900401', 'Alfajor', 'Golosinas', 'Jorgito', 'Chocolate', 24, 80, '[{"name": "Minorista", "price": 150}]', 12),
                                ('77900402', 'Alfajor', 'Golosinas', 'Jorgito', 'Blanco', 22, 80, '[{"name": "Minorista", "price": 150}]', 12),
                                ('77900311', 'Galletitas', 'Golosinas', 'Terrabusi', 'Melba', 15, 120, '[{"name": "Minorista", "price": 200}]', 10),
                                ('77900312', 'Galletitas', 'Golosinas', 'Terrabusi', 'Tita', 30, 70, '[{"name": "Minorista", "price": 120}]', 15),
                                ('77900313', 'Galletitas', 'Golosinas', 'Terrabusi', 'Rhodesia', 28, 75, '[{"name": "Minorista", "price": 130}]', 15),
                                ('77905807', 'Chocolate', 'Golosinas', 'Milka', 'Tableta Leche', 18, 250, '[{"name": "Minorista", "price": 400}]', 8),
                                ('77905808', 'Chocolate', 'Golosinas', 'Milka', 'Bis', 20, 180, '[{"name": "Minorista", "price": 280}]', 10),
                                ('77900751', 'Caramelos', 'Golosinas', 'Arcor', 'Menthoplus', 40, 50, '[{"name": "Minorista", "price": 100}]', 20),
                                ('77900752', 'Caramelos', 'Golosinas', 'Arcor', 'Butter Toffees', 35, 80, '[{"name": "Minorista", "price": 140}]', 20),
                                ('77900101', 'Gaseosa', 'Bebidas', 'Coca-Cola', 'Sabor Original 500ml', 36, 150, '[{"name": "Minorista", "price": 250}]', 18),
                                ('77900102', 'Gaseosa', 'Bebidas', 'Coca-Cola', 'Sin Azúcar 500ml', 30, 150, '[{"name": "Minorista", "price": 250}]', 18),
                                ('77900103', 'Gaseosa', 'Bebidas', 'Sprite', 'Lima Limón 500ml', 25, 140, '[{"name": "Minorista", "price": 240}]', 15),
                                ('77900104', 'Agua', 'Bebidas', 'Villavicencio', 'Sin Gas 500ml', 45, 80, '[{"name": "Minorista", "price": 150}]', 20),
                                ('77900105', 'Agua', 'Bebidas', 'Ser', 'Saborizada Manzana 500ml', 20, 100, '[{"name": "Minorista", "price": 180}]', 10),
                                ('77900901', 'Papas Fritas', 'Snacks', 'Lays', 'Clásicas 85g', 24, 200, '[{"name": "Minorista", "price": 350}]', 12),
                                ('77900902', 'Papas Fritas', 'Snacks', 'Pringles', 'Original 124g', 12, 450, '[{"name": "Minorista", "price": 700}]', 6),
                                ('77900903', 'Maní', 'Snacks', 'Pehuamar', 'Salado 100g', 30, 150, '[{"name": "Minorista", "price": 250}]', 15),
                                ('77900904', 'Palitos', 'Snacks', 'Pehuamar', 'Salados 100g', 28, 140, '[{"name": "Minorista", "price": 230}]', 15),
                                ('77900601', 'Chicles', 'Golosinas', 'Beldent', 'Menta', 50, 40, '[{"name": "Minorista", "price": 80}]', 25),
                                ('77900602', 'Chicles', 'Golosinas', 'Topline', 'Menta Fuerte', 48, 45, '[{"name": "Minorista", "price": 90}]', 25),
                                ('77900201', 'Helado', 'Golosinas', 'Frigor', 'Torpedo', 15, 120, '[{"name": "Minorista", "price": 200}]', 8),
                                ('77900202', 'Helado', 'Golosinas', 'Frigor', 'Pata Pata', 18, 130, '[{"name": "Minorista", "price": 220}]', 8),
                                ('77912900', 'Turrón', 'Golosinas', 'Arcor', 'Mani', 40, 60, '[{"name": "Minorista", "price": 100}]', 20),
                                ('77908950', 'Pastillas', 'Golosinas', 'Yapa', 'Frutales', 30, 50, '[{"name": "Minorista", "price": 90}]', 15),
                                ('77900753', 'Chupetín', 'Golosinas', 'Pico Dulce', 'Clásico', 60, 30, '[{"name": "Minorista", "price": 60}]', 30),
                                ('77900501', 'Cigarrillos', 'Tabaco', 'Marlboro', 'Box 20', 10, 400, '[{"name": "Minorista", "price": 600}]', 5),
                                ('77900502', 'Cigarrillos', 'Tabaco', 'Philip Morris', 'Común 20', 12, 350, '[{"name": "Minorista", "price": 500}]', 6),
                                ('77900503', 'Cigarrillos', 'Tabaco', 'Camel', 'Box 20', 8, 420, '[{"name": "Minorista", "price": 620}]', 4),
                                ('78910001', 'Encendedor', 'Varios', 'Bic', 'Clásico', 25, 100, '[{"name": "Minorista", "price": 180}]', 10),
                                ('12345678', 'Carga Virtual', 'Servicios', 'Personal', 'Recarga', 999, 0, '[{"name": "Minorista", "price": 100}]', 0),
                                ('12345679', 'Carga SUBE', 'Servicios', 'SUBE', 'Recarga', 999, 0, '[{"name": "Minorista", "price": 50}]', 0),
                                ('77900403', 'Alfajor', 'Golosinas', 'Guaymallen', 'Blanco', 50, 50, '[{"name": "Minorista", "price": 90}]', 25),
                                ('77900404', 'Alfajor', 'Golosinas', 'Guaymallen', 'Chocolate', 50, 50, '[{"name": "Minorista", "price": 90}]', 25),
                                ('77900405', 'Alfajor', 'Golosinas', 'Capitan del Espacio', 'Chocolate', 15, 100, '[{"name": "Minorista", "price": 180}]', 7),
                                ('77900314', 'Oblea', 'Golosinas', 'Bon o Bon', 'Clásica', 30, 80, '[{"name": "Minorista", "price": 140}]', 15),
                                ('77900315', 'Oblea', 'Golosinas', 'Nussini', 'Clásica', 25, 70, '[{"name": "Minorista", "price": 120}]', 12),
                                ('77905809', 'Chocolate', 'Golosinas', 'Cadbury', 'Yogurt Frutilla', 20, 280, '[{"name": "Minorista", "price": 450}]', 10),
                                ('77905810', 'Chocolate', 'Golosinas', 'Shot', 'Maní', 22, 260, '[{"name": "Minorista", "price": 420}]', 10),
                                ('77900754', 'Caramelos', 'Golosinas', 'Sugus', 'Confitados', 40, 90, '[{"name": "Minorista", "price": 160}]', 20),
                                ('77900755', 'Caramelos', 'Golosinas', 'Flynn Paff', 'Tutti Frutti', 50, 20, '[{"name": "Minorista", "price": 40}]', 30),
                                ('77900106', 'Gaseosa', 'Bebidas', 'Pepsi', 'Clásica 500ml', 30, 140, '[{"name": "Minorista", "price": 240}]', 15),
                                ('77900107', 'Gaseosa', 'Bebidas', '7up', 'Lima Limón 500ml', 25, 130, '[{"name": "Minorista", "price": 230}]', 15),
                                ('77900108', 'Agua', 'Bebidas', 'Glaciar', 'Sin Gas 500ml', 40, 70, '[{"name": "Minorista", "price": 130}]', 20),
                                ('77900109', 'Jugo', 'Bebidas', 'Cepita', 'Naranja 1L', 12, 180, '[{"name": "Minorista", "price": 280}]', 6),
                                ('77900905', 'Papas Fritas', 'Snacks', 'Krachitos', 'Clásicas 100g', 20, 180, '[{"name": "Minorista", "price": 300}]', 10),
                                ('77900906', 'Chizitos', 'Snacks', 'Cheetos', 'Clásicos', 18, 190, '[{"name": "Minorista", "price": 320}]', 10),
                                ('77900907', 'Nachos', 'Snacks', 'Doritos', 'Queso', 15, 220, '[{"name": "Minorista", "price": 380}]', 8),
                                ('77900603', 'Chicles', 'Golosinas', 'Bubbaloo', 'Uva', 40, 30, '[{"name": "Minorista", "price": 60}]', 20),
                                ('77900604', 'Chicles', 'Golosinas', 'Poosh', 'Tutti Frutti', 35, 25, '[{"name": "Minorista", "price": 50}]', 20),
                                ('77900203', 'Helado', 'Golosinas', 'Grido', 'Bombón Escocés', 12, 200, '[{"name": "Minorista", "price": 320}]', 6),
                                ('77912901', 'Barrita', 'Golosinas', 'Cereal Mix', 'Frutilla', 25, 80, '[{"name": "Minorista", "price": 140}]', 12),
                                ('77908951', 'Gomitas', 'Golosinas', 'Mogul', 'Ositos', 30, 100, '[{"name": "Minorista", "price": 180}]', 15),
                                ('77900756', 'Chupetín', 'Golosinas', 'Baby Doll', 'Frutal', 50, 20, '[{"name": "Minorista", "price": 40}]', 25),
                                ('77900504', 'Cigarrillos', 'Tabaco', 'Lucky Strike', 'Box 20', 9, 410, '[{"name": "Minorista", "price": 610}]', 5),
                                ('12345680', 'Pañuelos', 'Varios', 'Carilina', 'Pack x10', 20, 90, '[{"name": "Minorista", "price": 160}]', 10),
                                ('12345681', 'Aspirina', 'Farmacia', 'Bayer', 'Unidad', 15, 50, '[{"name": "Minorista", "price": 100}]', 7),
                                ('77900406', 'Alfajor', 'Golosinas', 'Fantoche', 'Triple Negro', 20, 120, '[{"name": "Minorista", "price": 200}]', 10),
                                ('77900316', 'Galletitas', 'Golosinas', 'Bagley', 'Sonrisas', 18, 130, '[{"name": "Minorista", "price": 220}]', 9),
                                ('77900317', 'Galletitas', 'Golosinas', 'Arcor', 'Cofler Block', 25, 100, '[{"name": "Minorista", "price": 180}]', 12),
                                ('77905811', 'Chocolate', 'Golosinas', 'Toblerone', 'Leche 50g', 10, 400, '[{"name": "Minorista", "price": 650}]', 5),
                                ('77900110', 'Energizante', 'Bebidas', 'Speed', 'Lata 250ml', 15, 180, '[{"name": "Minorista", "price": 300}]', 7),
                                ('77900111', 'Energizante', 'Bebidas', 'Red Bull', 'Lata 250ml', 10, 250, '[{"name": "Minorista", "price": 450}]', 5),
                                ('77900908', 'Semillas', 'Snacks', 'Lays', 'Girasol', 20, 120, '[{"name": "Minorista", "price": 200}]', 10),
                                ('77900204', 'Helado', 'Golosinas', 'La Montevideana', 'Palito de Agua', 25, 100, '[{"name": "Minorista", "price": 180}]', 10),
                                ('77900505', 'Tabaco', 'Tabaco', 'Sayri', 'Paquete', 10, 300, '[{"name": "Minorista", "price": 480}]', 5),
                                ('12345682', 'Papelillos', 'Tabaco', 'OCB', 'Clásico', 30, 80, '[{"name": "Minorista", "price": 150}]', 15),
                                ('77900112', 'Cerveza', 'Bebidas', 'Quilmes', 'Lata 473ml', 24, 150, '[{"name": "Minorista", "price": 250}]', 12),
                                ('77900113', 'Cerveza', 'Bebidas', 'Brahma', 'Lata 473ml', 20, 140, '[{"name": "Minorista", "price": 240}]', 10),
                                ('77900114', 'Cerveza', 'Bebidas', 'Andes Origen', 'Roja Lata 473ml', 15, 180, '[{"name": "Minorista", "price": 300}]', 7),
                                ('77900115', 'Vino', 'Bebidas', 'Termidor', 'Tinto 1L', 10, 200, '[{"name": "Minorista", "price": 350}]', 5),
                                ('77900909', 'Bizcochitos', 'Snacks', '9 de Oro', 'Clásicos', 20, 150, '[{"name": "Minorista", "price": 250}]', 10),
                                ('77900910', 'Bizcochitos', 'Snacks', 'Don Satur', 'Agridulce', 22, 160, '[{"name": "Minorista", "price": 260}]', 10),
                                ('77900318', 'Galletitas', 'Golosinas', 'Oreo', 'Clásicas', 20, 180, '[{"name": "Minorista", "price": 300}]', 10),
                                ('77900319', 'Galletitas', 'Golosinas', 'Chocolinas', 'Clásicas', 15, 170, '[{"name": "Minorista", "price": 280}]', 8),
                                ('77905812', 'Chocolate', 'Golosinas', 'Kinder', 'Bueno', 18, 200, '[{"name": "Minorista", "price": 350}]', 9),
                                ('77905813', 'Chocolate', 'Golosinas', 'Ferrero', 'Rocher x3', 12, 350, '[{"name": "Minorista", "price": 550}]', 6),
                                ('77900757', 'Pastillas', 'Golosinas', 'DRF', 'Menta', 30, 70, '[{"name": "Minorista", "price": 120}]', 15),
                                ('77900758', 'Pastillas', 'Golosinas', 'La Yapa', 'Anís', 25, 60, '[{"name": "Minorista", "price": 100}]', 12);
                        `, (err) => {
                            if (err) return console.error("Error inserting products:", err.message);

                            // Solo insertar ventas si los productos se insertaron correctamente
                            db.all("SELECT id, name, subtype, purchasePrice, salePrices FROM products", [], (err, allProducts) => {
                                if (err) return console.error("Error fetching products for sales seeding:", err.message);

                                const salesToInsert = [];
                                const startDate = new Date('2025-01-01T00:00:00Z');
                                const endDate = new Date('2025-10-13T23:59:59Z');
                                const paymentMethods = ['Efectivo', 'Débito', 'Crédito', 'Cuenta DNI'];

                                for (let i = 0; i < 1000; i++) {
                                    const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
                                    const itemsCount = Math.floor(Math.random() * 4) + 1;
                                    const items = [];
                                    let subtotal = 0;

                                    for (let j = 0; j < itemsCount; j++) {
                                        const randomProduct = allProducts[Math.floor(Math.random() * allProducts.length)];
                                        const quantity = Math.floor(Math.random() * 3) + 1;
                                        const salePrices = JSON.parse(randomProduct.salePrices);
                                        const unitPrice = salePrices[0]?.price || 0;

                                        items.push({
                                            productId: randomProduct.id,
                                            fullName: `${randomProduct.name} - ${randomProduct.subtype}`,
                                            quantity: quantity,
                                            unitPrice: unitPrice,
                                            purchasePrice: randomProduct.purchasePrice,
                                        });
                                        subtotal += unitPrice * quantity;
                                    }

                                    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
                                    const accountId = (paymentMethod === 'Efectivo') ? 1 : 2;

                                    salesToInsert.push(
                                        `(${accountId}, '${randomDate.toISOString()}', '${JSON.stringify(items).replace(/'/g, "''")}', ${subtotal}, 0, ${subtotal}, 'completed', '${paymentMethod}', 0, ${subtotal}, 0)`
                                    );
                                }

                                if (salesToInsert.length > 0) {
                                    db.run(`
                                        INSERT INTO "sales" ("accountId", "date", "items", "subtotal", "discount", "totalAmount", "status", "paymentMethod", "finalDiscount", "finalAmount", "appliedTax")
                                        VALUES ${salesToInsert.join(',\n')};
                                    `, (err) => {
                                        if (err) console.error("Error inserting sales:", err.message);
                                        else console.log(`${salesToInsert.length} sales inserted successfully.`);
                                    });
                                }
                            });
                        });

                        db.run(`
                            INSERT INTO "stock_entries" ("date", "products")
                            VALUES
                                ('2025-01-15T10:00:00Z', '[{"id":1,"name":"Alfajor","subtype":"Chocolate","quantity":24},{"id":2,"name":"Alfajor","subtype":"Blanco","quantity":24}]'),
                                ('2025-02-02T11:30:00Z', '[{"id":10,"name":"Gaseosa","subtype":"Sabor Original 500ml","quantity":36},{"id":11,"name":"Gaseosa","subtype":"Sin Azúcar 500ml","quantity":24}]'),
                                ('2025-03-20T09:00:00Z', '[{"id":5,"name":"Galletitas","subtype":"Rhodesia","quantity":30},{"id":6,"name":"Chocolate","subtype":"Tableta Leche","quantity":12}]'),
                                ('2025-04-18T14:00:00Z', '[{"id":14,"name":"Agua","subtype":"Sin Gas 500ml","quantity":48},{"id":15,"name":"Agua","subtype":"Saborizada Manzana 500ml","quantity":24}]'),
                                ('2025-05-10T10:00:00Z', '[{"id":16,"name":"Papas Fritas","subtype":"Clásicas 85g","quantity":24},{"id":18,"name":"Maní","subtype":"Salado 100g","quantity":30}]'),
                                ('2025-06-05T16:20:00Z', '[{"id":20,"name":"Chicles","subtype":"Menta","quantity":50},{"id":21,"name":"Chicles","subtype":"Menta Fuerte","quantity":50}]'),
                                ('2025-07-22T09:15:00Z', '[{"id":26,"name":"Turrón","subtype":"Mani","quantity":48},{"id":27,"name":"Pastillas","subtype":"Frutales","quantity":30}]'),
                                ('2025-08-15T11:00:00Z', '[{"id":29,"name":"Cigarrillos","subtype":"Box 20","quantity":10},{"id":30,"name":"Cigarrillos","subtype":"Común 20","quantity":10}]'),
                                ('2025-09-08T18:00:00Z', '[{"id":1,"name":"Alfajor","subtype":"Chocolate","quantity":24},{"id":2,"name":"Alfajor","subtype":"Blanco","quantity":24},{"id":33,"name":"Alfajor","subtype":"Blanco","quantity":50}]'),
                                ('2025-10-01T10:30:00Z', '[{"id":10,"name":"Gaseosa","subtype":"Sabor Original 500ml","quantity":36},{"id":12,"name":"Gaseosa","subtype":"Lima Limón 500ml","quantity":24},{"id":40,"name":"Gaseosa","subtype":"Clásica 500ml","quantity":30}]');
                        `);

                        db.run(`
                            INSERT INTO "price_increases" ("date", "details", "products")
                            VALUES
                                ('2025-03-01T08:00:00Z', '{"type":"percentage","value":10,"targets":{"purchase":true,"retail":true}}', '[{"id":1,"name":"Alfajor","subtype":"Chocolate","oldPurchasePrice":"80.00","newPurchasePrice":"88.00","oldRetailPrice":"150.00","newRetailPrice":"165.00"},{"id":2,"name":"Alfajor","subtype":"Blanco","oldPurchasePrice":"80.00","newPurchasePrice":"88.00","oldRetailPrice":"150.00","newRetailPrice":"165.00"}]'),
                                ('2025-08-15T08:30:00Z', '{"type":"percentage","value":15,"targets":{"purchase":false,"retail":true}}', '[{"id":10,"name":"Gaseosa","subtype":"Sabor Original 500ml","oldPurchasePrice":"150.00","newPurchasePrice":"150.00","oldRetailPrice":"250.00","newRetailPrice":"287.50"},{"id":12,"name":"Gaseosa","subtype":"Lima Limón 500ml","oldPurchasePrice":"140.00","newPurchasePrice":"140.00","oldRetailPrice":"240.00","newRetailPrice":"276.00"}]');
                        `);
                    }
                });
            };

            // Ejecutar las funciones de seeding
            seedEssentialData();
            seedKioskData();
        });
    }
});

module.exports = db;