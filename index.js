const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: '*'
}));
app.use(express.json());

// SSE clients list
let clients = [];

// SSE endpoint
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  clients.push(res);
  req.on('close', () => {
    clients = clients.filter(c => c !== res);
  });
});

// Notify function — orderController mein use hogi
function notifyClients(data) {
  clients.forEach(c => c.write(`data: ${JSON.stringify(data)}\n\n`));
}

// Ye export karo taake orderController use kar sake
app.locals.notifyClients = notifyClients;

app.use('/api/auth',   require('./routes/auth'));
app.use('/api/menu',   require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));

app.get('/', (req, res) => {
    res.json({ message: 'Restaurant POS API running!' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});