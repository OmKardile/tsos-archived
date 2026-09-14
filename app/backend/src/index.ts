import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { pool } from './db/pool.js';
import { migrate } from './db/migrate.js';
import { initFirebase } from './services/firebase.js';
import authRoutes from './routes/auth.js';
import menuRoutes from './routes/menu.js';
import locationRoutes from './routes/locations.js';
import notificationRoutes from './routes/notifications.js';
import orderRoutes from './routes/orders.js';
import tableRoutes from './routes/tables.js';
import publicRoutes from './routes/public.js';
import inventoryRoutes from './routes/inventory.js';
import customerRoutes from './routes/customers.js';
import reportRoutes from './routes/reports.js';
import settingsRoutes from './routes/settings.js';

const app = express();
const server = createServer(app);

const io = new SocketServer(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
});

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json());

// Make io available to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

// Socket.io
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_location', (locationId: string) => {
    socket.join(`location:${locationId}`);
    console.log(`Socket ${socket.id} joined location:${locationId}`);
  });

  socket.on('leave_location', (locationId: string) => {
    socket.leave(`location:${locationId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await migrate();
    await initFirebase();
    server.listen(PORT, () => {
      console.log(`TSOS API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
