const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/connection');
const { requireAuth, requireOwner, requireWarehouseManager, requireOrdersManager } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
    const roleNames = {
        owner: 'Владелец',
        warehouse_manager: 'Менеджер склада',
        orders_manager: 'Менеджер заказов'
    };
    res.render('admin/dashboard', { 
        title: 'Панель управления',
        roleName: roleNames[req.session.user.role]
    });
});

router.get('/users', requireOwner, async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, username, role, full_name, created_at FROM users ORDER BY id');
        res.render('admin/users', { title: 'Управление пользователями', users });
    } catch (error) {
        console.error(error);
        res.redirect('/admin');
    }
});

router.post('/users/create', requireOwner, async (req, res) => {
    try {
        const { username, password, role, full_name } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, role, full_name]
        );
        res.redirect('/admin/users');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/users');
    }
});

router.post('/users/reset-password', requireOwner, async (req, res) => {
    try {
        const { userId, newPassword } = req.body;
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
        res.redirect('/admin/users');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/users');
    }
});

router.post('/users/delete', requireOwner, async (req, res) => {
    try {
        const { userId } = req.body;
        if (userId != req.session.user.id) {
            await pool.query('DELETE FROM users WHERE id = ?', [userId]);
        }
        res.redirect('/admin/users');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/users');
    }
});

router.get('/products', requireWarehouseManager, async (req, res) => {
    try {
        const [products] = await pool.query('SELECT * FROM products ORDER BY id');
        res.render('admin/products', { title: 'Управление товарами', products });
    } catch (error) {
        console.error(error);
        res.redirect('/admin');
    }
});

router.post('/products/create', requireWarehouseManager, async (req, res) => {
    try {
        const { name, description, price, stock, category, image_url } = req.body;
        await pool.query(
            'INSERT INTO products (name, description, price, stock, category, image) VALUES (?, ?, ?, ?, ?, ?)',
            [name, description, price, stock, category, image_url || '/uploads/product.png']
        );
        res.redirect('/admin/products');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/products');
    }
});

router.post('/products/update', requireWarehouseManager, async (req, res) => {
    try {
        const { id, name, description, price, stock, category, image_url, is_active } = req.body;
        await pool.query(
            'UPDATE products SET name = ?, description = ?, price = ?, stock = ?, category = ?, image = ?, is_active = ? WHERE id = ?',
            [name, description, price, stock, category, image_url, is_active === 'on' ? 1 : 0, id]
        );
        res.redirect('/admin/products');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/products');
    }
});

router.post('/products/delete', requireWarehouseManager, async (req, res) => {
    try {
        const { productId } = req.body;
        await pool.query('DELETE FROM products WHERE id = ?', [productId]);
        res.redirect('/admin/products');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/products');
    }
});

router.get('/orders', requireOrdersManager, async (req, res) => {
    try {
        const [orders] = await pool.query(`
            SELECT o.*, GROUP_CONCAT(p.name SEPARATOR ', ') as items, c.email as customer_email
            FROM orders o 
            LEFT JOIN order_items oi ON o.id = oi.order_id 
            LEFT JOIN products p ON oi.product_id = p.id 
            LEFT JOIN customers c ON o.customer_id = c.id
            GROUP BY o.id 
            ORDER BY o.created_at DESC
        `);
        const statusNames = {
            pending: 'Оформлен',
            processing: 'В работе',
            assembled: 'Собран',
            shipped: 'Отправлен'
        };
        res.render('admin/orders', { title: 'Управление заказами', orders, statusNames });
    } catch (error) {
        console.error(error);
        res.redirect('/admin');
    }
});

router.post('/orders/update-status', requireOrdersManager, async (req, res) => {
    try {
        const { orderId, status } = req.body;
        await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
        res.redirect('/admin/orders');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/orders');
    }
});

router.get('/profile', requireAuth, (req, res) => {
    res.render('admin/profile', { title: 'Настройки профиля', success: null, error: null });
});

router.post('/profile/update', requireAuth, async (req, res) => {
    try {
        const { full_name, currentPassword, newPassword } = req.body;
        
        if (newPassword) {
            const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.session.user.id]);
            const isMatch = await bcrypt.compare(currentPassword, users[0].password);
            if (!isMatch) {
                return res.render('admin/profile', { title: 'Настройки профиля', success: null, error: 'Неверный текущий пароль' });
            }
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await pool.query('UPDATE users SET full_name = ?, password = ? WHERE id = ?', [full_name, hashedPassword, req.session.user.id]);
        } else {
            await pool.query('UPDATE users SET full_name = ? WHERE id = ?', [full_name, req.session.user.id]);
        }
        
        req.session.user.fullName = full_name;
        res.render('admin/profile', { title: 'Настройки профиля', success: 'Профиль обновлён', error: null });
    } catch (error) {
        console.error(error);
        res.render('admin/profile', { title: 'Настройки профиля', success: null, error: 'Ошибка сохранения' });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

module.exports = router;
