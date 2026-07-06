import React, { useEffect, useState, useRef } from 'react';
import { dataProvider } from '../../core/provider';
import { Parent, Student, ClassInfo } from '../../core/types';
import { Modal } from '../../components/ui/Modal';
import { Search, Plus, Edit2, Trash2, Filter, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export const ParentManagement = () => {
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [parentToDelete, setParentToDelete] = useState<Parent | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClassId, setFilterClassId] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<Parent>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const headers = [
      ["Họ và tên", "Mối quan hệ", "Số điện thoại", "Email", "Mã học sinh"]
    ];
    const sampleData = [
      ["Nguyễn Văn Hải", "Bố", "0901234567", "hai.nguyen@example.com", "HS0001"],
      ["Trần Thị Mai", "Mẹ", "0912345678", "mai.tran@example.com", "HS0002, HS0003"]
    ];
    
    const wsData = [...headers, ...sampleData];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Họ và tên
      { wch: 15 }, // Mối quan hệ
      { wch: 15 }, // Số điện thoại
      { wch: 25 }, // Email
      { wch: 25 }  // Mã học sinh
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu phụ huynh");
    XLSX.writeFile(wb, "Mau_nhap_lieu_phu_huynh.xlsx");
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

        let count = 0;
        for (const row of data as any[]) {
          const name = getRowValue(row, 'Họ và tên', 'Phụ huynh', 'Họ tên', 'Tên', 'Name', 'Ho va ten', 'Phu huynh', 'Ho ten', 'Ten');
          if (!name) continue;
          
          const relationship = String(getRowValue(row, 'Mối quan hệ', 'Quan hệ', 'Moi quan he', 'Quan he', 'Relationship', 'Relation', 'Vai trò', 'Vai tro') || 'Bố');
          const phoneNumber = String(getRowValue(row, 'Số điện thoại', 'SĐT', 'SDT', 'Phone', 'PhoneNumber', 'Phone Number', 'Dien thoai', 'Số ĐT', 'So DT', 'Sdt') || '');
          const email = String(getRowValue(row, 'Email', 'Địa chỉ email', 'Dia chi email') || '');
          
          const rawStudentIds = getRowValue(row, 'ID học sinh', 'Mã học sinh', 'Các ID học sinh', 'Ma HS', 'Mã HS', 'Ma hoc sinh', 'Student ID', 'StudentIDs', 'StudentID', 'Các mã học sinh', 'Học sinh', 'Hoc sinh', 'Id hoc sinh', 'ID HS', 'Id HS', 'IdHS', 'Mã số học sinh', 'Ma so hoc sinh');
          let studentIds: string[] = [];
          if (rawStudentIds) {
            studentIds = String(rawStudentIds).split(/[,;/]/).map(s => s.trim()).filter(Boolean);
          }

          const newParent: Omit<Parent, 'id'> = {
            name: String(name),
            relationship,
            phoneNumber,
            email,
            studentIds
          };

          await dataProvider.add<Parent>('parents', newParent);
          count++;
        }
        
        alert(`Đã thêm thành công ${count} phụ huynh!`);
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [fetchedParents, fetchedStudents, fetchedClasses] = await Promise.all([
      dataProvider.list<Parent>('parents'),
      dataProvider.list<Student>('students'),
      dataProvider.list<ClassInfo>('classes')
    ]);
    setParents(fetchedParents);
    setStudents(fetchedStudents);
    setClasses(fetchedClasses);
  };

  const handleOpenModal = (parent?: Parent) => {
    if (parent) {
      setEditingParent(parent);
      setFormData(parent);
    } else {
      setEditingParent(null);
      setFormData({ 
        name: '', 
        phoneNumber: '', 
        email: '', 
        relationship: 'Bố', 
        studentIds: [] 
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Normalize studentIds if it's input as comma separated
    const finalData = {
        ...formData,
        studentIds: typeof formData.studentIds === 'string' 
            ? (formData.studentIds as string).split(',').map(s => s.trim()).filter(Boolean) 
            : formData.studentIds
    };

    if (editingParent) {
      await dataProvider.update<Parent>('parents', editingParent.id, finalData);
    } else {
      await dataProvider.add<Parent>('parents', finalData as Omit<Parent, 'id'>);
    }
    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = (parent: Parent) => {
    setParentToDelete(parent);
  };

  const confirmDeleteParent = async () => {
    if (parentToDelete) {
      await dataProvider.remove('parents', parentToDelete.id);
      setParentToDelete(null);
      loadData();
    }
  };

  // Filter logic
  const filteredParents = parents.filter(p => {
    const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phoneNumber.includes(searchTerm) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Check if the parent has any student in the selected class
    let matchesClass = true;
    if (filterClassId) {
        const studentIdsInClass = students.filter(s => s.classId === filterClassId).map(s => s.id);
        matchesClass = (p.studentIds || []).some(id => studentIdsInClass.includes(id));
    }

    return matchesSearch && matchesClass;
  });

  const getStudentNames = (studentIds?: string[]) => {
      if (!studentIds || studentIds.length === 0) return 'Chưa gán';
      return studentIds.map(id => {
          const student = students.find(s => s.id === id);
          return student ? student.name : id;
      }).join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý phụ huynh</h1>
          <p className="text-gray-500 mt-1">Danh sách thông tin liên lạc phụ huynh học sinh</p>
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
            onClick={() => fileInputRef.current?.click()}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2"
          >
            <Upload size={20} />
            <span>Thêm từ Excel</span>
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Thêm phụ huynh</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3">
          <Search className="text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Tìm kiếm theo tên, số điện thoại, email..." 
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
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Họ và tên</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Liên hệ</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Học sinh (Con)</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredParents.map(parent => (
              <tr key={parent.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{parent.name}</div>
                  <div className="text-sm text-gray-500">{parent.relationship}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">{parent.phoneNumber}</div>
                    <div className="text-sm text-gray-500">{parent.email}</div>
                </td>
                <td className="px-6 py-4 text-gray-700">
                    {getStudentNames(parent.studentIds)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                  <button onClick={() => handleOpenModal(parent)} className="text-blue-600 hover:text-blue-900">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(parent)} className="text-red-600 hover:text-red-900">
                     <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredParents.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  Không tìm thấy phụ huynh nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingParent ? "Chỉnh sửa phụ huynh" : "Thêm phụ huynh"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Mối quan hệ</label>
               <input 
                required
                type="text" 
                placeholder="VD: Bố, Mẹ, Ông, Bà..."
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={formData.relationship || ''}
                onChange={e => setFormData({...formData, relationship: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
               <input 
                required
                type="tel" 
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={formData.phoneNumber || ''}
                onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input 
                required
                type="email" 
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={formData.email || ''}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Các ID học sinh (Cách nhau bằng dấu phẩy)</label>
              <input 
                type="text" 
                placeholder="student-1, student-2"
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={Array.isArray(formData.studentIds) ? formData.studentIds.join(', ') : (formData.studentIds || '')}
                onChange={e => setFormData({...formData, studentIds: e.target.value as any})}
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
        isOpen={!!parentToDelete}
        onClose={() => setParentToDelete(null)}
        title="Xác nhận xóa phụ huynh"
      >
        <div className="space-y-4">
          <p className="text-gray-600 text-sm leading-relaxed">
            Bạn có chắc chắn muốn xóa phụ huynh <span className="font-semibold text-gray-900">{parentToDelete?.name}</span>? 
            Hành động này không thể hoàn tác và mọi dữ liệu liên quan đến phụ huynh này sẽ bị ảnh hưởng.
          </p>
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setParentToDelete(null)}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={confirmDeleteParent}
              className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium shadow-sm transition-colors"
            >
              Xác nhận xóa
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
