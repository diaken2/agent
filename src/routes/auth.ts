import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();
const userRepository = AppDataSource.getRepository(User);

// Регистрация агента
router.post('/register', async (req, res) => {
  try {
    const { username, password, fullName } = req.body;

    const existingUser = await userRepository.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'Пользователь уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = userRepository.create({
      username,
      password: hashedPassword,
      fullName,
      role: UserRole.AGENT
    });

    await userRepository.save(user);

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Агент успешно зарегистрирован',
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        telegramChatId: user.telegramChatId
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Логин
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await userRepository.findOne({ where: { username } });
    if (!user) {
      return res.status(400).json({ message: 'Неверные учетные данные' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Неверные учетные данные' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Успешный вход',
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        telegramChatId: user.telegramChatId
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удаление пользователя (только админ)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userRepository.findOne({ where: { id: parseInt(id) } });
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    if (user.role === UserRole.ADMIN) {
      return res.status(403).json({ message: 'Нельзя удалить администратора' });
    }
    await userRepository.remove(user);
    res.json({ message: 'Пользователь удалён' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение всех агентов (только админ)
router.get('/agents', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const agents = await userRepository.find({ where: { role: UserRole.AGENT } });
    res.json(agents);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение данных текущего пользователя
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Не авторизован' });
    }
    
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      telegramChatId: user.telegramChatId
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Сохранение chat_id Telegram для агента
router.post('/set-telegram', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { chatId } = req.body;
    if (!userId || !chatId) {
      return res.status(400).json({ message: 'Нет данных' });
    }
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    user.telegramChatId = chatId;
    await userRepository.save(user);
    res.json({ message: 'Telegram chat_id сохранён' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

export default router; 