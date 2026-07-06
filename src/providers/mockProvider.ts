import { v4 as uuidv4 } from 'uuid';
import { DataProvider } from '../core/dataProvider';
import { Attendance, Behavior, Message, Report, TaskReply } from '../core/types';

const STORAGE_KEY = 'class_management_mock_data';

const getData = (): any => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {};
};

const setData = (data: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const seedData = () => {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
        try {
            const parsed = JSON.parse(existing);
            let changed = false;
            if (parsed.announcements) {
                parsed.announcements.forEach((ann: any) => {
                    if (ann.createdAt && ann.createdAt.includes('2023-09-01')) {
                        ann.createdAt = ann.createdAt.replace('2023-09-01', '2025-09-01');
                        changed = true;
                    }
                });
            }
            if (parsed.documents) {
                parsed.documents.forEach((doc: any) => {
                    if (doc.createdAt && doc.createdAt.includes('2023-09-01')) {
                        doc.createdAt = doc.createdAt.replace('2023-09-01', '2025-09-01');
                        changed = true;
                    }
                    if (doc.title && doc.title.includes('2023-2024')) {
                        doc.title = doc.title.replace('2023-2024', '2025-2026');
                        changed = true;
                    }
                });
            }
            if (parsed.classes) {
                parsed.classes.forEach((c: any) => {
                    if (c.schoolYear === '2023-2024') {
                        c.schoolYear = '2025-2026';
                        changed = true;
                    }
                });
            }
            if (changed) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            }
        } catch (e) {
            console.error(e);
        }
        return;
    }
    
    // Seed basic data
    const classes = [{ id: 'class-1', name: 'Lớp 10A1', teacherId: 'teacher-1', schoolYear: '2025-2026', description: 'Lớp chọn khối A' }];
    const parents = [{ id: 'parent-1', name: 'Nguyễn Văn A (Phụ huynh)', phoneNumber: '0123456789', email: 'parentA@example.com', relationship: 'Bố', studentIds: ['student-1'] }];
    const students = [{ id: 'student-1', classId: 'class-1', name: 'Nguyễn Văn B', dateOfBirth: '2010-01-01', gender: 'male', address: 'Hà Nội', parentId: 'parent-1', status: 'active', username: 'student-1', password: 'password123' }];
    
    setData({
        classes,
        parents,
        students,
        attendances: [],
        behaviors: [],
        behaviorCriteria: [
            { id: 'crit-1', type: 'praise', content: 'Hăng hái phát biểu xây dựng bài', points: 2 },
            { id: 'crit-2', type: 'praise', content: 'Làm bài tập về nhà đầy đủ', points: 1 },
            { id: 'crit-3', type: 'warn', content: 'Mất trật tự trong giờ học', points: 2 },
            { id: 'crit-4', type: 'warn', content: 'Không làm bài tập về nhà', points: 5 },
            { id: 'crit-5', type: 'warn', content: 'Đi học muộn', points: 1 }
        ],
        announcements: [{ id: 'ann-1', classId: 'class-1', title: 'Họp phụ huynh đầu năm', content: 'Kính mời quý phụ huynh tham gia họp đầu năm...', target: 'all', pinned: true, createdAt: '2025-09-01T08:00:00Z' }],
        tasks: [],
        taskReplies: [],
        messageThreads: [],
        messages: [],
        documents: [{ id: 'doc-1', classId: 'class-1', title: 'Nội quy lớp học năm 2025-2026', url: '#', category: 'Nội quy', createdAt: '2025-09-01T08:00:00Z' }],
        reports: [],
    });
};

