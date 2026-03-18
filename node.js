const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

console.log('Starting server...');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

console.log('Middleware loaded');

let users = {};
let orders = [];

let products = [
    { id: 1, name: "Stoneware Pour-Over Set", category: "Kitchen", price: 42, visual: "Warm Sand", description: "Hand-glazed ceramic set for slow mornings.", color: "linear-gradient(130deg, #f6d7b0, #f1e8d5)" },
    { id: 2, name: "Linen Throw Blanket", category: "Home", price: 58, visual: "Terracotta Weave", description: "Airy linen blend with a soft drape.", color: "linear-gradient(130deg, #f1baa2, #f6e2d3)" },
    { id: 3, name: "Brass Desk Lamp", category: "Office", price: 71, visual: "Brushed Gold", description: "Focused light with a warm matte finish.", color: "linear-gradient(130deg, #edd08f, #f8eed8)" },
    { id: 4, name: "Everyday Knit Tee", category: "Apparel", price: 34, visual: "Moss Green", description: "Breathable knit built for all-season wear.", color: "linear-gradient(130deg, #b9c8a2, #edf3e3)" },
    { id: 5, name: "Glass Meal Prep Set", category: "Kitchen", price: 49, visual: "Cloud White", description: "Stackable glass containers with bamboo lids.", color: "linear-gradient(130deg, #d7e0df, #f4f8f8)" },
    { id: 6, name: "Walnut Catchall Tray", category: "Home", price: 26, visual: "Dark Walnut", description: "Keeps keys, cards, and essentials together.", color: "linear-gradient(130deg, #c1a487, #f2e3d4)" },
    { id: 7, name: "Canvas Weekender Bag", category: "Apparel", price: 84, visual: "Sun Clay", description: "Spacious carryall with reinforced straps.", color: "linear-gradient(130deg, #ebb29e, #f9e2d7)" },
    { id: 8, name: "Modular Notebook Set", category: "Office", price: 22, visual: "Slate + Cream", description: "Interchangeable pages for projects and ideas.", color: "linear-gradient(130deg, #d7d4cf, #f6f4ef)" }
];

console.log('Products loaded');

app.get('/api/products', (req, res) => {
    res.json(products);
});

app.get('/api/products/:id', (req, res) => {
    const product = products.find(p => p.id === parseInt(req.params.id));
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
});

app.post('/api/auth/signup', (req, res) => {
    const { name, email, password } = req.body;
    if (!email || !password || !name) {
        return res.status(400).json({ error: 'Please provide name, email, and password' });
    }
    if (users[email]) {
        return res.status(400).json({ error: 'Email already registered' });
    }
    users[email] = { name, email, password };
    console.log("Account created:", email);
    res.json({ ok: true, message: 'Account created', user: { name, email } });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Please provide email and password' });
    }
    const user = users[email];
    if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }
    console.log('Logged in:', email);
    res.json({ ok: true, message: 'Logged in', user: { name: user.name, email } });
});

app.post('/api/cart', (req, res) => {
    const { items } = req.body;
    console.log("Cart received:", items);
    res.json({ ok: true, cartId: 'cart-' + Date.now() });
});

app.post('/api/checkout', (req, res) => {
    const { items, email } = req.body;
    let total = 0;
    items.forEach(({ id, qty }) => {
        const product = products.find(p => p.id === id);
        if (product) total += product.price * qty;
    });
    const order = {
        id: 'order-' + Date.now(),
        email,
        items,
        total,
        status: 'pending',
        timestamp: new Date()
    };
    orders.push(order);
    console.log('Order created:', order);
    res.json({ ok: true, orderId: order.id, total, message: 'Order completed' });
});

app.get('/api/admin/orders', (req, res) => {
    res.json(orders);
});

console.log('Routes configured');

const PORT = process.env.PORT || 5501;
const server = app.listen(PORT, () => {
    console.log(`✓ Backend running on http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop');
});

server.on('error', (err) => {
    console.error('Server error:', err);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err);
});