const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcryptjs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const moment = require('moment');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Инициализация базы данных
const db = require('./database/database');

// Настройка сессий
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: './database'
    }),
    secret: process.env.SESSION_SECRET || 'restaurant-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 дней
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Настройка EJS
app.set('view engine', 'ejs');
app.set('views', [
    path.join(__dirname, 'views/pages'),
    path.join(__dirname, 'views')
]);

// Middleware для проверки аутентификации
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.session.userId || !req.session.isAdmin) {
        return res.status(403).render('error', { 
            errorCode: 403, 
            errorMessage: 'Доступ запрещен' 
        });
    }
    next();
};

// Главная страница
app.get('/', async (req, res) => {
    try {
        const menuItems = await db.getPopularMenuItems();
        res.render('home', { 
            user: req.session.user,
            isAdmin: req.session.isAdmin,
            menuItems 
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { 
            errorCode: 500, 
            errorMessage: 'Ошибка сервера' 
        });
    }
});

// Страница меню
app.get('/menu', async (req, res) => {
    try {
        const categories = await db.getMenuCategories();
        const menuItems = await db.getAllMenuItems();
        res.render('menu', { 
            user: req.session.user,
            isAdmin: req.session.isAdmin,
            categories,
            menuItems 
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { 
            errorCode: 500, 
            errorMessage: 'Ошибка сервера' 
        });
    }
});

// Страница заказа
app.get('/order', requireAuth, async (req, res) => {
    try {
        const menuItems = await db.getAllMenuItems();
        const userBookings = await db.getUserBookings(req.session.userId);
        res.render('order', { 
            user: req.session.user,
            isAdmin: req.session.isAdmin,
            menuItems,
            userBookings 
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { 
            errorCode: 500, 
            errorMessage: 'Ошибка сервера' 
        });
    }
});

// Обработка заказа
app.post('/order', requireAuth, [
    body('items').isArray(),
    body('booking_date').isISO8601(),
    body('persons').isInt({ min: 1, max: 10 }),
    body('special_requests').optional().trim()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const orderId = await db.createOrder({
            userId: req.session.userId,
            items: req.body.items,
            bookingDate: req.body.booking_date,
            persons: req.body.persons,
            specialRequests: req.body.special_requests
        });
        
        res.json({ 
            success: true, 
            orderId,
            message: 'Заказ успешно создан!' 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка при создании заказа' 
        });
    }
});

// Регистрация
app.get('/register', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/profile');
    }
    res.render('register');
});

app.post('/register', [
    body('name').trim().isLength({ min: 2, max: 50 }),
    body('email').isEmail().normalizeEmail(),
    body('phone').matches(/^[\+]?[0-9\s\-\(\)]+$/),
    body('password').isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('register', { errors: errors.array() });
    }

    try {
        const existingUser = await db.getUserByEmail(req.body.email);
        if (existingUser) {
            return res.render('register', { 
                errors: [{ msg: 'Пользователь с таким email уже существует' }] 
            });
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const userId = await db.createUser({
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            password: hashedPassword
        });

        req.session.userId = userId;
        req.session.user = { name: req.body.name, email: req.body.email };
        req.session.isAdmin = false;
        
        res.redirect('/profile');
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { 
            errorCode: 500, 
            errorMessage: 'Ошибка при регистрации' 
        });
    }
});

// Авторизация
app.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/profile');
    }
    res.render('login');
});

app.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('login', { errors: errors.array() });
    }

    try {
        const user = await db.getUserByEmail(req.body.email);
        if (!user) {
            return res.render('login', { 
                errors: [{ msg: 'Неверный email или пароль' }] 
            });
        }

        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) {
            return res.render('login', { 
                errors: [{ msg: 'Неверный email или пароль' }] 
            });
        }

        req.session.userId = user.id;
        req.session.user = { name: user.name, email: user.email };
        req.session.isAdmin = user.is_admin === 1;
        
        res.redirect('/profile');
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { 
            errorCode: 500, 
            errorMessage: 'Ошибка при авторизации' 
        });
    }
});

// Профиль пользователя
app.get('/profile', requireAuth, async (req, res) => {
    try {
        const userOrders = await db.getUserOrders(req.session.userId);
        const userBookings = await db.getUserBookings(req.session.userId);
        
        res.render('profile', { 
            user: req.session.user,
            isAdmin: req.session.isAdmin,
            orders: userOrders,
            bookings: userBookings
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { 
            errorCode: 500, 
            errorMessage: 'Ошибка при загрузке профиля' 
        });
    }
});

// Админ панель
app.get('/admin', requireAdmin, async (req, res) => {
    try {
        const allOrders = await db.getAllOrders();
        const allBookings = await db.getAllBookings();
        const menuItems = await db.getAllMenuItems();
        const users = await db.getAllUsers();
        
        res.render('admin', { 
            user: req.session.user,
            isAdmin: true,
            orders: allOrders,
            bookings: allBookings,
            menuItems,
            users,
            moment
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { 
            errorCode: 500, 
            errorMessage: 'Ошибка при загрузке админ панели' 
        });
    }
});

// API для администратора
app.post('/admin/menu/add', requireAdmin, [
    body('name').trim().notEmpty(),
    body('description').trim(),
    body('price').isFloat({ min: 0 }),
    body('category').trim().notEmpty(),
    body('is_available').isBoolean()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const menuId = await db.addMenuItem({
            name: req.body.name,
            description: req.body.description,
            price: req.body.price,
            category: req.body.category,
            isAvailable: req.body.is_available
        });
        
        res.json({ success: true, menuId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/admin/order/:id/status', requireAdmin, async (req, res) => {
    try {
        await db.updateOrderStatus(req.params.id, req.body.status);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Выход
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Обработка ошибок 404
app.use((req, res) => {
    res.status(404).render('error', { 
        errorCode: 404, 
        errorMessage: 'Страница не найдена' 
    });
});

// Глобальная обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).render('error', {
        errorCode: err.status || 500,
        errorMessage: 'Внутренняя ошибка сервера'
    });
});

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
    console.log(`Откройте http://localhost:${port} в браузере`);
});