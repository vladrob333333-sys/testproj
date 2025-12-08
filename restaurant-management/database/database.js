const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, 'restaurant.db'), (err) => {
            if (err) {
                console.error('Ошибка подключения к базе данных:', err);
            } else {
                console.log('Подключено к SQLite базе данных');
                this.initializeDatabase();
            }
        });
    }

    initializeDatabase() {
        // Создание таблиц
        const initSQL = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT NOT NULL,
                password TEXT NOT NULL,
                is_admin BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS menu_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                category TEXT NOT NULL,
                image_url TEXT,
                is_available BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                total_amount REAL NOT NULL,
                status TEXT DEFAULT 'pending',
                special_requests TEXT,
                persons INTEGER DEFAULT 1,
                booking_date DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );

            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                menu_item_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders (id),
                FOREIGN KEY (menu_item_id) REFERENCES menu_items (id)
            );

            CREATE TABLE IF NOT EXISTS table_bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                table_number INTEGER NOT NULL,
                booking_date DATETIME NOT NULL,
                persons INTEGER NOT NULL,
                status TEXT DEFAULT 'confirmed',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );
        `;

        this.db.exec(initSQL, (err) => {
            if (err) {
                console.error('Ошибка инициализации базы данных:', err);
            } else {
                console.log('Таблицы созданы/проверены');
                this.insertInitialData();
            }
        });
    }

    insertInitialData() {
        // Вставка тестовых данных
        const checkAdmin = `SELECT COUNT(*) as count FROM users WHERE is_admin = 1`;
        this.db.get(checkAdmin, (err, row) => {
            if (err) {
                console.error('Ошибка проверки администратора:', err);
                return;
            }
            
            if (row.count === 0) {
                const insertAdmin = `
                    INSERT INTO users (name, email, phone, password, is_admin) 
                    VALUES ('Администратор', 'admin@restaurant.com', '+79999999999', '$2a$10$YourHashedPasswordHere', 1)
                `;
                this.db.run(insertAdmin);
            }
        });

        // Вставка тестового меню
        const checkMenu = `SELECT COUNT(*) as count FROM menu_items`;
        this.db.get(checkMenu, (err, row) => {
            if (err) {
                console.error('Ошибка проверки меню:', err);
                return;
            }
            
            if (row.count === 0) {
                const menuItems = [
                    ['Стейк Рибай', 'Сочный стейк с овощами на гриле', 1890, 'Основные блюда'],
                    ['Паста Карбонара', 'Паста с беконом и соусом', 790, 'Основные блюда'],
                    ['Салат Цезарь', 'Салат с курицей и соусом цезарь', 590, 'Салаты'],
                    ['Тирамису', 'Итальянский десерт', 490, 'Десерты'],
                    ['Мохито', 'Освежающий коктейль', 390, 'Напитки']
                ];

                const insertMenu = `INSERT INTO menu_items (name, description, price, category) VALUES (?, ?, ?, ?)`;
                menuItems.forEach(item => {
                    this.db.run(insertMenu, item);
                });
            }
        });
    }

    // Методы для работы с пользователями
    getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    createUser(user) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)`;
            this.db.run(sql, [user.name, user.email, user.phone, user.password], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    // Методы для работы с меню
    getAllMenuItems() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM menu_items WHERE is_available = 1 ORDER BY category, name', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getMenuCategories() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT DISTINCT category FROM menu_items WHERE is_available = 1', (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.category));
            });
        });
    }

    getPopularMenuItems() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT mi.*, COUNT(oi.menu_item_id) as order_count
                FROM menu_items mi
                LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
                WHERE mi.is_available = 1
                GROUP BY mi.id
                ORDER BY order_count DESC
                LIMIT 6
            `;
            this.db.all(sql, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    addMenuItem(item) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO menu_items (name, description, price, category, is_available) VALUES (?, ?, ?, ?, ?)`;
            this.db.run(sql, [item.name, item.description, item.price, item.category, item.isAvailable], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    // Методы для работы с заказами
    createOrder(orderData) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');
                
                // Создание заказа
                const orderSql = `
                    INSERT INTO orders (user_id, total_amount, special_requests, persons, booking_date) 
                    VALUES (?, ?, ?, ?, ?)
                `;
                
                // Расчет общей суммы
                let totalAmount = 0;
                orderData.items.forEach(item => {
                    totalAmount += item.price * item.quantity;
                });

                this.db.run(orderSql, [
                    orderData.userId,
                    totalAmount,
                    orderData.specialRequests || '',
                    orderData.persons,
                    orderData.bookingDate
                ], function(err) {
                    if (err) {
                        this.db.run('ROLLBACK');
                        reject(err);
                        return;
                    }
                    
                    const orderId = this.lastID;
                    
                    // Добавление позиций заказа
                    const orderItemsSql = `
                        INSERT INTO order_items (order_id, menu_item_id, quantity, price) 
                        VALUES (?, ?, ?, ?)
                    `;
                    
                    let itemsProcessed = 0;
                    orderData.items.forEach(item => {
                        this.db.run(orderItemsSql, [orderId, item.id, item.quantity, item.price], (err) => {
                            if (err) {
                                this.db.run('ROLLBACK');
                                reject(err);
                                return;
                            }
                            
                            itemsProcessed++;
                            if (itemsProcessed === orderData.items.length) {
                                this.db.run('COMMIT', (err) => {
                                    if (err) {
                                        this.db.run('ROLLBACK');
                                        reject(err);
                                    } else {
                                        resolve(orderId);
                                    }
                                });
                            }
                        });
                    });
                });
            });
        });
    }

    getUserOrders(userId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT o.*, 
                       GROUP_CONCAT(mi.name || ' (x' || oi.quantity || ')') as items,
                       SUM(oi.quantity) as total_items
                FROM orders o
                LEFT JOIN order_items oi ON o.id = oi.order_id
                LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
                WHERE o.user_id = ?
                GROUP BY o.id
                ORDER BY o.created_at DESC
            `;
            this.db.all(sql, [userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getAllOrders() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT o.*, u.name as user_name, u.email as user_email,
                       GROUP_CONCAT(mi.name || ' (x' || oi.quantity || ')') as items
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                LEFT JOIN order_items oi ON o.id = oi.order_id
                LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
                GROUP BY o.id
                ORDER BY o.created_at DESC
            `;
            this.db.all(sql, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    updateOrderStatus(orderId, status) {
        return new Promise((resolve, reject) => {
            this.db.run('UPDATE orders SET status = ? WHERE id = ?', [status, orderId], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }

    // Методы для работы с бронированиями
    getUserBookings(userId) {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM table_bookings WHERE user_id = ? ORDER BY booking_date DESC', [userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getAllBookings() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT tb.*, u.name as user_name, u.email as user_email 
                FROM table_bookings tb 
                LEFT JOIN users u ON tb.user_id = u.id 
                ORDER BY tb.booking_date DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Методы для администратора
    getAllUsers() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT id, name, email, phone, is_admin, created_at FROM users ORDER BY created_at DESC', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
}

module.exports = new Database();