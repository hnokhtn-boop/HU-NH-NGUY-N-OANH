import React, { useEffect, useState } from 'react';
import { dataProvider } from '../../core/provider';
import { Behavior } from '../../core/types';
import { Calendar, ThumbsUp, AlertTriangle } from 'lucide-react';

export const BehaviorHistory = () => {
    const userStr = localStorage.getItem('currentUser');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const studentId = currentUser?.studentId || 'student-1';
    
    const [behaviors, setBehaviors] = useState<Behavior[]>([]);
    
    // For range filter
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(startOfMonth);
    const [endDate, setEndDate] = useState(endOfMonth);

    useEffect(() => {
        if (startDate && endDate) {
            dataProvider.listBehaviorByStudent(studentId, startDate, endDate)
                .then(data => {
                    // Sort descending by date
                    const sorted = [...data].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    setBehaviors(sorted);
                });
        }
    }, [startDate, endDate]);

    const statPraise = behaviors.filter(b => b.type === 'praise').length;
    const statWarn = behaviors.filter(b => b.type === 'warn').length;
    
    const totalPraisePoints = behaviors.filter(b => b.type === 'praise').reduce((sum, b) => sum + b.points, 0);
    const totalWarnPoints = behaviors.filter(b => b.type === 'warn').reduce((sum, b) => sum + b.points, 0);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
             <div>
                <h1 className="text-2xl font-bold text-gray-900">Lịch sử nề nếp</h1>
                <p className="text-gray-500 mt-1">Xem các bản ghi khen thưởng và nhắc nhở</p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 md:items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="flex flex-col">
                        <label className="text-xs text-gray-500 mb-1">Từ ngày</label>
                        <input 
                            type="date" 
                            className="border border-gray-300 rounded-md p-1.5 text-sm focus:ring-orange-500 outline-none"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs text-gray-500 mb-1">Đến ngày</label>
                        <input 
                            type="date" 
                            className="border border-gray-300 rounded-md p-1.5 text-sm focus:ring-orange-500 outline-none"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex space-x-6">
                    <div className="flex flex-col items-center">
                        <span className="text-2xl font-bold text-green-600">{statPraise}</span>
                        <span className="text-xs text-gray-500 uppercase tracking-wider">Lần khen</span>
                    </div>
                    <div className="flex flex-col items-center border-l pl-6">
                        <span className="text-2xl font-bold text-yellow-600">{statWarn}</span>
                        <span className="text-xs text-gray-500 uppercase tracking-wider">Lần nhắc</span>
                    </div>
                    <div className="flex flex-col items-center border-l pl-6 hidden sm:flex">
                        <span className="text-2xl font-bold text-blue-600">+{totalPraisePoints - totalWarnPoints}</span>
                        <span className="text-xs text-gray-500 uppercase tracking-wider">Tổng điểm</span>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {behaviors.length > 0 ? (
                    behaviors.map(behavior => (
                        <div key={behavior.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex gap-4">
                            <div className={`mt-1 rounded-full p-2 h-fit ${behavior.type === 'praise' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                {behavior.type === 'praise' ? <ThumbsUp size={20} /> : <AlertTriangle size={20} />}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className={`font-medium ${behavior.type === 'praise' ? 'text-green-800' : 'text-yellow-800'}`}>
                                        {behavior.type === 'praise' ? 'Khen thưởng' : 'Nhắc nhở'}
                                    </h3>
                                    <span className="text-sm text-gray-500 flex items-center">
                                        <Calendar size={14} className="mr-1" />
                                        {new Date(behavior.date).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed mb-3">
                                    {behavior.content}
                                </p>
                                <div className="text-xs font-semibold">
                                    {behavior.type === 'praise' ? (
                                        <span className="text-green-600 bg-green-50 px-2 py-1 rounded">+{behavior.points} điểm</span>
                                    ) : (
                                        <span className="text-yellow-600 bg-yellow-50 px-2 py-1 rounded">-{behavior.points} điểm</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
                        <p>Không có bản ghi nề nếp nào trong thời gian này.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
