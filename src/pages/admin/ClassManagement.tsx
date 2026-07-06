import React, { useEffect, useState } from 'react';
import { dataProvider } from '../../core/provider';
import { ClassInfo } from '../../core/types';
import { Modal } from '../../components/ui/Modal';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';

export const ClassManagement = () => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<ClassInfo>>({});

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    const data = await dataProvider.list<ClassInfo>('classes');
    setClasses(data);
  };

  const handleOpenModal = (cls?: ClassInfo) => {
    if (cls) {
      setEditingClass(cls);
      setFormData(cls);
    } else {
      setEditingClass(null);
      setFormData({ name: '', schoolYear: '', teacherId: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClass) {
      await dataProvider.update<ClassInfo>('classes', editingClass.id, formData);
    } else {
      await dataProvider.add<ClassInfo>('classes', formData as Omit<ClassInfo, 'id'>);
    }
    setIsModalOpen(false);
    loadClasses();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa lớp học này?')) {
      await dataProvider.remove('classes', id);
      loadClasses();
    }
  };

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.schoolYear?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý lớp học</h1>
          <p className="text-gray-500 mt-1">Danh sách các lớp học bạn đang quản lý</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Thêm lớp học</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3">
        <Search className="text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Tìm kiếm lớp học, năm học..." 
          className="w-full bg-transparent border-none focus:ring-0 text-gray-700"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên lớp</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Năm học</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mô tả</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredClasses.map(cls => (
              <tr key={cls.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{cls.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{cls.schoolYear}</td>
                <td className="px-6 py-4 text-gray-500">{cls.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                  <button onClick={() => handleOpenModal(cls)} className="text-blue-600 hover:text-blue-900">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(cls.id)} className="text-red-600 hover:text-red-900">
                     <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredClasses.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  Không tìm thấy lớp học nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingClass ? "Chỉnh sửa lớp học" : "Thêm lớp học"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên lớp</label>
            <input 
              required
              type="text" 
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
              value={formData.name || ''}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Năm học</label>
            <input 
              required
              type="text" 
              placeholder="VD: 2023-2024"
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
              value={formData.schoolYear || ''}
              onChange={e => setFormData({...formData, schoolYear: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GVCN (ID)</label>
            <input 
              required
              type="text" 
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
              value={formData.teacherId || ''}
              onChange={e => setFormData({...formData, teacherId: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
            <textarea 
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
              rows={3}
              value={formData.description || ''}
              onChange={e => setFormData({...formData, description: e.target.value})}
            ></textarea>
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
    </div>
  );
};
