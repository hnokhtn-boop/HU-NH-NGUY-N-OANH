import React, { useEffect, useState } from 'react';
import { dataProvider } from '../../core/provider';
import { Announcement } from '../../core/types';
import { Bell, Pin } from 'lucide-react';

export const AppAnnouncements = () => {
    const userStr = localStorage.getItem('currentUser');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const classId = currentUser?.classId || 'class-1';
    
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            const allAnn = await dataProvider.list<Announcement>('announcements');
            const classAnn = allAnn.filter(a => a.classId === classId && (a.target === 'all' || a.target === 'student'));
            
            // Sort by pinned first, then by date descending
            classAnn.sort((a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            
            setAnnouncements(classAnn);
        };
        fetchAnnouncements();
    }, []);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Bell className="mr-3 text-orange-500" size={28} />
                    Thông báo lớp học
                </h1>
                <p className="text-gray-500 mt-1 ml-10">Cập nhật những thông tin mới nhất từ giáo viên chủ nhiệm</p>
            </div>

            <div className="space-y-4">
                {announcements.map(ann => (
                    <div key={ann.id} className={`bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow relative overflow-hidden ${ann.pinned ? 'border-orange-200' : 'border-gray-100'}`}>
                        {ann.pinned && (
                            <div className="absolute top-0 right-0 bg-orange-100 text-orange-700 px-3 py-1 text-xs font-semibold rounded-bl-lg flex items-center">
                                <Pin size={12} className="mr-1" /> TIN QUAN TRỌNG
                            </div>
                        )}
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 pr-24">{ann.title}</h2>
                        </div>
                        <p className="text-gray-700 leading-relaxed mb-6 whitespace-pre-line">{ann.content}</p>
                        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                            <div className="text-xs text-gray-500 font-medium">
                                Đăng ngày: {new Date(ann.createdAt).toLocaleDateString('vi-VN')}
                            </div>
                            <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg font-medium">
                                Thông báo chung
                            </span>
                        </div>
                    </div>
                ))}
                
                {announcements.length === 0 && (
                    <div className="bg-white p-12 rounded-xl text-center text-gray-500 border border-gray-100 shadow-sm flex flex-col items-center">
                        <Bell size={48} className="text-gray-300 mb-4" />
                        <p>Hiện không có thông báo nào.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
