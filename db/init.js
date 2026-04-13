const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function initDatabase() {
    const connection = await mysql.createConnection({
        host: 'sql8.freesqldatabase.com',
        user: 'sql8823111',
        password: '4t8P6aSIIE',
        database: 'sql8823111',
        port: 3306,
        multipleStatements: true
    });

    await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role ENUM('owner', 'warehouse_manager', 'orders_manager') NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS products (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            stock INT DEFAULT 0,
            image VARCHAR(255) DEFAULT '/images/product.png',
            category VARCHAR(100),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS orders (
            id INT PRIMARY KEY AUTO_INCREMENT,
            customer_id INT,
            customer_name VARCHAR(100) NOT NULL,
            customer_phone VARCHAR(20) NOT NULL,
            customer_address TEXT NOT NULL,
            status ENUM('pending', 'processing', 'assembled', 'shipped') DEFAULT 'pending',
            total DECIMAL(10,2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS order_items (
            id INT PRIMARY KEY AUTO_INCREMENT,
            order_id INT NOT NULL,
            product_id INT NOT NULL,
            quantity INT NOT NULL,
            price DECIMAL(10,2) NOT NULL
        )
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS customers (
            id INT PRIMARY KEY AUTO_INCREMENT,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            phone VARCHAR(20),
            address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    if (users[0].count === 0) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await connection.query(
            'INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)',
            ['admin', hashedPassword, 'owner', 'Владелец магазина']
        );
        console.log('Admin user created: admin / admin123');
    }

    const [products] = await connection.query('SELECT COUNT(*) as count FROM products');
    if (products[0].count === 0) {
        const sampleProducts = [
            ['Смартфон Xiaomi Redmi Note 12', 'Флагманский смартфон с AMOLED дисплеем 6.67"', 24999.00, 50, '/images/phones/phone.jpg', 'Смартфоны'],
            ['Ноутбук ASUS VivoBook 15', '15.6" Full HD, Intel Core i5, 8GB RAM, 512GB SSD', 54999.00, 30, '/images/laptops/laptop.jpg', 'Ноутбуки'],
            ['Наушники Sony WH-1000XM5', 'Беспроводные наушники с шумоподавлением', 32999.00, 45, '/images/audio/headphones.jpg', 'Аудио'],
            ['Умные часы Apple Watch SE', 'GPS, пульсометр, водонепроницаемость', 27999.00, 25, '/images/wearables/watch.jpg', 'Часы'],
            ['Планшет Samsung Galaxy Tab S9', '11" AMOLED, S Pen в комплекте', 64999.00, 20, '/images/tablets/tablet.jpg', 'Планшеты'],
            ['Игровая консоль PlayStation 5', 'Digital Edition, 825GB SSD', 45999.00, 15, '/images/gaming/ps5.jpg', 'Игровые консоли'],
            ['Фотоаппарат Canon EOS R50', 'Беззеркальная камера 24.2 МП', 69999.00, 10, '/images/cameras/camera.jpg', 'Фототехника'],
            ['Колонка JBL Flip 6', 'Портативная, 12 часов работы, водонепроницаемая', 8999.00, 60, '/images/audio/speaker.jpg', 'Аудио'],
            ['Фитнес-браслет Huawei Band 8', 'AMOLED экран, 14 дней автономности', 3999.00, 100, '/images/wearables/band.jpg', 'Часы'],
            ['Робот-пылесос Roborock S8', 'Лазерная навигация, влажная уборка', 34999.00, 35, '/images/home/vacuum.jpg', 'Техника для дома']
        ];

        for (const product of sampleProducts) {
            await connection.query(
                'INSERT INTO products (name, description, price, stock, image, category) VALUES (?, ?, ?, ?, ?, ?)',
                product
            );
        }
        console.log('Sample products created');
    }

    console.log('Database initialized successfully!');
    await connection.end();
}

initDatabase().catch(console.error);