export const mockProvider: DataProvider = {
  async list<T>(resource: string, params?: any): Promise<T[]> {
    const data = getData();
    return data[resource] || [];
  },

  async get<T>(resource: string, id: string): Promise<T | null> {
    const data = getData();
    const items = data[resource] || [];
    return items.find((item: any) => item.id === id) || null;
  },

  async add<T>(resource: string, payload: any): Promise<T> {
    const data = getData();
    if (!data[resource]) data[resource] = [];
    const newItem = { id: uuidv4(), ...payload };
    data[resource].push(newItem);
    setData(data);
    return newItem as T;
  },

  async update<T>(resource: string, id: string, payload: any): Promise<T> {
    const data = getData();
    if (!data[resource]) data[resource] = [];
    const index = data[resource].findIndex((item: any) => item.id === id);
    if (index === -1) throw new Error(`Item ${id} not found in ${resource}`);
    
    data[resource][index] = { ...data[resource][index], ...payload };
    setData(data);
    return data[resource][index] as T;
  },

  async remove(resource: string, id: string): Promise<boolean> {
    const data = getData();
    if (!data[resource]) return false;
    const initialLength = data[resource].length;
    data[resource] = data[resource].filter((item: any) => item.id !== id);
    setData(data);
    return data[resource].length !== initialLength;
  },

  async markAttendance(payload: { classId: string; date: string; items: { studentId: string; status: 'present' | 'absent' | 'late'; note?: string }[] }): Promise<void> {
    const data = getData();
    if (!data.attendances) data.attendances = [];
    
    // Xóa các record cũ của lớp trong cùng ngày (để cập nhật hàng loạt)
    data.attendances = data.attendances.filter(
        (a: Attendance) => !(a.classId === payload.classId && a.date === payload.date)
    );

    // Thêm các record mới
    payload.items.forEach(item => {
        data.attendances.push({
            id: uuidv4(),
            classId: payload.classId,
            date: payload.date,
            studentId: item.studentId,
            status: item.status,
            note: item.note
        });
    });

    setData(data);
  },

  async listAttendanceByStudent(studentId: string, startDate: string, endDate: string): Promise<Attendance[]> {
      const data = getData();
      if (!data.attendances) return [];
      
      const start = new Date(startDate).getTime();
      // Adjust end date to cover the entire day
      const end = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1;

      return data.attendances.filter((a: Attendance) => {
          if (a.studentId !== studentId) return false;
          const aDate = new Date(a.date).getTime();
          return aDate >= start && aDate <= end;
      });
  },

  async addBehavior(behavior: Omit<Behavior, 'id'>): Promise<Behavior> {
    return mockProvider.add<Behavior>('behaviors', behavior);
  },

  async listBehaviorByStudent(studentId: string, startDate: string, endDate: string): Promise<Behavior[]> {
      const data = getData();
      if (!data.behaviors) return [];
      
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1;

      return data.behaviors.filter((b: Behavior) => {
          if (b.studentId !== studentId) return false;
          const bDate = new Date(b.date).getTime();
          return bDate >= start && bDate <= end;
      });
  },

  async sendMessage(threadId: string, message: Omit<Message, 'id'>): Promise<Message> {
    const data = getData();
    
    // Check if thread exists, else error or just let it pass
    // Let's create thread if not exists? Usually we'd assume it exists
    
    const newMessage = await mockProvider.add<Message>('messages', message);
    
    // Update thread's lastMessageAt
    if (!data.messageThreads) data.messageThreads = [];
    const threadIndex = data.messageThreads.findIndex((t: any) => t.id === threadId);
    if (threadIndex !== -1) {
        data.messageThreads[threadIndex].lastMessageAt = message.createdAt;
        setData(data);
    }
    
    return newMessage;
  },

  async listMessages(threadId: string): Promise<Message[]> {
    const data = getData();
    if (!data.messages) return [];
    return data.messages
        .filter((m: Message) => m.threadId === threadId)
        .sort((a: Message, b: Message) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  async replyTask(taskId: string, authorId: string, content: string): Promise<TaskReply> {
    return mockProvider.add<TaskReply>('taskReplies', {
        taskId,
        authorId,
        content,
        date: new Date().toISOString()
    });
  },

  async reportsWeekly(classId: string, startDate: string, endDate: string): Promise<any> {
    return computeReport(classId, startDate, endDate);
  },

  async reportsMonthly(classId: string, monthDate: string): Promise<any> {
    const start = new Date(monthDate);
    start.setDate(1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
    return computeReport(classId, start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
  }
};

const computeReport = (classId: string, startDate: string, endDate: string) => {
    const data = getData();
    const students = (data.students || []).filter((s: any) => s.classId === classId);
    const studentIds = students.map((s: any) => s.id);

    const attendances = (data.attendances || []).filter((a: any) => a.classId === classId && a.date >= startDate && a.date <= endDate);
    let present = 0, absent = 0, late = 0;
    attendances.forEach((a: any) => {
        if (a.status === 'present') present++;
        else if (a.status === 'absent') absent++;
        else if (a.status === 'late') late++;
    });
    const totalAttendances = present + absent + late;
    const attendanceRate = totalAttendances === 0 ? 100 : Math.round((present / totalAttendances) * 100);

    const behaviors = (data.behaviors || []).filter((b: any) => studentIds.includes(b.studentId) && b.date >= startDate && b.date <= endDate);
    const scores: Record<string, number> = {};
    behaviors.forEach((b: any) => {
        scores[b.studentId] = (scores[b.studentId] || 0) + (b.type === 'praise' ? b.points : -b.points);
    });

    const scoreList = Object.keys(scores).map(id => {
        const s = students.find((st: any) => st.id === id);
        return { studentId: id, name: s ? s.name : 'Unknown', points: scores[id] };
    });

    const topPraise = [...scoreList].filter(s => s.points > 0).sort((a,b) => b.points - a.points).slice(0, 3);
    const topWarn = [...scoreList].filter(s => s.points < 0).sort((a,b) => a.points - b.points).slice(0, 3);

    const tasks = (data.tasks || []).filter((t: any) => t.classId === classId);
    let overdueTasks = 0;
    const now = new Date().toISOString().split('T')[0];
    tasks.forEach((t: any) => {
        if (t.status === 'pending' && t.dueDate < now) {
            overdueTasks++;
        }
    });

    const replies = (data.taskReplies || []).filter((r: any) => {
       const task = tasks.find((t: any) => t.id === r.taskId);
       return task && r.date >= startDate && r.date <= endDate;
    });
    const parentResponseSet = new Set(replies.map((r: any) => r.authorId));

    return {
        attendanceRate,
        absentCount: absent,
        lateCount: late,
        topPraise,
        topWarn,
        overdueTasks,
        parentResponses: parentResponseSet.size
    };
};
