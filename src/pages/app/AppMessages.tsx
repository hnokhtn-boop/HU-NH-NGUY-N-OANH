import React, { useEffect, useState, useRef } from 'react';
import { dataProvider } from '../../core/provider';
import { MessageThread, Message, Student, ClassInfo } from '../../core/types';
import { Send, User } from 'lucide-react';

export const AppMessages = () => {
    const userStr = localStorage.getItem('currentUser');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const studentId = currentUser?.studentId || 'student-1';
    
    const [thread, setThread] = useState<MessageThread | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [className, setClassName] = useState('...');
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadThread = async () => {
            const allThreads = await dataProvider.list<MessageThread>('messageThreads');
            let t = allThreads.find(th => th.threadKey === studentId);
            if (!t) {
                // Should exist from admin, but just in case
                t = await dataProvider.add<MessageThread>('messageThreads', {
                    threadKey: studentId,
                    participantsJson: JSON.stringify([{ role: 'TEACHER' }, { role: 'PARENT' }]),
                    lastMessageAt: new Date().toISOString()
                });
            }
            setThread(t);

            // Fetch class name
            try {
                const students = await dataProvider.list<Student>('students');
                const student = students.find(s => s.id === studentId);
                if (student) {
                    const classes = await dataProvider.list<ClassInfo>('classes');
                    const cls = classes.find(c => c.id === student.classId);
                    if (cls) {
                        setClassName(cls.name);
                    }
                }
            } catch (error) {
                console.error(error);
            }
        };
        loadThread();
    }, []);

    useEffect(() => {
        if (thread) {
            loadMessages();
        }
    }, [thread]);

    const loadMessages = async () => {
        if (!thread) return;
        const msgs = await dataProvider.listMessages(thread.id);
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
        if (!thread || !newMessage.trim()) return;

        await dataProvider.sendMessage(thread.id, {
            threadId: thread.id,
            fromRole: 'PARENT', // Assuming parent is using the app
            content: newMessage,
            createdAt: new Date().toISOString()
        });
        
        setNewMessage('');
        loadMessages();
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 h-[calc(100vh-120px)] flex flex-col">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Tin nhắn</h1>
                <p className="text-gray-500 mt-1">Trao đổi trực tiếp với GVCN</p>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center shadow-sm z-10 bg-blue-50">
                    <div className="bg-white p-2 rounded-full text-blue-600 mr-3 border border-blue-200">
                        <User size={20} />
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-900">GVCN ({className})</h2>
                        <p className="text-xs text-blue-600 font-medium">Hỗ trợ nhanh chóng</p>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                    {messages.map(msg => {
                        const isMine = msg.fromRole === 'PARENT' || msg.fromRole === 'STUDENT';
                        return (
                            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] rounded-2xl p-3 ${
                                    isMine 
                                    ? 'bg-blue-600 text-white rounded-br-sm' 
                                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                                }`}>
                                    {!isMine && (
                                        <div className="text-xs font-semibold text-blue-600 mb-1">
                                            GVCN ({className})
                                        </div>
                                    )}
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                    <div className={`text-[10px] mt-1.5 text-right ${isMine ? 'text-blue-100' : 'text-gray-400'}`}>
                                        {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                            <div className="bg-white p-3 rounded-full border border-gray-100 shadow-sm">
                                <User size={32} className="text-gray-300" />
                            </div>
                            <p className="text-sm">Chưa có tin nhắn nào. Đặt câu hỏi cho GVCN ngay!</p>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-gray-100">
                    <form onSubmit={handleSendMessage} className="flex space-x-2">
                        <input 
                            type="text"
                            placeholder="Nhập tin nhắn của bạn..."
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
            </div>
        </div>
    );
};
