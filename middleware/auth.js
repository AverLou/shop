function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/admin/login');
    }
    next();
}

function requireWarehouseManager(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/admin/login');
    }
    const { role } = req.session.user;
    if (role !== 'owner' && role !== 'warehouse_manager') {
        return res.status(403).send('Доступ запрещён');
    }
    next();
}

function requireOrdersManager(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/admin/login');
    }
    const { role } = req.session.user;
    if (role !== 'owner' && role !== 'orders_manager') {
        return res.status(403).send('Доступ запрещён');
    }
    next();
}

function requireOwner(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/admin/login');
    }
    if (req.session.user.role !== 'owner') {
        return res.status(403).send('Доступ запрещён');
    }
    next();
}

function redirectIfAuthenticated(req, res, next) {
    if (req.session.user) {
        return res.redirect('/admin');
    }
    next();
}

module.exports = {
    requireAuth,
    requireWarehouseManager,
    requireOrdersManager,
    requireOwner,
    redirectIfAuthenticated
};
