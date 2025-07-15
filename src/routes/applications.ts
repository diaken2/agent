import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { Application, ApplicationStatus } from '../entities/Application';
import { User, UserRole } from '../entities/User';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import axios from 'axios';

const router = Router();
const applicationRepository = AppDataSource.getRepository(Application);
const userRepository = AppDataSource.getRepository(User);

const TELEGRAM_TOKEN = '7738911641:AAHOiXzx9dYqAQZXmpf8hZOoeTRo8gRJoi0';
const ADMIN_CHAT_ID = '973416651';

// Функция для перевода статусов на русский язык
function getStatusInRussian(status: ApplicationStatus): string {
  const statusTranslations = {
    [ApplicationStatus.NEW]: 'Новая',
    [ApplicationStatus.ACCEPTED]: 'Принята',
    [ApplicationStatus.SUCCESS]: 'Успешно',
    [ApplicationStatus.REJECTED]: 'Отклонена',
    [ApplicationStatus.PAID]: 'Оплачено'
  };
  return statusTranslations[status] || status;
}

async function sendTelegramToAdmin(text: string) {
  await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    chat_id: ADMIN_CHAT_ID,
    text,
    parse_mode: 'HTML',
  });
}

async function sendTelegramToAgent(chatId: string, text: string) {
  await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  });
}

// Создание новой заявки (только агенты)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { clientAddress, clientFullName, clientPhone, comment } = req.body;
    const agentId = req.user?.userId; // Из JWT токена

    if (!agentId) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const agent = await userRepository.findOne({ where: { id: agentId } });
    if (!agent || agent.role !== UserRole.AGENT) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const application = applicationRepository.create({
      clientAddress,
      clientFullName,
      clientPhone,
      comment,
      agentId
    });

    await applicationRepository.save(application);

    // Уведомление админу в Telegram
    await sendTelegramToAdmin(
      `🆕 <b>Новая заявка</b>\n\n👤 <b>Агент:</b> ${agent.fullName}\n👥 <b>Клиент:</b> ${clientFullName}\n📞 <b>Телефон:</b> ${clientPhone}\n📍 <b>Адрес:</b> ${clientAddress}${comment ? `\n💬 <b>Комментарий:</b> ${comment}` : ''}\n\n📊 <b>Статус:</b> ${getStatusInRussian(ApplicationStatus.NEW)}`
    );

    res.status(201).json({
      message: 'Заявка создана успешно',
      application
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение заявок агента (только свои заявки)
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const agentId = req.user?.userId;

    if (!agentId) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const applications = await applicationRepository.find({
      where: { agentId },
      order: { createdAt: 'DESC' }
    });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение всех заявок (только админ)
router.get('/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || userRole !== UserRole.ADMIN) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const applications = await applicationRepository.find({
      relations: ['agent'],
      order: { createdAt: 'DESC' }
    });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение заявок конкретного агента (только админ)
router.get('/agent/:agentId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { agentId } = req.params;

    if (!userId || userRole !== UserRole.ADMIN) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const applications = await applicationRepository.find({
      where: { agentId: parseInt(agentId) },
      relations: ['agent'],
      order: { createdAt: 'DESC' }
    });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Изменение статуса заявки (только админ)
router.patch('/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { id } = req.params;
    const { status } = req.body;

    if (!userId || userRole !== UserRole.ADMIN) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    if (!Object.values(ApplicationStatus).includes(status)) {
      return res.status(400).json({ message: 'Неверный статус' });
    }

    const application = await applicationRepository.findOne({ where: { id: parseInt(id) }, relations: ['agent'] });
    if (!application) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    application.status = status;
    application.updatedAt = new Date();
    await applicationRepository.save(application);

    // Уведомление агенту о смене статуса
    if (application.agent && application.agent.telegramChatId) {
      await sendTelegramToAgent(
        application.agent.telegramChatId,
        `📊 <b>Обновление статуса заявки</b>\n\n👥 <b>Клиент:</b> ${application.clientFullName}\n📞 <b>Телефон:</b> ${application.clientPhone}\n📍 <b>Адрес:</b> ${application.clientAddress}\n\n🔄 <b>Новый статус:</b> ${getStatusInRussian(status)}`
      );
    }

    res.json({
      message: 'Статус обновлен',
      application
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удаление заявки (только админ)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { id } = req.params;

    if (!userId || userRole !== UserRole.ADMIN) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const application = await applicationRepository.findOne({ where: { id: parseInt(id) } });
    if (!application) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    await applicationRepository.remove(application);
    res.json({ message: 'Заявка удалена' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

export default router; 