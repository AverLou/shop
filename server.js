const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./db/connection');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const apiRoutes = require('./routes/api');
const customerRoutes = require('./routes/customer');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
app.locals.upload = upload;

app.use(session({
    secret: 'shop-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.customer = req.session.customer || null;
    res.locals.cart = req.session.cart || [];
    const cartCount = (req.session.cart || []).reduce((sum, item) => sum + item.quantity, 0);
    res.locals.cartCount = cartCount;
    next();
});

app.use('/api', apiRoutes);
app.use('/', shopRoutes);
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);
app.use('/', customerRoutes);

app.use((req, res) => {
    res.status(404).render('404', { title: 'Страница не найдена' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
