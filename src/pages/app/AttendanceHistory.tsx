import React, { useEffect, useState } from 'react';
import { dataProvider } from '../../core/provider';
import { Attendance } from '../../core/types';
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

export const AttendanceHistory = () => {
    const userStr = localStorage.getItem('currentUser');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const studentId = currentUser?.studentId || 'student-1';
    
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    
    // For range filter
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(startOfMonth);
    const [endDate, setEndDate] = useState(endOfMonth);

    useEffect(() => {
        if (startDate && endDate) {
            dataProvider.listAttendanceByStudent(studentId, startDate, endDate)
                .then(data => {
                    // Sort descending by date
                    const sorted = [...data].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    setAttendances(sorted);
                });
        }
    }, [startDate, endDate]);

    const statPresent = attendances.filter(a => a.status === 'present').length;
    const statAbsent = attendances.filter(a => a.status === 'absent').length;
    const statLate = attendances.filter(a => a.status === 'late').length;

    const getStatusDisplay = (status: string) => {
        switch(status) {
            case 'present': return <span className="bg-green-100 text-green-800 px-3 py-1 text-sm rounded-full font-medium flex items-center w-fit"><CheckCircle size={16} className="mr-1"/> Có mặt</span>;
            case 'absent': return <span className="bg-red-100 text-red-800 px-3 py-1 text-sm rounded-full font-medium flex items-center w-fit"><XCircle size={16} className="mr-1"/> Vắng</span>;
            case 'late': return <span className="bg-orange-100 text-orange-800 px-3 py-1 text-sm rounded-full font-medium flex items-center w-fit"><Clock size={16} className="mr-1"/> Đi trễ</span>;
            default: return null;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
             <div>
                <h1 className="text-2xl font-bold text-gray-900">Lịch sử chuyên cần</h1>
                <p className="text-gray-500 mt-1">Xem tình trạng điểm danh của bạn theo thời gian</p>
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
                        <span className="text-2xl font-bold text-green-600">{statPresent}</span>
                        <span className="text-xs text-gray-500 uppercase tracking-wider">Có mặt</span>
                    </div>
                    <div className="flex flex-col items-center border-l pl-6">
                        <span className="text-2xl font-bold text-red-600">{statAbsent}</span>
                        <span className="text-xs text-gray-500 uppercase tracking-wider">Vắng</span>
                    </div>
                    <div className="flex flex-col items-center border-l pl-6">
                        <span className="text-2xl font-bold text-orange-600">{statLate}</span>
                        <span className="text-xs text-gray-500 uppercase tracking-wider">Đi trễ</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {attendances.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Ngày</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {attendances.map(record => (
                                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center text-gray-900 font-medium space-x-2">
                                            <Calendar size={16} className="text-gray-400" />
                                            <span>{new Date(record.date).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusDisplay(record.status)}
                                    </td>
                                    <td className="px-6 py-4 text-gray-700 text-sm">
                                        {record.note || <span className="text-gray-400 italic">Không có ghi chú</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
                        <p>Không có dữ liệu điểm danh trong khoảng thời gian này.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
