const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/connection');
const { redirectIfAuthenticated } = require('../middleware/auth');

const router = express.Router();

router.get('/login', redirectIfAuthenticated, (req, res) => {
    res.render('admin/login', { title: 'Вход', error: null });
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        
        if (users.length === 0) {
            return res.render('admin/login', { title: 'Вход', error: 'Неверный логин или пароль' });
        }
        
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.render('admin/login', { title: 'Вход', error: 'Неверный логин или пароль' });
        }
        
        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            fullName: user.full_name
        };
        
        res.redirect('/admin');
    } catch (error) {
        console.error(error);
        res.render('admin/login', { title: 'Вход', error: 'Ошибка сервера' });
    }
});

module.exports = router;
