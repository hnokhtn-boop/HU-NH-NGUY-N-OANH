export interface ClassInfo {
  id: string;
  name: string;
  teacherId: string;
  schoolYear?: string;
  description?: string;
}

export interface Student {
  id: string;
  classId: string;
  name: string;
  dateOfBirth: string;
  gender?: 'male' | 'female' | 'other';
  group?: string;
  address?: string;
  parentId: string;
  status?: 'active' | 'inactive';
  username?: string;
  password?: string;
}

export interface Parent {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  relationship?: string;
  studentIds?: string[];
}

export interface Attendance {
  id: string;
  classId: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  note?: string;
}

export interface Behavior {
  id: string;
  studentId: string;
  date: string;
  type: 'praise' | 'warn';
  content: string;
  points: number;
}

export interface Announcement {
  id: string;
  classId: string;
  title: string;
  content: string;
  target: 'parent' | 'student' | 'all';
  pinned: boolean;
  createdAt: string;
}

export interface Task {
  id: string;
  classId: string;
  studentId?: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'completed';
}

export interface TaskReply {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  date: string;
}

export interface MessageThread {
  id: string;
  threadKey: string;
  participantsJson: string;
  lastMessageAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  fromRole: 'TEACHER' | 'PARENT' | 'STUDENT';
  content: string;
  createdAt: string;
}

export interface Document {
  id: string;
  classId: string;
  title: string;
  url: string;
  category: string;
  createdAt: string;
}

export interface Report {
  id: string;
  studentId: string;
  periodStart: string;
  periodEnd: string;
  attendanceSummary: { present: number; absent: number; late: number };
  behaviorPoints: number;
  comments: string;
  type: 'weekly' | 'monthly';
}

export interface ClassReport {
  attendanceRate: number;
  absentCount: number;
  lateCount: number;
  topPraise: { studentId: string; name: string; score: number }[];
  topWarn: { studentId: string; name: string; score: number }[];
  overdueTasks: number;
  parentResponses: number;
}

export interface BehaviorCriterion {
  id: string;
  type: 'praise' | 'warn';
  content: string;
  points: number;
}
