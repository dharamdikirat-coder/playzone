const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: 'https://playzonefunkyland.netlify.app'
}));

app.get('/', (req, res) => {
  res.send('Backend Running');
});

app.get('/api/test', (req, res) => {
  res.json({
    success: true
  });
});

app.get('/api/catalogue', (req, res) => {
  res.json([]);
});

app.get('/api/plans', (req, res) => {
  res.json([]);
});

app.get('/api/events', (req, res) => {
  res.json([]);
});

app.get('/api/members', (req, res) => {
  res.json([]);
});

app.get('/api/staff', (req, res) => {
  res.json([]);
});

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
