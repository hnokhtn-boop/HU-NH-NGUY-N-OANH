import { Attendance, Behavior, Message, Report, TaskReply, ClassReport } from './types';

export interface DataProvider {
  // Generic Methods
  list<T>(resource: string, params?: any): Promise<T[]>;
  get<T>(resource: string, id: string): Promise<T | null>;
  add<T>(resource: string, data: Omit<T, 'id'>): Promise<T>;
  update<T>(resource: string, id: string, data: Partial<T>): Promise<T>;
  remove(resource: string, id: string): Promise<boolean>;

  // Specific Methods
  markAttendance(payload: { classId: string; date: string; items: { studentId: string; status: 'present' | 'absent' | 'late'; note?: string }[] }): Promise<void>;
  listAttendanceByStudent(studentId: string, startDate: string, endDate: string): Promise<Attendance[]>;
  addBehavior(behavior: Omit<Behavior, 'id'>): Promise<Behavior>;
  listBehaviorByStudent(studentId: string, startDate: string, endDate: string): Promise<Behavior[]>;
  sendMessage(threadId: string, message: Omit<Message, 'id'>): Promise<Message>;
  listMessages(threadId: string): Promise<Message[]>;
  replyTask(taskId: string, authorId: string, content: string): Promise<TaskReply>;
  reportsWeekly(classId: string, startDate: string, endDate: string): Promise<ClassReport>;
  reportsMonthly(classId: string, monthDate: string): Promise<ClassReport>;
}
