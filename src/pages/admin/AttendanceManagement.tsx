import React, { useEffect, useState } from 'react';
import { dataProvider } from '../../core/provider';
import { ClassInfo, Student, Attendance } from '../../core/types';
import { Search, Save, CheckCircle, XCircle, Clock, Download } from 'lucide-react';
import * as XLSX from 'xlsx';


export const AttendanceManagement = () => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, { status: 'present' | 'absent' | 'late', note: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    dataProvider.list<ClassInfo>('classes').then(cls => {
        setClasses(cls);
        if (cls.length > 0 && !selectedClassId) {
            setSelectedClassId(cls[0].id);
        }
    });
  }, []);

  useEffect(() => {
    if (selectedClassId && selectedDate) {
        loadAttendanceData();
    }
  }, [selectedClassId, selectedDate]);

  const loadAttendanceData = async () => {
      // Load all students for the class
      const allStudents = await dataProvider.list<Student>('students');
      const classStudents = allStudents.filter(s => s.classId === selectedClassId);
      setStudents(classStudents);

      // Load existing records for this class and date
      const allAttendances = await dataProvider.list<Attendance>('attendances');
      const dayAttendances = allAttendances.filter(a => a.classId === selectedClassId && a.date === selectedDate);
      
      const records: Record<string, { status: 'present' | 'absent' | 'late', note: string }> = {};
      classStudents.forEach(student => {
          const existingRecord = dayAttendances.find(a => a.studentId === student.id);
          if (existingRecord) {
              records[student.id] = { status: existingRecord.status, note: existingRecord.note || '' };
          } else {
              records[student.id] = { status: 'present', note: '' }; // default
          }
      });
      setAttendanceRecords(records);
  };

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
      setAttendanceRecords(prev => ({
          ...prev,
          [studentId]: { ...prev[studentId], status }
      }));
  };

  const handleNoteChange = (studentId: string, note: string) => {
      setAttendanceRecords(prev => ({
          ...prev,
          [studentId]: { ...prev[studentId], note }
      }));
  };

  const handleSaveAll = async () => {
      setIsSaving(true);
      const items = Object.entries(attendanceRecords).map(([studentId, record]: [string, any]) => ({
          studentId,
          status: record.status,
          note: record.note
      }));

      await dataProvider.markAttendance({
          classId: selectedClassId,
          date: selectedDate,
          items
      });
      
      alert('Đã lưu điểm danh thành công!');
      setIsSaving(false);
  };

  const markAllAs = (status: 'present' | 'absent' | 'late') => {
      if (!window.confirm(`Bạn có chắc muốn đánh dấu tất cả là: ${status === 'present' ? 'Có mặt' : status === 'absent' ? 'Vắng mặt' : 'Đi trễ'}?`)) {
          return;
      }
      setAttendanceRecords(prev => {
          const newRecords = { ...prev };
          Object.keys(newRecords).forEach(studentId => {
              newRecords[studentId] = { ...newRecords[studentId], status };
          });
          return newRecords;
      });
  };

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Stats
  const statPresent = Object.values(attendanceRecords).filter((r: any) => r.status === 'present').length;
  const statAbsent = Object.values(attendanceRecords).filter((r: any) => r.status === 'absent').length;
  const statLate = Object.values(attendanceRecords).filter((r: any) => r.status === 'late').length;

  const exportExcel = () => {
      const data = [
          ["Họ tên", "Trạng thái", "Ghi chú"]
      ];
      filteredStudents.forEach(s => {
          const r = attendanceRecords[s.id];
          if (r) {
              const statusStr = r.status === 'present' ? 'Có mặt' : r.status === 'absent' ? 'Vắng mặt' : 'Đi trễ';
              data.push([s.name, statusStr, r.note]);
          }
      });
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "DiemDanh");
      
      const classObj = classes.find(c => c.id === selectedClassId);
      const className = classObj ? classObj.name : "Lop";
      XLSX.writeFile(wb, `Diem_danh_${className}_${selectedDate}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Điểm danh học sinh</h1>
          <p className="text-gray-500 mt-1">Quản lý chuyên cần theo ngày</p>
        </div>
        <div className="flex space-x-2">
            <button 
              onClick={exportExcel}
              disabled={students.length === 0}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2"
            >
              <Download size={20} />
              <span>Xuất Excel</span>
            </button>
            <button 
              onClick={handleSaveAll}
              disabled={isSaving || students.length === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2"
            >
              <Save size={20} />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu điểm danh'}</span>
            </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
         <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
            <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Lớp:</span>
                <select 
                    className="border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none"
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                >
                    {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>
            <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Ngày:</span>
                <input 
                    type="date" 
                    className="border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                />
            </div>
         </div>
         <div className="flex space-x-4 text-sm w-full md:w-auto justify-end">
            <div className="flex items-center space-x-1 text-green-600 font-medium">
                <CheckCircle size={16} /> <span>Có mặt: {statPresent}</span>
            </div>
            <div className="flex items-center space-x-1 text-red-600 font-medium">
                <XCircle size={16} /> <span>Vắng: {statAbsent}</span>
            </div>
            <div className="flex items-center space-x-1 text-orange-600 font-medium">
                <Clock size={16} /> <span>Đi trễ: {statLate}</span>
            </div>
         </div>
      </div>

      <div className="bg-white p-4 rounded-t-xl shadow-sm border border-gray-100 border-b-0 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-3 w-full md:w-[300px] bg-gray-50 p-2 rounded-lg border border-gray-200">
           <Search className="text-gray-400" size={18} />
           <input 
             type="text" 
             placeholder="Tìm học sinh..." 
             className="w-full bg-transparent border-none focus:ring-0 text-gray-700 outline-none p-0 text-sm"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
        <div className="flex space-x-2 w-full md:w-auto overflow-x-auto">
            <span className="text-sm text-gray-500 self-center hidden lg:inline mr-2">Đánh dấu tất cả:</span>
            <button onClick={() => markAllAs('present')} className="text-xs px-3 py-1.5 rounded-md bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 whitespace-nowrap">Tất cả Có mặt</button>
            <button onClick={() => markAllAs('absent')} className="text-xs px-3 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 whitespace-nowrap">Tất cả Vắng</button>
            <button onClick={() => markAllAs('late')} className="text-xs px-3 py-1.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 whitespace-nowrap">Tất cả Đi trễ</button>
        </div>
      </div>

      <div className="bg-white rounded-b-xl shadow-sm border border-gray-100 overflow-hidden mt-0!">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Họ và tên</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-1/3">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredStudents.map(student => {
                const record = attendanceRecords[student.id];
                if (!record) return null; // Wait for load

                return (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{student.name}</div>
                      <div className="text-xs text-gray-500">ID: {student.id.substring(0,8)}...</div>
                    </td>
                    <td className="px-6 py-3">
                        <div className="flex justify-center flex-wrap gap-2">
                             <button 
                                onClick={() => handleStatusChange(student.id, 'present')}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center space-x-1 transition-colors
                                ${record.status === 'present' ? 'bg-green-100 border-green-300 text-green-800 shadow-inner' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                             >
                                <CheckCircle size={14} className={record.status === 'present' ? 'text-green-600' : ''} /> <span>Có mặt</span>
                             </button>
                             <button 
                                onClick={() => handleStatusChange(student.id, 'absent')}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center space-x-1 transition-colors
                                ${record.status === 'absent' ? 'bg-red-100 border-red-300 text-red-800 shadow-inner' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                             >
                                <XCircle size={14} className={record.status === 'absent' ? 'text-red-600' : ''} /> <span>Vắng</span>
                             </button>
                             <button 
                                onClick={() => handleStatusChange(student.id, 'late')}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center space-x-1 transition-colors
                                ${record.status === 'late' ? 'bg-orange-100 border-orange-300 text-orange-800 shadow-inner' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                             >
                                <Clock size={14} className={record.status === 'late' ? 'text-orange-600' : ''} /> <span>Đi trễ</span>
                             </button>
                        </div>
                    </td>
                    <td className="px-6 py-3">
                        <input 
                            type="text" 
                            className="w-full border border-gray-200 rounded-md p-1.5 text-sm focus:ring-blue-500 outline-none"
                            placeholder="Lý do, biểu hiện..."
                            value={record.note}
                            onChange={(e) => handleNoteChange(student.id, e.target.value)}
                        />
                    </td>
                  </tr>
                )
            })}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  {students.length === 0 ? "Lớp không có học sinh." : "Không tìm thấy học sinh."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
