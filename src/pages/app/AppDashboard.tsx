import React, { useEffect, useState } from 'react';
import { dataProvider } from '../../core/provider';
import { Announcement, Behavior } from '../../core/types';
import { ThumbsUp, AlertTriangle, BookOpen } from 'lucide-react';

export const AppDashboard = () => {
    const userStr = localStorage.getItem('currentUser');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const studentId = currentUser?.studentId || 'student-1';
    const classId = currentUser?.classId || 'class-1';

    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [stats, setStats] = useState({
        praisePoints: 0,
        warnCount: 0
    });

    useEffect(() => {
        const fetchAnnouncements = async () => {
            const allAnn = await dataProvider.list<Announcement>('announcements');
            const filtered = allAnn.filter(a => a.classId === classId && (a.target === 'all' || a.target === 'student'));
            setAnnouncements(filtered);
        };
        fetchAnnouncements();
    }, [classId]);

    useEffect(() => {
        const fetchStats = async () => {
             const now = new Date();
             const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
             const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
             
             const behaviors = await dataProvider.listBehaviorByStudent(studentId, startOfMonth, endOfMonth);
             
             const praisePoints = behaviors
                 .filter(b => b.type === 'praise')
                 .reduce((sum, b) => sum + b.points, 0);
             const warnCount = behaviors
                 .filter(b => b.type === 'warn').length;
                 
             setStats({ praisePoints, warnCount });
        };
        fetchStats();
    }, [studentId]);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Tổng quan tháng này</h1>
                <p className="text-gray-500 mt-1">Hoạt động nề nếp và thông báo mới nhất</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 flex items-center justify-between">
                     <div>
                         <p className="text-sm font-medium text-green-800 mb-1">Điểm rèn luyện tích cực</p>
                         <h3 className="text-3xl font-bold text-green-700">+{stats.praisePoints}</h3>
                     </div>
                     <div className="p-4 bg-white bg-opacity-60 rounded-full">
                         <ThumbsUp size={32} className="text-green-600" />
                     </div>
                 </div>

                 <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl border border-yellow-200 flex items-center justify-between">
                     <div>
                         <p className="text-sm font-medium text-yellow-800 mb-1">Số lần nhắc nhở</p>
                         <h3 className="text-3xl font-bold text-yellow-700">{stats.warnCount}</h3>
                     </div>
                     <div className="p-4 bg-white bg-opacity-60 rounded-full">
                         <AlertTriangle size={32} className="text-yellow-600" />
                     </div>
                 </div>
            </div>

            <div>
                <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center"><BookOpen className="mr-2" /> Bảng tin lớp học</h2>
                <div className="space-y-4">
                    {announcements.map(ann => (
                        <div key={ann.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                 <h2 className="text-lg font-semibold text-gray-900">{ann.title}</h2>
                                 <span className="text-xs font-medium px-2.5 py-1 bg-orange-100 text-orange-800 rounded-full">
                                    Thông báo
                                 </span>
                            </div>
                            <p className="text-gray-700 leading-relaxed mb-4 text-sm">{ann.content}</p>
                            <div className="flex items-center text-xs text-gray-500">
                                <span>Đăng ngày: {new Date(ann.createdAt).toLocaleDateString('vi-VN')}</span>
                            </div>
                        </div>
                    ))}
                    
                    {announcements.length === 0 && (
                       <div className="bg-white p-8 rounded-xl text-center text-gray-500 border border-dashed border-gray-300">
                            Chưa có thông báo nào.
                       </div>
                    )}
                </div>
            </div>
        </div>
    )
}
