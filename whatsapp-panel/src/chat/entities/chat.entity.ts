// src/chat/entities/chat.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserWha } from '../../user/user.entity';
import { Message } from './message.entity';
import { ChatStatus } from '../../common/enums/chat-status.enum'; // <-- 1. IMPORTAR ENUM
import { SurveyResponse } from './survey-response.entity';
import { InternalNote } from './internal-note.entity';

@Entity()
export class Chat {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  contactNumber: string;

  @Column({ nullable: true })
  customerName: string;

  // 2. ACTUALIZAR LA COLUMNA DE ESTADO
  @Column({
    type: 'enum',
    enum: ChatStatus,
    default: ChatStatus.AUTO_RESPONDER,
  })
  status: ChatStatus; // <-- El tipo ahora es ChatStatus

  @ManyToOne(() => UserWha, (user) => user.chats, { nullable: true })
  assignedTo: UserWha;

  @OneToMany(() => Message, (m) => m.chat)
  messages: Message[];
  // ✅ 2. AÑADIR LA NUEVA RELACIÓN
  @OneToMany(() => SurveyResponse, (response) => response.chat)
  surveyResponses: SurveyResponse[];

  @OneToMany(() => InternalNote, (note) => note.chat)
  notes: InternalNote[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}