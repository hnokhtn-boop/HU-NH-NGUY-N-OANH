import React, { useEffect, useState, useRef } from 'react';
import { dataProvider } from '../../core/provider';
import { Student, ClassInfo, Behavior, BehaviorCriterion } from '../../core/types';
import { Modal } from '../../components/ui/Modal';
import { Search, Plus, Edit2, Trash2, Filter, ThumbsUp, AlertTriangle, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

const parseExcelDate = (val: any): string => {
  if (!val) return new Date().toISOString().split('T')[0];
  
  if (typeof val === 'number') {
    const dateObj = new Date((val - (25567 + 2)) * 86400 * 1000);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString().split('T')[0];
    }
  }
  
  const str = String(val).trim();
  const parts = str.split('/');
  if (parts.length === 3) {
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2];
    if (y.length === 4) {
      return `${y}-${m}-${d}`;
    }
  }
  
  try {
    const parsedDate = new Date(str);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split('T')[0];
    }
  } catch (e) {}
  
  return new Date().toISOString().split('T')[0];
};


export const BehaviorManagement = () => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [criteria, setCriteria] = useState<BehaviorCriterion[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCriteriaModalOpen, setIsCriteriaModalOpen] = useState(false);
  const [editingBehavior, setEditingBehavior] = useState<Behavior | null>(null);
  
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  
  const [importedBehaviors, setImportedBehaviors] = useState<Omit<Behavior, 'id'>[]>([]);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Date range filter
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(startOfMonth);
  const [endDate, setEndDate] = useState(endOfMonth);

  // Form State
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<Behavior>>({});

  // Export Report State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [reportClassId, setReportClassId] = useState('');
  const [reportWeekDate, setReportWeekDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  const handleExportReport = async () => {
    if (!reportClassId) {
      alert("Vui lòng chọn lớp để xuất báo cáo.");
      return;
    }

    try {
      // 1. Get all behaviors
      const allBehaviors = await dataProvider.list<Behavior>('behaviors');

      // 2. Filter students in class
      const classStudents = students.filter(s => s.classId === reportClassId);
      if (classStudents.length === 0) {
        alert("Lớp học này không có học sinh nào.");
        return;
      }

      // 3. Define date bounds and label
      let startStr = '';
      let endStr = '';
      let rangeLabel = '';

      if (reportType === 'weekly') {
        const selectedDate = new Date(reportWeekDate);
        if (isNaN(selectedDate.getTime())) {
          alert("Ngày chọn không hợp lệ.");
          return;
        }
        const day = selectedDate.getDay();
        const diff = selectedDate.getDate() - day + (day === 0 ? -6 : 1); // Monday
        const monday = new Date(selectedDate.setDate(diff));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        startStr = monday.toISOString().split('T')[0];
        endStr = sunday.toISOString().split('T')[0];
        rangeLabel = `Tuan_tu_${startStr}_den_${endStr}`;
      } else {
        startStr = `${reportYear}-${String(reportMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(reportYear, reportMonth, 0).getDate();
        endStr = `${reportYear}-${String(reportMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        rangeLabel = `Thang_${reportMonth}_Nam_${reportYear}`;
      }

      // 4. Filter behaviors within range and class students
      const studentIds = classStudents.map(s => s.id);
      const classBehaviors = allBehaviors.filter(b => {
        if (!studentIds.includes(b.studentId)) return false;
        const bTime = new Date(b.date).getTime();
        const sTime = new Date(startStr).getTime();
        const eTime = new Date(endStr).getTime() + 24 * 60 * 60 * 1000 - 1; // full end day
        return bTime >= sTime && bTime <= eTime;
      });

      // 5. Generate summary sheet rows
      const summaryRows = classStudents.map((student, idx) => {
        const studentBehaviors = classBehaviors.filter(b => b.studentId === student.id);
        const praises = studentBehaviors.filter(b => b.type === 'praise');
        const warns = studentBehaviors.filter(b => b.type === 'warn');

        const praiseCount = praises.length;
        const praisePoints = praises.reduce((sum, b) => sum + (b.points || 0), 0);

        const warnCount = warns.length;
        const warnPoints = warns.reduce((sum, b) => sum + (b.points || 0), 0);

        const netPoints = praisePoints - warnPoints;
        const finalScore = 100 + netPoints;

        let rating = 'Tốt';
        if (finalScore >= 100) rating = 'Xuất sắc';
        else if (finalScore >= 90) rating = 'Tốt';
        else if (finalScore >= 75) rating = 'Khá';
        else if (finalScore >= 50) rating = 'Trung bình';
        else rating = 'Yếu';

        const praiseDetail = praises.map(b => `${new Date(b.date).toLocaleDateString('vi-VN')}: ${b.content} (+${b.points})`).join('; ');
        const warnDetail = warns.map(b => `${new Date(b.date).toLocaleDateString('vi-VN')}: ${b.content} (-${b.points})`).join('; ');

        return {
          'STT': idx + 1,
          'Mã học sinh': student.id,
          'Họ và tên': student.name,
          'Số lần khen thưởng': praiseCount,
          'Tổng điểm cộng (+)': praisePoints,
          'Số lần nhắc nhở': warnCount,
          'Tổng điểm trừ (-)': warnPoints,
          'Hiệu số điểm (+/-)': netPoints >= 0 ? `+${netPoints}` : `${netPoints}`,
          'Điểm thi đua tổng kết (Gốc 100)': finalScore,
          'Xếp loại nề nếp': rating,
          'Chi tiết khen thưởng': praiseDetail || 'Không có',
          'Chi tiết nhắc nhở': warnDetail || 'Không có'
        };
      });

      // 6. Generate detailed sheet rows
      const detailRows = classBehaviors.map((b, idx) => {
        const student = classStudents.find(s => s.id === b.studentId);
        return {
          'STT': idx + 1,
          'Mã học sinh': b.studentId,
          'Họ và tên': student ? student.name : 'Không rõ',
          'Ngày ghi nhận': new Date(b.date).toLocaleDateString('vi-VN'),
          'Loại hành vi': b.type === 'praise' ? 'Khen thưởng' : 'Nhắc nhở',
          'Nội dung chi tiết': b.content,
          'Điểm ghi nhận': b.type === 'praise' ? `+${b.points}` : `-${b.points}`
        };
      });

      // 7. Write to Excel
      const wb = XLSX.utils.book_new();
      
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      const wsDetail = XLSX.utils.json_to_sheet(detailRows);

      // Width formatting
      wsSummary['!cols'] = [
        { wch: 6 },   // STT
        { wch: 15 },  // Mã học sinh
        { wch: 25 },  // Họ và tên
        { wch: 18 },  // Số lần khen thưởng
        { wch: 18 },  // Tổng điểm cộng
        { wch: 18 },  // Số lần nhắc nhở
        { wch: 18 },  // Tổng điểm trừ
        { wch: 15 },  // Hiệu số điểm
        { wch: 30 },  // Điểm thi đua tổng kết
        { wch: 18 },  // Xếp loại nề nếp
        { wch: 45 },  // Chi tiết khen thưởng
        { wch: 45 }   // Chi tiết nhắc nhở
      ];

      wsDetail['!cols'] = [
        { wch: 6 },   // STT
        { wch: 15 },  // Mã học sinh
        { wch: 25 },  // Họ và tên
        { wch: 15 },  // Ngày ghi nhận
        { wch: 15 },  // Loại hành vi
        { wch: 50 },  // Nội dung chi tiết
        { wch: 12 }   // Điểm ghi nhận
      ];

      XLSX.utils.book_append_sheet(wb, wsSummary, "Tổng hợp nề nếp");
      XLSX.utils.book_append_sheet(wb, wsDetail, "Chi tiết hành vi");

      const className = classes.find(c => c.id === reportClassId)?.name || reportClassId;
      const cleanClassName = className.replace(/\s+/g, '_');
      const filename = `Bao_cao_tong_ket_ne_nep_${cleanClassName}_${rangeLabel}.xlsx`;
      
      XLSX.writeFile(wb, filename);
      setIsReportModalOpen(false);
    } catch (error) {
      console.error(error);
      alert("Đã xảy ra lỗi khi tạo báo cáo Excel.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
     if (selectedStudentId && startDate && endDate) {
         loadBehaviors();
     } else {
         setBehaviors([]);
     }
  }, [selectedStudentId, startDate, endDate]);

  const loadData = async () => {
    const [fetchedClasses, fetchedStudents, fetchedCriteria] = await Promise.all([
      dataProvider.list<ClassInfo>('classes'),
      dataProvider.list<Student>('students'),
      dataProvider.list<BehaviorCriterion>('behaviorCriteria')
    ]);
    setClasses(fetchedClasses);
    setStudents(fetchedStudents);
    setCriteria(fetchedCriteria);
    if (fetchedClasses.length > 0 && !selectedClassId) {
        setSelectedClassId(fetchedClasses[0].id);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      ["Mã học sinh", "Họ và tên", "Loại", "Nội dung", "Điểm", "Ngày"]
    ];
    
    let sampleData = [
      ["student-1", "Nguyễn Văn B", "Khen thưởng", "Hăng hái phát biểu xây dựng bài", "2", "04/07/2026"],
      ["student-1", "Nguyễn Văn B", "Nhắc nhở", "Mất trật tự trong giờ học", "2", "04/07/2026"]
    ];

    if (selectedClassId) {
      const classStudents = students.filter(s => s.classId === selectedClassId);
      if (classStudents.length > 0) {
        sampleData = classStudents.slice(0, 5).map(s => [
          s.id,
          s.name,
          "Khen thưởng",
          "Hăng hái phát biểu xây dựng bài",
          "2",
          "04/07/2026"
        ]);
      }
    }
    
    const wsData = [...headers, ...sampleData];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    ws['!cols'] = [
      { wch: 15 }, // Mã học sinh
      { wch: 25 }, // Họ và tên
      { wch: 15 }, // Loại
      { wch: 40 }, // Nội dung
      { wch: 10 }, // Điểm
      { wch: 15 }  // Ngày
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu nề nếp");
    XLSX.writeFile(wb, "Mau_nhap_lieu_ne_nep.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const tempBehaviors: Omit<Behavior, 'id'>[] = [];
        
        for (const row of data as any[]) {
          const studentId = String(row['Mã học sinh'] || row['Ma hoc sinh'] || row['Student ID'] || row['ID'] || '').trim();
          if (!studentId) continue;
          
          const exists = students.some(s => s.id === studentId);
          if (!exists) {
            console.warn(`Học sinh với mã ${studentId} không tồn tại.`);
            continue;
          }
          
          const rawType = String(row['Loại (Khen thưởng/Nhắc nhở)'] || row['Loại'] || row['Type'] || '').trim().toLowerCase();
          let type: 'praise' | 'warn' = 'praise';
          if (rawType.includes('nhắc') || rawType.includes('warn') || rawType.includes('tiêu cực') || rawType.includes('phạt') || rawType.includes('tiêu')) {
            type = 'warn';
          }
          
          const content = String(row['Nội dung'] || row['Content'] || '').trim();
          if (!content) continue;
          
          const points = parseInt(row['Điểm'] || row['Points']) || 0;
          
          const rawDate = row['Ngày (DD/MM/YYYY)'] || row['Ngày'] || row['Date'];
          const date = parseExcelDate(rawDate);
          
          tempBehaviors.push({
            studentId,
            date,
            type,
            content,
            points
          });
        }
        
        if (tempBehaviors.length === 0) {
          alert("Không tìm thấy bản ghi hợp lệ nào trong file Excel.");
        } else {
          setImportedBehaviors(tempBehaviors);
          setShowImportConfirm(true);
        }
      } catch (err) {
        console.error(err);
        alert("Có lỗi xảy ra khi đọc file Excel. Vui lòng kiểm tra định dạng file.");
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const loadBehaviors = async () => {
      const data = await dataProvider.listBehaviorByStudent(selectedStudentId, startDate, endDate);
      const sorted = [...data].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setBehaviors(sorted);
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedClassId(e.target.value);
      setSelectedStudentId(''); // Reset student when class changes
  };

  const currentClassStudents = students.filter(s => s.classId === selectedClassId);

  const handleOpenModal = (behavior?: Behavior) => {
    if (behavior) {
      setEditingBehavior(behavior);
      setFormData(behavior);
      setSelectedStudentIds([behavior.studentId]);
    } else {
      setEditingBehavior(null);
      setFormData({ 
        date: new Date().toISOString().split('T')[0],
        type: 'praise',
        content: '',
        points: 0
      });
      setSelectedStudentIds(selectedStudentId ? [selectedStudentId] : []);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) {
      alert("Vui lòng chọn ít nhất một học sinh");
      return;
    }
    
    if (editingBehavior) {
      await dataProvider.update<Behavior>('behaviors', editingBehavior.id, {
        ...formData,
        studentId: selectedStudentIds[0]
      });
    } else {
      const promises = selectedStudentIds.map(studentId => 
        dataProvider.addBehavior({
          ...formData,
          studentId
        } as Omit<Behavior, 'id'>)
      );
      await Promise.all(promises);
    }
    setIsModalOpen(false);
    loadBehaviors();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) {
      await dataProvider.remove('behaviors', id);
      loadBehaviors();
    }
  };

  const getStudentName = (studentId: string) => {
      return students.find(s => s.id === studentId)?.name || 'Không rõ';
  };

  const exportCSV = () => {
      const BOM = "\uFEFF";
      let csvContent = BOM + "Họ tên,Ngày,Loại,Nội dung,Điểm\n";
      const studentName = getStudentName(selectedStudentId);
      behaviors.forEach(b => {
          const typeStr = b.type === 'praise' ? 'Khen thưởng' : 'Nhắc nhở';
          const content = b.content.replace(/,/g, ' ').replace(/\n/g, ' '); 
          const pointsStr = b.type === 'praise' ? `+${b.points}` : `-${b.points}`;
          csvContent += `${studentName},${new Date(b.date).toLocaleDateString('vi-VN')},${typeStr},${content},${pointsStr}\n`;
      });
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Nenep_${selectedStudentId}_${startDate}_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nề nếp & Hành vi</h1>
          <p className="text-gray-500 mt-1">Quản lý khen thưởng và nhắc nhở học sinh</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
            />
            <button 
              onClick={exportCSV}
              disabled={behaviors.length === 0}
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 disabled:opacity-50 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2 text-sm"
            >
              <Download size={18} className="text-gray-500" />
              <span>Xuất CSV</span>
            </button>
            <button 
              onClick={() => {
                setReportClassId(selectedClassId || (classes[0]?.id || ''));
                setIsReportModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2 text-sm"
            >
              <Download size={18} />
              <span>Xuất báo cáo</span>
            </button>
            <button 
              onClick={handleDownloadTemplate}
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2 text-sm"
            >
              <Download size={18} className="text-gray-500" />
              <span>Tải file mẫu</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2 text-sm"
            >
              <Upload size={18} />
              <span>Nhập từ Excel</span>
            </button>
            <button 
              onClick={() => setIsCriteriaModalOpen(true)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2 border border-gray-300 text-sm"
            >
              <Edit2 size={18} />
              <span>Quản lý tiêu chí</span>
            </button>
            <button 
              onClick={() => handleOpenModal()}
              disabled={!selectedClassId}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2 text-sm"
            >
              <Plus size={18} />
              <span>Thêm Khen/Nhắc</span>
            </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
         <div className="flex items-center space-x-2">
            <Filter className="text-gray-400" size={20} />
            <select 
                className="border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none text-sm"
                value={selectedClassId}
                onChange={handleClassChange}
            >
                <option value="" disabled>-- Chọn lớp --</option>
                {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
         </div>

         <div className="flex items-center space-x-2">
            <select 
                className="border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none text-sm min-w-[200px]"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
            >
                <option value="" disabled>-- Chọn học sinh --</option>
                {currentClassStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
         </div>

         <div className="hidden sm:block w-px h-8 bg-gray-200"></div>

         <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Từ</span>
                <input 
                    type="date" 
                    className="border border-gray-300 rounded-md p-1.5 text-sm focus:ring-blue-500 outline-none"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                />
            </div>
            <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Đến</span>
                <input 
                    type="date" 
                    className="border border-gray-300 rounded-md p-1.5 text-sm focus:ring-blue-500 outline-none"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                />
            </div>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {selectedStudentId ? (
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ngày</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Loại</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/2">Nội dung</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Điểm</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {behaviors.map(behavior => (
                    <tr key={behavior.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 border-l-[3px] border-transparent" style={{borderLeftColor: behavior.type === 'praise' ? '#22c55e' : '#eab308'}}>
                            {new Date(behavior.date).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            {behavior.type === 'praise' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <ThumbsUp size={12} className="mr-1"/> Khen thưởng
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    <AlertTriangle size={12} className="mr-1"/> Nhắc nhở
                                </span>
                            )}
                        </td>
                        <td className="px-6 py-4 text-gray-700 text-sm">
                            {behavior.content}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                            {behavior.type === 'praise' ? `+${behavior.points}` : `-${behavior.points}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                        <button onClick={() => handleOpenModal(behavior)} className="text-blue-600 hover:text-blue-900">
                            <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete(behavior.id)} className="text-red-600 hover:text-red-900">
                            <Trash2 size={18} />
                        </button>
                        </td>
                    </tr>
                    ))}
                    {behaviors.length === 0 && (
                    <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                            <span className="block text-gray-400 mb-2">⭐</span>
                            Học sinh này không có bản ghi hành vi nào trong khoảng thời gian trên.
                        </td>
                    </tr>
                    )}
                </tbody>
            </table>
        ) : (
             <div className="py-16 text-center text-gray-500">
                <span className="block text-gray-300 mb-4 scale-150">👤</span>
                <p>Vui lòng chọn lớp và học sinh để xem hoặc thêm bản ghi nề nếp.</p>
             </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingBehavior ? "Sửa bản ghi nề nếp" : "Thêm bản ghi nề nếp"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                  Học sinh {editingBehavior ? '' : `(Đã chọn ${selectedStudentIds.length})`}
              </label>
              {editingBehavior ? (
                  <input type="text" readOnly className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50 text-gray-600" value={getStudentName(selectedStudentIds[0] || '')} />
              ) : (
                  <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto bg-white p-2">
                       <div className="flex items-center justify-between pb-2 mb-2 border-b">
                           <label className="flex items-center space-x-2 cursor-pointer">
                               <input 
                                   type="checkbox" 
                                   className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                   checked={selectedStudentIds.length === currentClassStudents.length && currentClassStudents.length > 0}
                                   onChange={(e) => {
                                       if (e.target.checked) {
                                           setSelectedStudentIds(currentClassStudents.map(s => s.id));
                                       } else {
                                           setSelectedStudentIds([]);
                                       }
                                   }}
                               />
                               <span className="font-medium text-gray-800">Chọn tất cả</span>
                           </label>
                       </div>
                       <div className="space-y-1">
                           {currentClassStudents.map(student => (
                               <label key={student.id} className="flex items-center space-x-2 p-1.5 hover:bg-gray-50 cursor-pointer rounded">
                                   <input 
                                       type="checkbox"
                                       className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                       checked={selectedStudentIds.includes(student.id)}
                                       onChange={(e) => {
                                           if (e.target.checked) {
                                               setSelectedStudentIds([...selectedStudentIds, student.id]);
                                           } else {
                                               setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.id));
                                           }
                                       }}
                                   />
                                   <span className="text-sm text-gray-700">{student.name}</span>
                               </label>
                           ))}
                       </div>
                  </div>
              )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày</label>
              <input 
                required
                type="date" 
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={formData.date || ''}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
              <select 
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={formData.type || 'praise'}
                onChange={e => setFormData({...formData, type: e.target.value as any})}
              >
                <option value="praise">Khen thưởng (Tích cực)</option>
                <option value="warn">Nhắc nhở (Tiêu cực)</option>
              </select>
            </div>
          </div>
          <div>
             <div className="flex justify-between items-center mb-1">
                 <label className="block text-sm font-medium text-gray-700">Tiêu chí có sẵn</label>
             </div>
             <select
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none mb-3 bg-blue-50"
                onChange={(e) => {
                    const c = criteria.find(x => x.id === e.target.value);
                    if (c) {
                        setFormData({...formData, content: c.content, points: c.points});
                    }
                }}
             >
                 <option value="">-- Chọn từ danh sách --</option>
                 {criteria.filter(c => c.type === (formData.type || 'praise')).map(c => (
                     <option key={c.id} value={c.id}>{c.content} ({c.points} điểm)</option>
                 ))}
             </select>

            <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung chi tiết</label>
            <textarea 
              required
              rows={3}
              placeholder={formData.type === 'praise' ? 'Ví dụ: Hăng hái phát biểu xây dựng bài...' : 'Ví dụ: Mất trật tự trong giờ học...'}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={formData.content || ''}
              onChange={e => setFormData({...formData, content: e.target.value})}
            />
          </div>
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Điểm cộng / trừ</label>
             <input 
                required
                type="number" 
                min="0"
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={formData.points || 0}
                onChange={e => setFormData({...formData, points: parseInt(e.target.value) || 0})}
              />
              <p className="text-xs text-gray-500 mt-1">Lưu ý: Chỉ nhập số dương (hệ thống tự động cộng/trừ theo Loại ở trên).</p>
          </div>
          
          <div className="pt-4 flex justify-end space-x-3">
             <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Hủy
             </button>
             <button 
                type="submit"
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium shadow-sm transition-colors"
              >
                Lưu
             </button>
          </div>
        </form>
      </Modal>

      <CriteriaManager 
        isOpen={isCriteriaModalOpen}
        onClose={() => {
            setIsCriteriaModalOpen(false);
            loadData(); // reload criteria
        }}
        initialCriteria={criteria}
      />

      <Modal
        isOpen={showImportConfirm}
        onClose={() => {
          setShowImportConfirm(false);
          setImportedBehaviors([]);
        }}
        title="Xác nhận nhập dữ liệu nề nếp từ Excel"
      >
        <div className="space-y-4">
          <p className="text-gray-600 text-sm leading-relaxed">
            Hệ thống đã đọc được <span className="font-semibold text-blue-600">{importedBehaviors.length}</span> bản ghi nề nếp hợp lệ từ file Excel. Vui lòng kiểm tra lại danh sách bên dưới trước khi lưu vào hệ thống:
          </p>
          
          <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto bg-gray-50">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Học sinh</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Ngày</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Loại</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Nội dung</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Điểm</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {importedBehaviors.map((b, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-900 font-medium">
                      {getStudentName(b.studentId)} <span className="text-gray-400 font-mono">({b.studentId})</span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {new Date(b.date).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-3 py-2">
                      {b.type === 'praise' ? (
                        <span className="text-green-600 font-medium">Khen thưởng</span>
                      ) : (
                        <span className="text-yellow-600 font-medium">Nhắc nhở</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600 max-w-xs truncate">
                      {b.content}
                    </td>
                    <td className="px-3 py-2 text-gray-900 font-bold">
                      {b.type === 'praise' ? `+${b.points}` : `-${b.points}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowImportConfirm(false);
                setImportedBehaviors([]);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors text-sm"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={async () => {
                const promises = importedBehaviors.map(b => dataProvider.addBehavior(b));
                await Promise.all(promises);
                setShowImportConfirm(false);
                setImportedBehaviors([]);
                // Reload state
                loadData();
                if (selectedStudentId) {
                  loadBehaviors();
                }
              }}
              className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg font-medium shadow-sm transition-colors text-sm"
            >
              Xác nhận nhập
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Xuất báo cáo tổng hợp nề nếp (Excel)"
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-500">
            Hệ thống sẽ tổng hợp toàn bộ điểm cộng, điểm trừ, điểm thi đua và chi tiết hành vi của học sinh trong lớp theo mốc thời gian bạn chọn.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chọn lớp học</label>
              <select 
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none text-sm"
                value={reportClassId}
                onChange={e => setReportClassId(e.target.value)}
              >
                <option value="" disabled>-- Chọn lớp --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hình thức tổng hợp</label>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2 cursor-pointer text-sm font-medium text-gray-700">
                  <input 
                    type="radio" 
                    name="reportType" 
                    value="weekly" 
                    checked={reportType === 'weekly'}
                    onChange={() => setReportType('weekly')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Tổng kết theo tuần</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer text-sm font-medium text-gray-700">
                  <input 
                    type="radio" 
                    name="reportType" 
                    value="monthly" 
                    checked={reportType === 'monthly'}
                    onChange={() => setReportType('monthly')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Tổng kết theo tháng</span>
                </label>
              </div>
            </div>

            {reportType === 'weekly' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chọn một ngày trong tuần cần xuất</label>
                <input 
                  type="date"
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none text-sm"
                  value={reportWeekDate}
                  onChange={e => setReportWeekDate(e.target.value)}
                />
                <p className="text-xs text-blue-600 mt-1">
                  Hệ thống sẽ tự động xác định phạm vi tuần (từ Thứ Hai đến Chủ Nhật) chứa ngày bạn chọn.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chọn tháng</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none text-sm"
                    value={reportMonth}
                    onChange={e => setReportMonth(parseInt(e.target.value))}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>Tháng {m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chọn năm</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none text-sm"
                    value={reportYear}
                    onChange={e => setReportYear(parseInt(e.target.value))}
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                      <option key={y} value={y}>Năm {y}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t">
            <button
              type="button"
              onClick={() => setIsReportModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors text-sm"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleExportReport}
              className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium shadow-sm transition-colors text-sm"
            >
              Tải báo cáo .xlsx
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const CriteriaManager = ({ isOpen, onClose, initialCriteria }: { isOpen: boolean, onClose: () => void, initialCriteria: BehaviorCriterion[] }) => {
    const [criteria, setCriteria] = useState<BehaviorCriterion[]>(initialCriteria);
    const [newCrit, setNewCrit] = useState({ type: 'praise' as 'praise' | 'warn', content: '', points: 0 });

    useEffect(() => {
        setCriteria(initialCriteria);
    }, [initialCriteria, isOpen]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCrit.content || newCrit.points <= 0) return;
        const added = await dataProvider.add<BehaviorCriterion>('behaviorCriteria', newCrit);
        setCriteria([...criteria, added]);
        setNewCrit({ ...newCrit, content: '', points: 0 });
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Xóa tiêu chí này?')) {
            await dataProvider.remove('behaviorCriteria', id);
            setCriteria(criteria.filter(c => c.id !== id));
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Quản lý tiêu chí nề nếp">
            <div className="space-y-6">
                <form onSubmit={handleAdd} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-700 mb-3">Thêm tiêu chí mới</h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <select 
                            className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-blue-500 outline-none bg-white"
                            value={newCrit.type}
                            onChange={e => setNewCrit({...newCrit, type: e.target.value as any})}
                        >
                            <option value="praise">Khen thưởng</option>
                            <option value="warn">Nhắc nhở</option>
                        </select>
                        <input 
                            required
                            type="text"
                            placeholder="Nội dung tiêu chí..."
                            className="flex-1 border border-gray-300 rounded-lg p-2 text-sm focus:ring-blue-500 outline-none"
                            value={newCrit.content}
                            onChange={e => setNewCrit({...newCrit, content: e.target.value})}
                        />
                        <input 
                            required
                            type="number"
                            min="1"
                            placeholder="Điểm"
                            className="w-20 border border-gray-300 rounded-lg p-2 text-sm focus:ring-blue-500 outline-none"
                            value={newCrit.points || ''}
                            onChange={e => setNewCrit({...newCrit, points: parseInt(e.target.value) || 0})}
                        />
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                            Thêm
                        </button>
                    </div>
                </form>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                    <div>
                        <h3 className="text-sm font-bold text-green-700 mb-2 flex items-center"><ThumbsUp size={16} className="mr-2"/> Tiêu chí khen thưởng</h3>
                        <ul className="space-y-2">
                            {criteria.filter(c => c.type === 'praise').map(c => (
                                <li key={c.id} className="flex justify-between items-center bg-white border border-gray-100 p-2 rounded-lg text-sm">
                                    <span className="flex-1 text-gray-800">{c.content}</span>
                                    <span className="text-green-600 font-bold w-16 text-right">+{c.points}</span>
                                    <button onClick={() => handleDelete(c.id)} className="ml-4 text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-yellow-700 mb-2 flex items-center"><AlertTriangle size={16} className="mr-2"/> Tiêu chí nhắc nhở</h3>
                        <ul className="space-y-2">
                            {criteria.filter(c => c.type === 'warn').map(c => (
                                <li key={c.id} className="flex justify-between items-center bg-white border border-gray-100 p-2 rounded-lg text-sm">
                                    <span className="flex-1 text-gray-800">{c.content}</span>
                                    <span className="text-yellow-600 font-bold w-16 text-right">-{c.points}</span>
                                    <button onClick={() => handleDelete(c.id)} className="ml-4 text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
