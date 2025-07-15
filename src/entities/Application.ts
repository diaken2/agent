import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

export enum ApplicationStatus {
  NEW = 'new',
  ACCEPTED = 'accepted',
  SUCCESS = 'success',
  REJECTED = 'rejected',
  PAID = 'paid' // Оплачено
}

@Entity()
export class Application {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  clientAddress: string;

  @Column()
  clientFullName: string;

  @Column()
  clientPhone: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({
    type: 'varchar',
    default: ApplicationStatus.NEW
  })
  status: ApplicationStatus;

  @ManyToOne(() => User, user => user.applications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: User;

  @Column()
  agentId: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
} 