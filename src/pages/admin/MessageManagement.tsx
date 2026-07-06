import React, { useEffect, useState, useRef } from 'react';
import { dataProvider } from '../../core/provider';
import { ClassInfo, Student, MessageThread, Message } from '../../core/types';
import { Send, User } from 'lucide-react';

export const MessageManagement = () => {
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [threads, setThreads] = useState<MessageThread[]>([]);
    
    const [selectedClassId, setSelectedClassId] = useState('');
    const [currentThread, setCurrentThread] = useState<MessageThread | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadInitial = async () => {
            const cls = await dataProvider.list<ClassInfo>('classes');
            setClasses(cls);
            if (cls.length > 0) setSelectedClassId(cls[0].id);
        };
        loadInitial();
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            loadThreads();
            setCurrentThread(null);
        }
    }, [selectedClassId]);

    const loadThreads = async () => {
        // Load students of the class
        const allStudents = await dataProvider.list<Student>('students');
        const classStudents = allStudents.filter(s => s.classId === selectedClassId);
        setStudents(classStudents);

        // Load or create threads for these students
        const allThreads = await dataProvider.list<MessageThread>('messageThreads');
        const classThreads: MessageThread[] = [];
        
        for (const student of classStudents) {
            let thread = allThreads.find(t => t.threadKey === student.id);
            if (!thread) {
                // Auto create thread empty for student
                thread = await dataProvider.add<MessageThread>('messageThreads', {
                    threadKey: student.id,
                    participantsJson: JSON.stringify([{ role: 'TEACHER' }, { role: 'PARENT', id: student.parentId }]),
                    lastMessageAt: new Date().toISOString()
                });
            }
            classThreads.push(thread);
        }
        
        classThreads.sort((a,b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
        setThreads(classThreads);
    };

    useEffect(() => {
        if (currentThread) {
            loadMessages();
        }
    }, [currentThread]);

    const loadMessages = async () => {
        if (!currentThread) return;
        const msgs = await dataProvider.listMessages(currentThread.id);
        setMessages(msgs);
        scrollToBottom();
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentThread || !newMessage.trim()) return;

        await dataProvider.sendMessage(currentThread.id, {
            threadId: currentThread.id,
            fromRole: 'TEACHER',
            content: newMessage,
            createdAt: new Date().toISOString()
        });
        
        setNewMessage('');
        loadMessages();
        loadThreads(); // Refresh thread list to update lastMessageAt
    };

    const getStudentByThreadKey = (key: string) => {
        return students.find(s => s.id === key);
    };

    return (
        <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tin nhắn</h1>
                    <p className="text-gray-500 mt-1">Trao đổi trực tiếp với phụ huynh và học sinh</p>
                </div>
                <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-100">
                    <span className="text-sm font-medium text-gray-700">Lớp:</span>
                    <select 
                        className="border-none bg-transparent focus:ring-0 outline-none text-sm font-semibold text-blue-600"
                        value={selectedClassId}
                        onChange={e => setSelectedClassId(e.target.value)}
                    >
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex overflow-hidden">
                {/* Thread List Sidebar */}
                <div className="w-1/3 border-r border-gray-100 flex flex-col bg-gray-50">
                    <div className="p-4 border-b border-gray-100 bg-white">
                        <h2 className="font-semibold text-gray-800">Danh sách hội thoại</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {threads.map(thread => {
                            const student = getStudentByThreadKey(thread.threadKey);
                            const isActive = currentThread?.id === thread.id;
                            return (
                                <button
                                    key={thread.id}
                                    onClick={() => setCurrentThread(thread)}
                                    className={`w-full text-left p-4 border-b border-gray-100 flex items-center space-x-3 hover:bg-gray-100 transition-colors ${isActive ? 'bg-blue-50 border-l-4 border-l-blue-600 border-b-gray-100' : 'border-l-4 border-l-transparent bg-white'}`}
                                >
                                    <div className="bg-blue-100 p-2 rounded-full text-blue-600 flex-shrink-0">
                                        <User size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-bold text-gray-900 truncate">
                                            PH em {student?.name || 'Không rõ'}
                                        </h3>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                            Cập nhật: {new Date(thread.lastMessageAt).toLocaleDateString('vi-VN')}
                                        </p>
                                    </div>
                                </button>
                            )
                        })}
                        {threads.length === 0 && (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                Lớp này chưa có học sinh.
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-white">
                    {currentThread ? (
                        <>
                            <div className="p-4 border-b border-gray-100 flex items-center shadow-sm z-10">
                                <div className="bg-blue-100 p-2 rounded-full text-blue-600 mr-3">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h2 className="font-bold text-gray-900">
                                        PH em {getStudentByThreadKey(currentThread.threadKey)?.name}
                                    </h2>
                                    <p className="text-xs text-blue-600 font-medium">Hội thoại riêng tư</p>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                                {messages.map(msg => {
                                    const isTeacher = msg.fromRole === 'TEACHER';
                                    return (
                                        <div key={msg.id} className={`flex ${isTeacher ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[75%] rounded-2xl p-3 ${
                                                isTeacher 
                                                ? 'bg-blue-600 text-white rounded-br-sm' 
                                                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                                            }`}>
                                                {!isTeacher && (
                                                    <div className="text-xs font-semibold text-gray-500 mb-1">
                                                        {msg.fromRole === 'PARENT' ? 'Phụ huynh' : 'Học sinh'}
                                                    </div>
                                                )}
                                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                                <div className={`text-[10px] mt-1.5 text-right ${isTeacher ? 'text-blue-100' : 'text-gray-400'}`}>
                                                    {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                {messages.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                                        <div className="bg-gray-100 p-3 rounded-full">
                                            <User size={32} className="text-gray-300" />
                                        </div>
                                        <p className="text-sm">Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!</p>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-4 bg-white border-t border-gray-100">
                                <form onSubmit={handleSendMessage} className="flex space-x-2">
                                    <input 
                                        type="text"
                                        placeholder="Nhập tin nhắn..."
                                        className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm"
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                    />
                                    <button 
                                        type="submit"
                                        disabled={!newMessage.trim()}
                                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white p-2 w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-colors"
                                    >
                                        <Send size={18} className="ml-1" />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                            <div className="bg-white p-4 rounded-full shadow-sm mb-4 border border-gray-100">
                                <User size={48} className="text-blue-200" />
                            </div>
                            <p className="text-gray-500 font-medium">Chọn một phụ huynh để bắt đầu trò chuyện</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
