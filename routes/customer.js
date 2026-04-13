const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/connection');

const router = express.Router();

router.get('/register', (req, res) => {
    res.render('shop/register', { title: 'Регистрация', error: null });
});

router.post('/register', async (req, res) => {
    try {
        const { email, password, full_name, phone } = req.body;
        
        const [existing] = await pool.query('SELECT id FROM customers WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.render('shop/register', { title: 'Регистрация', error: 'Пользователь с таким email уже существует' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO customers (email, password, full_name, phone) VALUES (?, ?, ?, ?)',
            [email, hashedPassword, full_name, phone || null]
        );
        
        res.redirect('/login');
    } catch (error) {
        console.error(error);
        res.render('shop/register', { title: 'Регистрация', error: 'Ошибка регистрации' });
    }
});

router.get('/login', (req, res) => {
    if (req.session.customer) {
        return res.redirect('/account');
    }
    res.render('shop/login', { title: 'Вход', error: null });
});

router.post('/login', async (req, res) => {
    try {
        const { login, password } = req.body;
        
        const [customers] = await pool.query('SELECT * FROM customers WHERE email = ?', [login]);
        const [admins] = await pool.query('SELECT * FROM users WHERE username = ?', [login]);
        
        if (customers.length > 0) {
            const customer = customers[0];
            const isMatch = await bcrypt.compare(password, customer.password);
            
            if (!isMatch) {
                return res.render('shop/login', { title: 'Вход', error: 'Неверный email или пароль' });
            }
            
            req.session.customer = {
                id: customer.id,
                email: customer.email,
                fullName: customer.full_name,
                phone: customer.phone,
                address: customer.address
            };
            req.session.user = null;
            
            return res.redirect('/account');
        }
        
        if (admins.length > 0) {
            const admin = admins[0];
            const isMatch = await bcrypt.compare(password, admin.password);
            
            if (!isMatch) {
                return res.render('shop/login', { title: 'Вход', error: 'Неверный логин или пароль' });
            }
            
            req.session.user = {
                id: admin.id,
                username: admin.username,
                role: admin.role,
                fullName: admin.full_name
            };
            req.session.customer = null;
            
            return res.redirect('/admin');
        }
        
        res.render('shop/login', { title: 'Вход', error: 'Пользователь не найден' });
    } catch (error) {
        console.error(error);
        res.render('shop/login', { title: 'Вход', error: 'Ошибка сервера' });
    }
});

router.get('/account', async (req, res) => {
    if (!req.session.customer) {
        return res.redirect('/login');
    }
    
    try {
        const [orders] = await pool.query(`
            SELECT o.*, GROUP_CONCAT(p.name SEPARATOR ', ') as items 
            FROM orders o 
            LEFT JOIN order_items oi ON o.id = oi.order_id 
            LEFT JOIN products p ON oi.product_id = p.id 
            WHERE o.customer_id = ?
            GROUP BY o.id 
            ORDER BY o.created_at DESC
        `, [req.session.customer.id]);
        
        res.render('shop/account', { 
            title: 'Личный кабинет', 
            customer: req.session.customer,
            orders
        });
    } catch (error) {
        console.error(error);
        res.render('shop/account', { 
            title: 'Личный кабинет', 
            customer: req.session.customer,
            orders: []
        });
    }
});

router.get('/logout', (req, res) => {
    req.session.customer = null;
    req.session.user = null;
    res.redirect('/');
});

module.exports = router;
