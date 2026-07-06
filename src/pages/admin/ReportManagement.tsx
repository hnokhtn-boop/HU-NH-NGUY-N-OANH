import React, { useEffect, useState } from 'react';
import { dataProvider } from '../../core/provider';
import { ClassInfo, ClassReport, Student, Behavior } from '../../core/types';
import { BarChart3, Users, Clock, AlertTriangle, MessageCircle, Star, Frown, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export const ReportManagement = () => {
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [tab, setTab] = useState<'weekly' | 'monthly'>('weekly');

    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay() + 1); // Monday
        return d.toISOString().split('T')[0];
    });
    
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay() + 7); // Sunday
        return d.toISOString().split('T')[0];
    });

    const [monthDate, setMonthDate] = useState(() => {
        return new Date().toISOString().split('T')[0].substring(0, 7) + '-01';
    });

    const [report, setReport] = useState<ClassReport | null>(null);
    const [loading, setLoading] = useState(false);

    interface RankedGroup {
        groupName: string;
        memberCount: number;
        averageScore: number;
        rank: number;
    }
    const [rankedGroups, setRankedGroups] = useState<RankedGroup[]>([]);

    useEffect(() => {
        dataProvider.list<ClassInfo>('classes').then(cls => {
            setClasses(cls);
            if (cls.length > 0 && !selectedClassId) {
                setSelectedClassId(cls[0].id);
            }
        });
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            loadReport();
        }
    }, [selectedClassId, tab, startDate, endDate, monthDate]);

    const computeGroupRanking = async (classId: string, startStr: string, endStr: string) => {
        try {
            const allStudents = await dataProvider.list<Student>('students');
            const classStudents = allStudents.filter(s => s.classId === classId);
            
            const allBehaviors = await dataProvider.list<Behavior>('behaviors');
            const behaviorsInRange = allBehaviors.filter(b => {
                const inDateRange = b.date >= startStr && b.date <= endStr;
                const isClassStudent = classStudents.some(s => s.id === b.studentId);
                return inDateRange && isClassStudent;
            });

            const studentScores: Record<string, number> = {};
            classStudents.forEach(s => {
                studentScores[s.id] = 100;
            });

            behaviorsInRange.forEach(b => {
                if (studentScores[b.studentId] !== undefined) {
                    studentScores[b.studentId] += b.type === 'praise' ? b.points : -b.points;
                }
            });

            const groups: Record<string, { studentIds: string[], totalScore: number }> = {};
            classStudents.forEach(s => {
                const gName = s.group ? s.group.trim() : "";
                if (!gName) return;
                
                if (!groups[gName]) {
                    groups[gName] = { studentIds: [], totalScore: 0 };
                }
                groups[gName].studentIds.push(s.id);
                groups[gName].totalScore += studentScores[s.id];
            });

            const groupList = Object.keys(groups).map(gName => {
                const info = groups[gName];
                const memberCount = info.studentIds.length;
                const averageScore = memberCount > 0 ? parseFloat((info.totalScore / memberCount).toFixed(2)) : 100;
                return {
                    groupName: gName,
                    memberCount,
                    averageScore
                };
            });

            // Sắp xếp giảm dần theo điểm trung bình cộng
            groupList.sort((a, b) => b.averageScore - a.averageScore);

            // Gán thứ hạng từ 1 đến 6
            const ranked = groupList.slice(0, 6).map((g, index) => ({
                ...g,
                rank: index + 1
            }));

            setRankedGroups(ranked);
        } catch (error) {
            console.error("Lỗi khi tính điểm xếp loại tổ: ", error);
        }
    };

    const loadReport = async () => {
        if (!selectedClassId) return;
        setLoading(true);
        try {
            let startStr = '';
            let endStr = '';
            if (tab === 'weekly') {
                const data = await dataProvider.reportsWeekly(selectedClassId, startDate, endDate);
                setReport(data);
                startStr = startDate;
                endStr = endDate;
            } else {
                const data = await dataProvider.reportsMonthly(selectedClassId, monthDate);
                setReport(data);
                
                const start = new Date(monthDate);
                start.setDate(1);
                const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
                startStr = start.toISOString().split('T')[0];
                endStr = end.toISOString().split('T')[0];
            }
            await computeGroupRanking(selectedClassId, startStr, endStr);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!report) return;

        const wb = XLSX.utils.book_new();

        const commonData = [
            ["Tiêu chí", "Giá trị"],
            ["Tỉ lệ chuyên cần", `${report.attendanceRate}%`],
            ["Vắng", report.absentCount],
            ["Đi trễ", report.lateCount],
            ["Nhiệm vụ quá hạn", report.overdueTasks],
            ["PH đã phản hồi", report.parentResponses]
        ];
        const wsCommon = XLSX.utils.aoa_to_sheet(commonData);
        XLSX.utils.book_append_sheet(wb, wsCommon, "Thông tin chung");

        const praiseData = [
            ["STT", "Họ và tên", "Điểm cộng"],
            ...report.topPraise.map((s, i) => [i + 1, s.name, s.points])
        ];
        const wsPraise = XLSX.utils.aoa_to_sheet(praiseData);
        XLSX.utils.book_append_sheet(wb, wsPraise, "Top Tuyên dương");

        const warnData = [
            ["STT", "Họ và tên", "Điểm trừ"],
            ...report.topWarn.map((s, i) => [i + 1, s.name, s.points])
        ];
        const wsWarn = XLSX.utils.aoa_to_sheet(warnData);
        XLSX.utils.book_append_sheet(wb, wsWarn, "Top Nhắc nhở");

        const classObj = classes.find(c => c.id === selectedClassId);
        const className = classObj ? classObj.name : "Lop";
        const dateStr = tab === 'weekly' ? `${startDate}_to_${endDate}` : `${monthDate.substring(0, 7)}`;
        const fileName = `Bao_cao_${className}_${dateStr}.xlsx`;

        XLSX.writeFile(wb, fileName);
    };

    const handleExportGroups = () => {
        if (rankedGroups.length === 0) return;

        const wb = XLSX.utils.book_new();

        const classObj = classes.find(c => c.id === selectedClassId);
        const className = classObj ? classObj.name : "Lop";
        const dateStr = tab === 'weekly' ? `${startDate}_to_${endDate}` : `${monthDate.substring(0, 7)}`;

        const excelRows = rankedGroups.map(g => {
            let ratingText = 'Tốt';
            if (g.averageScore >= 100) ratingText = 'Xuất sắc';
            else if (g.averageScore >= 90) ratingText = 'Tốt';
            else if (g.averageScore >= 75) ratingText = 'Khá';
            else if (g.averageScore >= 50) ratingText = 'Trung bình';
            else ratingText = 'Yếu';

            return {
                'Thứ hạng': g.rank,
                'Tên Tổ': g.groupName,
                'Sĩ số thành viên': g.memberCount,
                'Điểm trung bình cộng': g.averageScore,
                'Xếp loại': ratingText
            };
        });

        const ws = XLSX.utils.json_to_sheet(excelRows);

        ws['!cols'] = [
            { wch: 12 }, // Thứ hạng
            { wch: 15 }, // Tên Tổ
            { wch: 20 }, // Sĩ số thành viên
            { wch: 25 }, // Điểm trung bình cộng
            { wch: 15 }  // Xếp loại
        ];

        const sheetName = tab === 'weekly' ? "Xep loai to theo Tuan" : "Xep loai to theo Thang";
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        const fileName = `Xep_loai_to_${className}_${dateStr}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Báo cáo tổng hợp</h1>
                    <p className="text-gray-500 mt-1">Xem thống kê tình hình học tập và nề nếp</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-6 items-center justify-between">
              <div className="flex flex-wrap gap-6 items-center">
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Lớp:</span>
                    <select 
                        className="border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none text-sm bg-gray-50 font-semibold"
                        value={selectedClassId}
                        onChange={e => setSelectedClassId(e.target.value)}
                    >
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'weekly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                        onClick={() => setTab('weekly')}
                    >
                        Tuần
                    </button>
                    <button 
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                        onClick={() => setTab('monthly')}
                    >
                        Tháng
                    </button>
                </div>

                {tab === 'weekly' ? (
                    <div className="flex items-center space-x-2">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 rounded-lg p-1.5 text-sm" />
                        <span className="text-gray-500">-</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-300 rounded-lg p-1.5 text-sm" />
                    </div>
                ) : (
                    <div className="flex items-center space-x-2">
                        <input type="month" value={monthDate.substring(0, 7)} onChange={e => setMonthDate(e.target.value + '-01')} className="border border-gray-300 rounded-lg p-1.5 text-sm" />
                    </div>
                )}
              </div>
              
              <button 
                  onClick={handleExport}
                  disabled={!report || loading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2"
              >
                  <Download size={20} />
                  <span>Xuất Excel</span>
              </button>
            </div>

            {loading ? (
                <div className="text-center p-12 text-gray-500">Đang tải biểu mẫu báo cáo...</div>
            ) : report ? (
                <div className="space-y-6">
                    {/* Main Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard 
                            title="Tỉ lệ chuyên cần" 
                            value={`${report.attendanceRate}%`} 
                            icon={<Users className="text-blue-500" />} 
                            bg="bg-blue-50"
                        />
                        <StatCard 
                            title="Vắng / Đi trễ" 
                            value={`${report.absentCount} / ${report.lateCount}`} 
                            icon={<Clock className="text-orange-500" />} 
                            bg="bg-orange-50"
                        />
                        <StatCard 
                            title="Nhiệm vụ quá hạn" 
                            value={String(report.overdueTasks)} 
                            icon={<AlertTriangle className="text-red-500" />} 
                            bg="bg-red-50"
                        />
                        <StatCard 
                            title="PH đã phản hồi" 
                            value={String(report.parentResponses)} 
                            icon={<MessageCircle className="text-green-500" />} 
                            bg="bg-green-50"
                        />
                    </div>

                    {/* Behavior Lists */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center space-x-2 mb-4 border-b pb-2 border-gray-100">
                                <Star className="text-yellow-500" size={24} />
                                <h3 className="text-lg font-bold text-gray-900">Top Tuyên dương</h3>
                            </div>
                            {report.topPraise.length > 0 ? (
                                <ul className="space-y-3">
                                    {report.topPraise.map((s, i) => (
                                        <li key={s.studentId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="flex items-center space-x-3">
                                                <span className="font-bold text-gray-400 w-4">{i + 1}.</span>
                                                <span className="font-medium text-gray-800">{s.name}</span>
                                            </div>
                                            <span className="text-green-600 font-bold">+{s.points} điểm</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 text-center py-4 text-sm">Chưa có dữ liệu tuyên dương</p>
                            )}
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center space-x-2 mb-4 border-b pb-2 border-gray-100">
                                <Frown className="text-red-500" size={24} />
                                <h3 className="text-lg font-bold text-gray-900">Top Cần nhắc nhở</h3>
                            </div>
                            {report.topWarn.length > 0 ? (
                                <ul className="space-y-3">
                                    {report.topWarn.map((s, i) => (
                                        <li key={s.studentId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="flex items-center space-x-3">
                                                <span className="font-bold text-gray-400 w-4">{i + 1}.</span>
                                                <span className="font-medium text-gray-800">{s.name}</span>
                                            </div>
                                            <span className="text-red-600 font-bold">{s.points} điểm</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 text-center py-4 text-sm">Tuyệt vời! Không có học sinh vi phạm.</p>
                            )}
                        </div>
                    </div>

                    {/* Bảng xếp loại tổ */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border-b pb-4 border-gray-100">
                            <div className="flex items-center space-x-2">
                                <BarChart3 className="text-indigo-600" size={24} />
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Bảng xếp loại tổ</h3>
                                    <p className="text-sm text-gray-500">Xếp hạng tổ dựa trên điểm trung bình cộng thi đua của các tổ viên trong {tab === 'weekly' ? 'tuần' : 'tháng'}</p>
                                </div>
                            </div>
                            <button 
                                onClick={handleExportGroups}
                                disabled={rankedGroups.length === 0}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2 text-sm"
                            >
                                <Download size={16} />
                                <span>Xuất Excel xếp loại tổ (.xlsx)</span>
                            </button>
                        </div>

                        {rankedGroups.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase font-semibold">
                                            <th className="py-3 px-4">Thứ hạng</th>
                                            <th className="py-3 px-4">Tên Tổ</th>
                                            <th className="py-3 px-4 text-center">Sĩ số thành viên</th>
                                            <th className="py-3 px-4 text-right">Điểm trung bình cộng</th>
                                            <th className="py-3 px-4 text-center">Xếp loại</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {rankedGroups.map((g) => {
                                            let rankBadge = '';
                                            if (g.rank === 1) rankBadge = 'bg-yellow-100 text-yellow-800 border-yellow-200';
                                            else if (g.rank === 2) rankBadge = 'bg-gray-100 text-gray-800 border-gray-200';
                                            else if (g.rank === 3) rankBadge = 'bg-amber-100 text-amber-800 border-amber-200';
                                            else rankBadge = 'bg-blue-50 text-blue-700 border-blue-100';

                                            let ratingText = 'Tốt';
                                            let ratingColor = 'text-green-600 bg-green-50';
                                            if (g.averageScore >= 100) {
                                                ratingText = 'Xuất sắc';
                                                ratingColor = 'text-purple-600 bg-purple-50';
                                            } else if (g.averageScore >= 90) {
                                                ratingText = 'Tốt';
                                                ratingColor = 'text-green-600 bg-green-50';
                                            } else if (g.averageScore >= 75) {
                                                ratingText = 'Khá';
                                                ratingColor = 'text-blue-600 bg-blue-50';
                                            } else if (g.averageScore >= 50) {
                                                ratingText = 'Trung bình';
                                                ratingColor = 'text-yellow-600 bg-yellow-50';
                                            } else {
                                                ratingText = 'Yếu';
                                                ratingColor = 'text-red-600 bg-red-50';
                                            }

                                            return (
                                                <tr key={g.groupName} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="py-3.5 px-4">
                                                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm border ${rankBadge}`}>
                                                            {g.rank}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-semibold text-gray-800">
                                                        {g.groupName}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center text-gray-600">
                                                        {g.memberCount} học sinh
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                                                        {g.averageScore}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${ratingColor}`}>
                                                            {ratingText}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500 text-sm">
                                Chưa có học sinh nào được phân tổ trong lớp này. Hãy gán Tổ cho học sinh ở trang "Học sinh".
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
};

function StatCard({ title, value, icon, bg }: { title: string, value: string | number, icon: React.ReactNode, bg: string }) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
            <div className={`p-4 rounded-full ${bg}`}>
                {icon}
            </div>
            <div>
                <p className="text-gray-500 text-sm font-medium">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
}
