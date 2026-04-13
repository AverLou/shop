const express = require('express');
const pool = require('../db/connection');

const router = express.Router();

router.get('/cart', async (req, res) => {
    try {
        const cart = req.session.cart || [];
        
        if (cart.length === 0) {
            return res.json({ items: [], total: 0 });
        }
        
        const ids = cart.map(item => item.id);
        const [products] = await pool.query('SELECT id, name, price, stock FROM products WHERE id IN (?)', [ids]);
        
        const items = cart.map(cartItem => {
            const product = products.find(p => p.id === cartItem.id);
            if (product) {
                return {
                    id: product.id,
                    name: product.name,
                    price: parseFloat(product.price),
                    quantity: cartItem.quantity,
                    stock: product.stock
                };
            }
            return null;
        }).filter(Boolean);
        
        const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        
        res.json({ items, total });
    } catch (error) {
        console.error('Cart API error:', error);
        res.json({ items: [], total: 0 });
    }
});

module.exports = router;
