import React, { useEffect, useState, useRef } from 'react';
import { dataProvider } from '../../core/provider';
import { Student, ClassInfo } from '../../core/types';
import { Modal } from '../../components/ui/Modal';
import { Search, Plus, Edit2, Trash2, Filter, Upload, Download, Shield, Key, Copy, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

export const StudentManagement = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClassId, setFilterClassId] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<Student>>({});
  
  // Account Management State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const generateUniqueStudentId = (existingStudents: Student[]) => {
    let maxNum = 0;
    existingStudents.forEach(s => {
      const match = s.id.match(/^HS(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    if (maxNum === 0) {
      maxNum = existingStudents.length;
    }
    let nextNum = maxNum + 1;
    let newId = `HS${String(nextNum).padStart(4, '0')}`;
    while (existingStudents.some(s => s.id.toLowerCase() === newId.toLowerCase())) {
      nextNum++;
      newId = `HS${String(nextNum).padStart(4, '0')}`;
    }
    return newId;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [fetchedStudents, fetchedClasses] = await Promise.all([
      dataProvider.list<Student>('students'),
      dataProvider.list<ClassInfo>('classes')
    ]);
    setStudents(fetchedStudents);
    setClasses(fetchedClasses);
  };

  const handleOpenModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData(student);
    } else {
      setEditingStudent(null);
      setFormData({ 
        name: '', 
        classId: filterClassId || (classes[0]?.id || ''), 
        dateOfBirth: '', 
        gender: 'male', 
        address: '', 
        parentId: '', 
        status: 'active' 
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      await dataProvider.update<Student>('students', editingStudent.id, formData);
    } else {
      const payload = { ...formData };
      if (payload.id && typeof payload.id === 'string') {
        payload.id = payload.id.trim();
      }
      if (!payload.id) {
        payload.id = generateUniqueStudentId(students);
      }
      await dataProvider.add<Student>('students', payload as Omit<Student, 'id'>);
    }
    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = (student: Student) => {
    setStudentToDelete(student);
  };

  const confirmDelete = async () => {
    if (studentToDelete) {
      await dataProvider.remove('students', studentToDelete.id);
      setStudentToDelete(null);
      loadData();
    }
  };

  const handleBulkCreateAccounts = async () => {
    // Chỉ lấy học sinh thuộc bộ lọc lớp hiện tại (hoặc tất cả nếu không chọn) chưa có tài khoản
    const targetStudents = students.filter(s => {
      const matchesClass = !filterClassId || s.classId === filterClassId;
      return matchesClass && (!s.username || !s.password);
    });

    if (targetStudents.length === 0) {
      alert("Tất cả học sinh trong danh sách hiển thị đều đã được cấp tài khoản!");
      return;
    }

    if (window.confirm(`Xác nhận tạo tài khoản tự động cho ${targetStudents.length} học sinh chưa có tài khoản?`)) {
      try {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        
        for (const student of targetStudents) {
          const generatedUsername = student.id; // Tên đăng nhập là Mã học sinh (studentId)
          
          // Tạo mật khẩu ngẫu nhiên 8 ký tự (hoặc mặc định là "Hocsinh@123" nếu không có ngẫu nhiên)
          let generatedPassword = '';
          for (let i = 0; i < 8; i++) {
            generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          
          await dataProvider.update<Student>('students', student.id, {
            username: generatedUsername,
            password: generatedPassword
          });
        }
        
        alert(`Tạo tài khoản hàng loạt thành công cho ${targetStudents.length} học sinh!`);
        await loadData(); // Load lại dữ liệu để cập nhật state học sinh, kích hoạt re-render giao diện lập tức
      } catch (error) {
        console.error(error);
        alert("Có lỗi xảy ra trong quá trình tạo tài khoản.");
      }
    }
  };

  const handleSingleCreateAccount = async (student: Student) => {
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const generatedUsername = student.id;
      let generatedPassword = '';
      for (let i = 0; i < 8; i++) {
        generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      await dataProvider.update<Student>('students', student.id, {
        username: generatedUsername,
        password: generatedPassword
      });

      // Update state locally for fast feedback
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, username: generatedUsername, password: generatedPassword } : s));
      alert(`Đã cấp tài khoản thành công cho học sinh ${student.name}!`);
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi tạo tài khoản.");
    }
  };

  const handleSingleDeleteAccount = async (student: Student) => {
    if (window.confirm(`Xác nhận xóa tài khoản đăng nhập của học sinh ${student.name}?`)) {
      try {
        await dataProvider.update<Student>('students', student.id, {
          username: '',
          password: ''
        });

        // Update state locally for fast feedback
        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, username: '', password: '' } : s));
        alert(`Đã xóa tài khoản đăng nhập của học sinh ${student.name}.`);
      } catch (error) {
        console.error(error);
        alert("Có lỗi xảy ra khi xóa tài khoản.");
      }
    }
  };

  const handleCopyAccount = (student: Student) => {
    if (!student.username || !student.password) {
      alert("Học sinh này chưa được cấp tài khoản!");
      return;
    }
    const text = `Tài khoản: ${student.username}\nMật khẩu: ${student.password}`;
    navigator.clipboard.writeText(text);
    alert(`Đã sao chép thông tin tài khoản của ${student.name} vào bộ nhớ tạm!`);
  };

  const handleExportAccounts = () => {
    const targetStudents = students.filter(s => !filterClassId || s.classId === filterClassId);

    if (targetStudents.length === 0) {
      alert("Không có học sinh nào để xuất danh sách!");
      return;
    }

    const headers = [
      ["Mã Học Sinh", "Họ và Tên", "Lớp", "Tên đăng nhập (Username)", "Mật khẩu (Password)", "Trạng thái"]
    ];

    const rows = targetStudents.map(s => [
      s.id,
      s.name,
      getClassName(s.classId),
      s.username || "Chưa tạo",
      s.password || "-",
      s.username ? "Đã cấp tài khoản" : "Chưa có tài khoản"
    ]);

    const wsData = [...headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Định dạng độ rộng các cột
    ws['!cols'] = [
      { wch: 15 }, // Mã Học Sinh
      { wch: 25 }, // Họ và Tên
      { wch: 15 }, // Lớp
      { wch: 25 }, // Username
      { wch: 18 }, // Password
      { wch: 20 }  // Trạng thái
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh sách tài khoản");
    
    const classNameLabel = filterClassId ? getClassName(filterClassId).replace(/\s+/g, '_') : 'Tat_ca_cac_lop';
    XLSX.writeFile(wb, `Danh_sach_tai_khoan_hoc_sinh_${classNameLabel}.xlsx`);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const headers = [
      ["Mã học sinh", "Họ và tên", "Lớp", "Tổ", "Giới tính", "Ngày sinh", "Địa chỉ", "ID Phụ huynh"]
    ];
    const sampleData = [
      ["HS0001", "Nguyễn Văn A", "10A1", "Tổ 1", "Nam", "15/05/2012", "123 Đường Lê Lợi, Quận 1, TP. HCM", ""],
      ["HS0002", "Trần Thị B", "10A2", "Tổ 2", "Nữ", "20/10/2012", "456 Nguyễn Huệ, Quận 1, TP. HCM", ""]
    ];
    
    const wsData = [...headers, ...sampleData];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths to make it look professional
    ws['!cols'] = [
      { wch: 15 }, // Mã học sinh
      { wch: 25 }, // Họ và tên
      { wch: 15 }, // Lớp
      { wch: 10 }, // Tổ
      { wch: 12 }, // Giới tính
      { wch: 15 }, // Ngày sinh
      { wch: 40 }, // Địa chỉ
      { wch: 15 }  // ID Phụ huynh
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu học sinh");
    XLSX.writeFile(wb, "Mau_nhap_lieu_hoc_sinh.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataBuffer = evt.target?.result;
        const wb = XLSX.read(dataBuffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        // Helper normalize keys for case/accent insensitive column header matching
        const normalizeKey = (str: string) => {
          return str.trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove Vietnamese accents
            .replace(/[^a-z0-9]/g, ""); // Remove spaces/special characters
        };

        const getRowValue = (rowObj: any, ...aliases: string[]) => {
          const keys = Object.keys(rowObj);
          const normalizedAliases = aliases.map(a => normalizeKey(a));
          for (const key of keys) {
            if (normalizedAliases.includes(normalizeKey(key))) {
              return rowObj[key];
            }
          }
          return undefined;
        };

        const currentStudents = [...students];
        let count = 0;
        let errors: string[] = [];

        for (const row of data as any[]) {
          const name = getRowValue(row, 'Họ và tên', 'Họ tên', 'Tên', 'Name', 'Ho va ten', 'Ho ten');
          if (!name) continue;
          
          // Determine class
          const className = String(getRowValue(row, 'Lớp', 'Lớp học', 'Lop', 'Class') || '').trim();
          let targetClassId = filterClassId;
          
          if (className) {
            const foundClass = classes.find(c => c.name.toLowerCase() === className.toLowerCase() || c.id.toLowerCase() === className.toLowerCase());
            if (foundClass) {
              targetClassId = foundClass.id;
            } else {
              // Create the class dynamically if it does not exist
              try {
                const newClassId = `class-${normalizeKey(className)}`;
                const newClass: ClassInfo = {
                  id: newClassId,
                  name: className,
                  teacherId: 'teacher-1',
                  schoolYear: '2025-2026',
                  description: `Lớp ${className}`
                };
                await dataProvider.add<ClassInfo>('classes', newClass);
                classes.push(newClass);
                setClasses([...classes]);
                targetClassId = newClassId;
              } catch (classErr) {
                console.error(classErr);
              }
            }
          }

          if (!targetClassId) {
            errors.push(`Học sinh "${name}" bị bỏ qua vì không có thông tin lớp học hợp lệ (Hãy chọn bộ lọc lớp hoặc nhập tên lớp trong Excel).`);
            continue;
          }

          let gender: 'male' | 'female' | 'other' = 'other';
          const rawGender = String(getRowValue(row, 'Giới tính', 'Gioi tinh', 'Gender') || '').trim().toLowerCase();
          const normalizedGender = rawGender.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          if (normalizedGender === 'nam' || normalizedGender === 'male') gender = 'male';
          else if (normalizedGender === 'nu' || normalizedGender === 'female') gender = 'female';
          
          let rawDate = getRowValue(row, 'Ngày sinh', 'Ngay sinh', 'DOB', 'Birthday', 'Birth Date');
          let dateOfBirth = new Date().toISOString().split('T')[0];
          
          if (rawDate) {
              if (typeof rawDate === 'number') {
                  // Excel serial date to JS Date
                  dateOfBirth = new Date((rawDate - (25567 + 2)) * 86400 * 1000).toISOString().split('T')[0];
              } else {
                  // Try to parse string DD/MM/YYYY or similar, fallback
                  const parts = String(rawDate).split(/[/-]/);
                  if (parts.length === 3) {
                      if (parts[2].length === 4) {
                          dateOfBirth = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                      } else {
                          dateOfBirth = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                      }
                  } else {
                      const d = new Date(rawDate);
                      if (!isNaN(d.getTime())) {
                        dateOfBirth = d.toISOString().split('T')[0];
                      }
                  }
              }
          }

          const address = String(getRowValue(row, 'Địa chỉ', 'Dia chi', 'Address') || '');
          const parentId = String(getRowValue(row, 'ID Phụ huynh', 'Mã phụ huynh', 'Phụ huynh', 'ID Phu huynh', 'Parent ID', 'ParentID') || '');
          const group = String(getRowValue(row, 'Tổ', 'To', 'Group', 'To hoc tap') || '').trim();

          let studentId = String(getRowValue(row, 'Mã học sinh', 'Mã HS', 'Ma hoc sinh', 'Ma HS', 'Student ID', 'StudentID', 'ID') || '').trim();
          if (!studentId) {
            studentId = generateUniqueStudentId(currentStudents);
          }

          const newStudent: Student = {
            id: studentId,
            name: String(name),
            classId: targetClassId,
            dateOfBirth,
            gender,
            group,
            address,
            parentId,
            status: 'active'
          };

          await dataProvider.add<Student>('students', newStudent);
          currentStudents.push(newStudent);
          count++;
        }
        
        if (errors.length > 0) {
          alert(`Đã nhập thành công ${count} học sinh.\nLưu ý:\n${errors.join('\n')}`);
        } else {
          alert(`Đã nhập thành công ${count} học sinh từ file Excel!`);
        }
        loadData();
      } catch (err) {
        console.error(err);
        alert("Có lỗi xảy ra khi đọc file Excel, vui lòng kiểm tra lại định dạng.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = filterClassId ? s.classId === filterClassId : true;
    return matchesSearch && matchesClass;
  });

  const getClassName = (classId: string) => {
    return classes.find(c => c.id === classId)?.name || 'Không rõ';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý học sinh</h1>
          <p className="text-gray-500 mt-1">Danh sách học sinh theo lớp</p>
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
            onClick={handleDownloadTemplate}
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2"
          >
            <Download size={20} className="text-gray-500" />
            <span>Tải file mẫu</span>
          </button>
          <button 
            onClick={() => {
              fileInputRef.current?.click();
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2"
          >
            <Upload size={20} />
            <span>Thêm từ Excel</span>
          </button>
          <button 
            onClick={() => setIsAccountModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2 cursor-pointer"
          >
            <Shield size={20} />
            <span>Quản lý Tài khoản</span>
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Thêm học sinh</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3">
          <Search className="text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Tìm kiếm theo tên..." 
            className="w-full bg-transparent border-none focus:ring-0 text-gray-700 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3 min-w-[200px]">
          <Filter className="text-gray-400" size={20} />
          <select 
            className="w-full bg-transparent border-none focus:ring-0 text-gray-700 outline-none"
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
          >
            <option value="">Tất cả các lớp</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mã học sinh</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Họ và tên</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Lớp</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổ</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ngày sinh</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredStudents.map(student => (
              <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-600">{student.id}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{student.name}</div>
                  <div className="text-sm text-gray-500">{student.gender === 'male' ? 'Nam' : student.gender === 'female' ? 'Nữ' : 'Khác'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">{getClassName(student.classId)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700 font-medium">{student.group || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{new Date(student.dateOfBirth).toLocaleDateString('vi-VN')}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {student.status === 'active' ? 'Đang học' : 'Nghỉ học'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                  <button onClick={() => handleOpenModal(student)} className="text-blue-600 hover:text-blue-900">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(student)} className="text-red-600 hover:text-red-900">
                     <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  Không tìm thấy học sinh nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingStudent ? "Chỉnh sửa học sinh" : "Thêm học sinh"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã học sinh</label>
              <input 
                type="text" 
                disabled={!!editingStudent}
                placeholder={editingStudent ? "" : "Nhập mã học sinh tự chọn hoặc để trống để tự động tạo"}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500 font-mono"
                value={formData.id || ''}
                onChange={e => setFormData({...formData, id: e.target.value})}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
              <input 
                required
                type="text" 
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={formData.name || ''}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lớp</label>
              <select 
                required
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={formData.classId || ''}
                onChange={e => setFormData({...formData, classId: e.target.value})}
              >
                <option value="" disabled>Chọn lớp...</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tổ</label>
              <input 
                type="text" 
                placeholder="Ví dụ: Tổ 1"
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={formData.group || ''}
                onChange={e => setFormData({...formData, group: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
              <input 
                required
                type="date" 
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={formData.dateOfBirth || ''}
                onChange={e => setFormData({...formData, dateOfBirth: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
              <select 
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={formData.gender || 'male'}
                onChange={e => setFormData({...formData, gender: e.target.value as any})}
              >
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <select 
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={formData.status || 'active'}
                onChange={e => setFormData({...formData, status: e.target.value as any})}
              >
                <option value="active">Đang học</option>
                <option value="inactive">Nghỉ học</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
              <input 
                type="text" 
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={formData.address || ''}
                onChange={e => setFormData({...formData, address: e.target.value})}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phụ huynh (ID)</label>
              <input 
                type="text" 
                placeholder="ID Phụ huynh"
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={formData.parentId || ''}
                onChange={e => setFormData({...formData, parentId: e.target.value})}
              />
            </div>
            <div className="col-span-2 border-t border-gray-100 pt-3 mt-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Tài khoản đăng nhập</h4>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
              <input 
                type="text" 
                placeholder="Ví dụ: Mã học sinh"
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
                value={formData.username || ''}
                onChange={e => setFormData({...formData, username: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
              <input 
                type="text" 
                placeholder="Mật khẩu đăng nhập"
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
                value={formData.password || ''}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
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

      <Modal
        isOpen={!!studentToDelete}
        onClose={() => setStudentToDelete(null)}
        title="Xác nhận xóa học sinh"
      >
        <div className="space-y-4">
          <p className="text-gray-600 text-sm leading-relaxed">
            Bạn có chắc chắn muốn xóa học sinh <span className="font-semibold text-gray-900">{studentToDelete?.name}</span>? 
            Hành động này không thể hoàn tác và mọi dữ liệu liên quan đến học sinh này sẽ bị ảnh hưởng.
          </p>
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setStudentToDelete(null)}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium shadow-sm transition-colors"
            >
              Xác nhận xóa
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Quản lý Tài khoản */}
      <Modal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        title={filterClassId ? `Quản lý Tài khoản - ${getClassName(filterClassId)}` : "Quản lý Tài khoản học sinh"}
      >
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-semibold text-blue-900 text-sm md:text-base">Công cụ cấp tài khoản</h3>
              <p className="text-xs text-blue-700 mt-0.5">Tên đăng nhập tự động lấy theo Mã học sinh. Mật khẩu được tạo ngẫu nhiên bảo mật.</p>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button
                onClick={handleBulkCreateAccounts}
                className="flex-1 md:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 text-xs rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <Key size={14} />
                <span>Tạo tài khoản hàng loạt</span>
              </button>
              <button
                onClick={handleExportAccounts}
                className="flex-1 md:flex-initial bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 text-xs rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <Download size={14} />
                <span>Xuất file XLSX</span>
              </button>
            </div>
          </div>

          <div className="border border-gray-100 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mã HS</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Họ và tên</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tên đăng nhập</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mật khẩu</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100 text-sm">
                {students
                  .filter(s => !filterClassId || s.classId === filterClassId)
                  .map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{s.id}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{s.name}</td>
                      <td className="px-4 py-2.5">
                        {s.username ? (
                          <span className="font-mono bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs border border-green-100">
                            {s.username}
                          </span>
                        ) : (
                          <span className="text-xs text-red-500 font-medium">Chưa có tài khoản</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-700 font-semibold">
                        {s.password || "-"}
                      </td>
                      <td className="px-4 py-2.5 text-right space-x-2 whitespace-nowrap">
                        {s.username ? (
                          <>
                            <button
                              onClick={() => handleCopyAccount(s)}
                              title="Sao chép tài khoản"
                              className="text-gray-500 hover:text-blue-600 p-1 rounded hover:bg-gray-100 transition-colors inline-flex items-center justify-center cursor-pointer"
                            >
                              <Copy size={14} />
                            </button>
                            <button
                              onClick={() => handleSingleCreateAccount(s)}
                              title="Cấp lại/Đổi mật khẩu"
                              className="text-indigo-500 hover:text-indigo-700 p-1 rounded hover:bg-gray-100 transition-colors inline-flex items-center justify-center cursor-pointer"
                            >
                              <RefreshCw size={14} />
                            </button>
                            <button
                              onClick={() => handleSingleDeleteAccount(s)}
                              title="Xóa tài khoản"
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-gray-100 transition-colors inline-flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleSingleCreateAccount(s)}
                            title="Tạo tài khoản"
                            className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
                          >
                            Tạo tài khoản
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                {students.filter(s => !filterClassId || s.classId === filterClassId).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-xs">
                      Không có học sinh trong lớp được chọn.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsAccountModalOpen(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-4 py-2 text-xs rounded-lg transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
