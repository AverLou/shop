const express = require('express');
const pool = require('../db/connection');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const offset = (page - 1) * limit;
        const category = req.query.category || '';
        const search = req.query.search || '';
        const sort = req.query.sort || 'id';
        
        let whereClause = 'WHERE is_active = 1';
        let params = [];
        
        if (category) {
            whereClause += ' AND category = ?';
            params.push(category);
        }
        
        if (search) {
            whereClause += ' AND (name LIKE ? OR description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        const validSorts = ['id', 'price', 'name', 'created_at'];
        const orderBy = validSorts.includes(sort) ? sort : 'id';
        
        const [products] = await pool.query(
            `SELECT * FROM products ${whereClause} ORDER BY ${orderBy} DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        
        const [countResult] = await pool.query(
            `SELECT COUNT(*) as total FROM products ${whereClause}`,
            params
        );
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);
        
        const [categories] = await pool.query('SELECT DISTINCT category FROM products WHERE category IS NOT NULL');
        
        res.render('shop/index', {
            title: 'Интернет-магазин',
            products,
            categories,
            currentPage: page,
            totalPages,
            category,
            search,
            sort
        });
    } catch (error) {
        console.error(error);
        res.render('shop/index', {
            title: 'Интернет-магазин',
            products: [],
            categories: [],
            currentPage: 1,
            totalPages: 1,
            category: '',
            search: '',
            sort: 'id'
        });
    }
});

router.get('/product/:id', async (req, res) => {
    try {
        const [products] = await pool.query('SELECT * FROM products WHERE id = ? AND is_active = 1', [req.params.id]);
        if (products.length === 0) {
            return res.status(404).render('404', { title: 'Товар не найден' });
        }
        res.render('shop/product', { title: products[0].name, product: products[0] });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});

router.get('/cart', (req, res) => {
    res.render('shop/cart', { title: 'Корзина' });
});

router.post('/cart/add', (req, res) => {
    const { productId, quantity = 1 } = req.body;
    if (!req.session.cart) req.session.cart = [];
    
    const existingIndex = req.session.cart.findIndex(item => item.id === parseInt(productId));
    
    if (existingIndex > -1) {
        req.session.cart[existingIndex].quantity += parseInt(quantity);
    } else {
        req.session.cart.push({ id: parseInt(productId), quantity: parseInt(quantity) });
    }
    
    res.json({ success: true, cartCount: req.session.cart.reduce((sum, item) => sum + item.quantity, 0) });
});

router.post('/cart/update', (req, res) => {
    const { productId, quantity } = req.body;
    const index = req.session.cart?.findIndex(item => item.id === parseInt(productId));
    
    if (index > -1) {
        if (parseInt(quantity) <= 0) {
            req.session.cart.splice(index, 1);
        } else {
            req.session.cart[index].quantity = parseInt(quantity);
        }
    }
    
    const cartTotal = calculateCartTotal(req.session.cart || []);
    res.json({ success: true, cartTotal });
});

router.post('/cart/remove', (req, res) => {
    const { productId } = req.body;
    if (req.session.cart) {
        req.session.cart = req.session.cart.filter(item => item.id !== parseInt(productId));
    }
    const cartTotal = calculateCartTotal(req.session.cart || []);
    res.json({ success: true, cartTotal });
});

async function calculateCartTotal(cart) {
    if (!cart.length) return 0;
    const ids = cart.map(item => item.id);
    const [products] = await pool.query('SELECT id, price FROM products WHERE id IN (?)', [ids]);
    return cart.reduce((total, item) => {
        const product = products.find(p => p.id === item.id);
        return total + (product ? product.price * item.quantity : 0);
    }, 0);
}

router.get('/checkout', async (req, res) => {
    if (!req.session.cart || req.session.cart.length === 0) {
        return res.redirect('/cart');
    }
    res.render('shop/checkout', { title: 'Оформление заказа' });
});

router.post('/checkout', async (req, res) => {
    try {
        let { customer_name, customer_phone, customer_address } = req.body;
        
        if (!req.session.cart || req.session.cart.length === 0) {
            return res.redirect('/cart');
        }
        
        const customer = req.session.customer;
        
        if (customer) {
            customer_name = customer.fullName;
            customer_phone = customer.phone || customer_phone;
            customer_address = customer.address || customer_address;
        }
        
        const ids = req.session.cart.map(item => item.id);
        const [products] = await pool.query('SELECT * FROM products WHERE id IN (?)', [ids]);
        
        let total = 0;
        const orderItems = [];
        
        for (const cartItem of req.session.cart) {
            const product = products.find(p => p.id === cartItem.id);
            if (product) {
                total += product.price * cartItem.quantity;
                orderItems.push({
                    product_id: product.id,
                    quantity: cartItem.quantity,
                    price: product.price
                });
                
                await pool.query('UPDATE products SET stock = stock - ? WHERE id = ?', [cartItem.quantity, product.id]);
            }
        }
        
        const customerId = customer?.id || null;
        
        const [orderResult] = await pool.query(
            'INSERT INTO orders (customer_id, customer_name, customer_phone, customer_address, total) VALUES (?, ?, ?, ?, ?)',
            [customerId, customer_name, customer_phone, customer_address, total]
        );
        
        for (const item of orderItems) {
            await pool.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderResult.insertId, item.product_id, item.quantity, item.price]
            );
        }
        
        req.session.cart = [];
        
        res.render('shop/order-success', { 
            title: 'Заказ оформлен',
            orderId: orderResult.insertId,
            total
        });
    } catch (error) {
        console.error(error);
        res.redirect('/cart');
    }
});

module.exports = router;
