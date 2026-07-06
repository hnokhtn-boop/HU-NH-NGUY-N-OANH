import React, { useEffect, useState } from 'react';
import { dataProvider } from '../../core/provider';
import { Student, Announcement, Task, Behavior } from '../../core/types';
import { Users, BookOpen, Bell, CheckCircle, ThumbsUp, AlertTriangle } from 'lucide-react';

export const AdminDashboard = () => {
    const [stats, setStats] = useState({
        students: 0,
        attendanceRate: 0,
        announcements: 0,
        praisePoints: 0,
        warnCount: 0,
    });

    useEffect(() => {
        const fetchStats = async () => {
            const [students, announcements, behaviors] = await Promise.all([
                dataProvider.list<Student>('students'),
                dataProvider.list<Announcement>('announcements'),
                dataProvider.list<Behavior>('behaviors'),
            ]);

            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const thisMonthBehaviors = behaviors.filter(b => {
                const bDate = new Date(b.date);
                return bDate.getMonth() === currentMonth && bDate.getFullYear() === currentYear;
            });

            const praisePoints = thisMonthBehaviors
                .filter(b => b.type === 'praise')
                .reduce((sum, b) => sum + b.points, 0);

            const warnCount = thisMonthBehaviors
                .filter(b => b.type === 'warn').length;

            setStats({
                students: students.length,
                attendanceRate: 98, // Mocked stat for now
                announcements: announcements.length,
                praisePoints,
                warnCount,
            });
        };
        fetchStats();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
                <p className="text-gray-500 mt-1">Thông tin chi tiết về lớp học của bạn</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Stats Cards */}
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Tổng số học sinh</p>
                        <h3 className="text-2xl font-bold text-gray-900">{stats.students}</h3>
                    </div>
                 </div>

                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Tỉ lệ chuyên cần</p>
                        <h3 className="text-2xl font-bold text-gray-900">{stats.attendanceRate}%</h3>
                    </div>
                 </div>

                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                        <Bell size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Thông báo mới</p>
                        <h3 className="text-2xl font-bold text-gray-900">{stats.announcements}</h3>
                    </div>
                 </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Lịch trình & Việc cần làm</h2>
                    <div className="text-gray-500 text-sm py-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
                        Chưa có lịch trình nào sắp tới.
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Nề nếp tháng này</h2>
                    <div className="space-y-4">
                         <div className="flex items-center p-4 bg-green-50 rounded-lg border border-green-100">
                             <ThumbsUp className="text-green-600 mr-4" size={24} />
                             <div>
                                 <p className="text-sm text-green-800 font-medium">Tổng điểm khen</p>
                                 <p className="text-2xl font-bold text-green-700">+{stats.praisePoints}</p>
                             </div>
                         </div>
                         <div className="flex items-center p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                             <AlertTriangle className="text-yellow-600 mr-4" size={24} />
                             <div>
                                 <p className="text-sm text-yellow-800 font-medium">Số lần nhắc nhở</p>
                                 <p className="text-2xl font-bold text-yellow-700">{stats.warnCount}</p>
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
