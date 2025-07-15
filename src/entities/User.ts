import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Application } from './Application';

export enum UserRole {
  AGENT = 'agent',
  ADMIN = 'admin'
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  password: string;

  @Column()
  fullName: string;

  @Column({
    type: 'varchar',
    default: UserRole.AGENT
  })
  role: UserRole;

  @Column({ nullable: true })
  telegramChatId: string;

  @OneToMany(() => Application, application => application.agent, { cascade: true, onDelete: 'CASCADE' })
  applications: Application[];

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
} 