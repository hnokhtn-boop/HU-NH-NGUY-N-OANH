import React, { useEffect, useState } from 'react';
import { dataProvider } from '../../core/provider';
import { Announcement, ClassInfo } from '../../core/types';
import { Modal } from '../../components/ui/Modal';
import { Plus, Edit2, Trash2, Search, Pin, PinOff } from 'lucide-react';

export const AnnouncementManagement = () => {
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
    const [formData, setFormData] = useState<Partial<Announcement>>({});

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
            loadAnnouncements();
        }
    }, [selectedClassId]);

    const loadAnnouncements = async () => {
        const ann = await dataProvider.list<Announcement>('announcements');
        const classAnn = ann.filter(a => a.classId === selectedClassId);
        // Sort descending by date, but keep pinned on top
        classAnn.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setAnnouncements(classAnn);
    };

    const formatToDateTimeLocal = (isoString?: string) => {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return '';
            const tzOffset = date.getTimezoneOffset() * 60000;
            return (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
        } catch {
            return '';
        }
    };

    const handleOpenModal = (ann?: Announcement) => {
        if (ann) {
            setEditingAnnouncement(ann);
            setFormData(ann);
        } else {
            setEditingAnnouncement(null);
            setFormData({
                classId: selectedClassId,
                createdAt: new Date().toISOString(),
                target: 'all',
                pinned: false,
                title: '',
                content: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalCreatedAt = formData.createdAt ? new Date(formData.createdAt).toISOString() : new Date().toISOString();
        const payload = {
            ...formData,
            createdAt: finalCreatedAt
        };
        if (editingAnnouncement) {
            await dataProvider.update<Announcement>('announcements', editingAnnouncement.id, payload);
        } else {
            await dataProvider.add<Announcement>('announcements', payload as Omit<Announcement, 'id'>);
        }
        setIsModalOpen(false);
        loadAnnouncements();
    };

    const handleTogglePin = async (ann: Announcement) => {
        await dataProvider.update<Announcement>('announcements', ann.id, { pinned: !ann.pinned });
        loadAnnouncements();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa thông báo này?')) {
            await dataProvider.remove('announcements', id);
            loadAnnouncements();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                <h1 className="text-2xl font-bold text-gray-900">Quản lý Thông báo</h1>
                <p className="text-gray-500 mt-1">Tạo và đăng thông báo cho lớp học</p>
                </div>
                <button 
                onClick={() => handleOpenModal()}
                disabled={!selectedClassId}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2"
                >
                <Plus size={20} />
                <span>Thêm Thông báo</span>
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 items-center">
                 <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Lớp:</span>
                    <select 
                        className="border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none text-sm"
                        value={selectedClassId}
                        onChange={e => setSelectedClassId(e.target.value)}
                    >
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                 </div>
            </div>

            <div className="space-y-4">
                {announcements.map(ann => (
                    <div key={ann.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-bold text-gray-900">{ann.title}</h3>
                                {ann.pinned && (
                                    <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center">
                                        <Pin size={12} className="mr-1" /> Đã ghim
                                    </span>
                                )}
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium 
                                    ${ann.target === 'all' ? 'bg-blue-100 text-blue-700' 
                                    : ann.target === 'parent' ? 'bg-purple-100 text-purple-700' 
                                    : 'bg-green-100 text-green-700'}`}
                                >
                                    {ann.target === 'all' ? 'Tất cả' : ann.target === 'parent' ? 'Phụ huynh' : 'Học sinh'}
                                </span>
                            </div>
                            <p className="text-gray-700 mb-4 whitespace-pre-line text-sm">{ann.content}</p>
                            <span className="text-xs text-gray-500">
                                Đăng ngày: {new Date(ann.createdAt).toLocaleDateString('vi-VN')} {new Date(ann.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <div className="flex items-start justify-end gap-2 md:w-32 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-4">
                            <button 
                                onClick={() => handleTogglePin(ann)} 
                                className={`p-2 rounded-lg transition-colors ${ann.pinned ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'text-gray-400 hover:bg-gray-100'}`}
                                title={ann.pinned ? "Bỏ ghim" : "Ghim thông báo"}
                            >
                                {ann.pinned ? <PinOff size={18} /> : <Pin size={18} />}
                            </button>
                            <button onClick={() => handleOpenModal(ann)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                                <Edit2 size={18} />
                            </button>
                            <button onClick={() => handleDelete(ann.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
                
                {announcements.length === 0 && selectedClassId && (
                    <div className="bg-white p-8 rounded-xl text-center text-gray-500 border border-gray-100 shadow-sm">
                        Chưa có thông báo nào cho lớp này.
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAnnouncement ? "Sửa thông báo" : "Thông báo mới"}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
                        <input 
                            required
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none"
                            value={formData.title || ''}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung</label>
                        <textarea 
                            required
                            rows={4}
                            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none"
                            value={formData.content || ''}
                            onChange={e => setFormData({...formData, content: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Đối tượng</label>
                            <select 
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none"
                                value={formData.target || 'all'}
                                onChange={e => setFormData({...formData, target: e.target.value as any})}
                            >
                                <option value="all">Tất cả</option>
                                <option value="parent">Phụ huynh</option>
                                <option value="student">Học sinh</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày giờ đăng</label>
                            <input 
                                required
                                type="datetime-local"
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none"
                                value={formatToDateTimeLocal(formData.createdAt)}
                                onChange={e => setFormData({...formData, createdAt: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                        <input 
                            type="checkbox"
                            id="isPinned"
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                            checked={formData.pinned || false}
                            onChange={e => setFormData({...formData, pinned: e.target.checked})}
                        />
                        <label htmlFor="isPinned" className="text-sm font-medium text-gray-700">
                            Ghim lên đầu
                        </label>
                    </div>
                    <div className="pt-4 flex justify-end space-x-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Hủy</button>
                        <button type="submit" className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium shadow-sm">Lưu</button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
