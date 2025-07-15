import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import { AppDataSource } from './config/database';
import authRoutes from './routes/auth';
import applicationRoutes from './routes/applications';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// API
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);

// Путь до build из React
const frontendPath = path.join(__dirname, './build');
app.use(express.static(frontendPath));

// SPA fallback (для React Router)
app.get('/{*any}', (req,res)=>{
res.sendFile(path.join(__dirname, 'build', 'index.html'));
})

// Запуск базы и сервера
AppDataSource.initialize()
  .then(() => {
    console.log('✅ Database connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
  });
