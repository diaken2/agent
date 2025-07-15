import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import bcrypt from 'bcryptjs';

async function createAdmin() {
  try {
    await AppDataSource.initialize();
    
    const userRepository = AppDataSource.getRepository(User);
    
    // Проверяем, существует ли уже админ
    const existingAdmin = await userRepository.findOne({ 
      where: { role: UserRole.ADMIN } 
    });
    
    if (existingAdmin) {
      console.log('Администратор уже существует');
      return;
    }
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = userRepository.create({
      username: 'admin',
      password: hashedPassword,
      fullName: 'Администратор',
      role: UserRole.ADMIN
    });
    
    await userRepository.save(admin);
    console.log('Администратор создан успешно');
    console.log('Логин: admin');
    console.log('Пароль: admin123');
    
  } catch (error) {
    console.error('Ошибка при создании администратора:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

createAdmin(); 