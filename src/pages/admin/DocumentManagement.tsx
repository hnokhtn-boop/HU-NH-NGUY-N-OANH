import React, { useEffect, useState } from 'react';
import { dataProvider } from '../../core/provider';
import { Document, ClassInfo } from '../../core/types';
import { Modal } from '../../components/ui/Modal';
import { Plus, Edit2, Trash2, FileText, Download, ExternalLink } from 'lucide-react';

export const DocumentManagement = () => {
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDoc, setEditingDoc] = useState<Document | null>(null);
    const [formData, setFormData] = useState<Partial<Document>>({});

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
            loadDocuments();
        }
    }, [selectedClassId]);

    const loadDocuments = async () => {
        const docs = await dataProvider.list<Document>('documents');
        const classDocs = docs.filter(d => d.classId === selectedClassId);
        classDocs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setDocuments(classDocs);
    };

    const handleOpenModal = (doc?: Document) => {
        if (doc) {
            setEditingDoc(doc);
            setFormData(doc);
        } else {
            setEditingDoc(null);
            setFormData({
                classId: selectedClassId,
                createdAt: new Date().toISOString(),
                title: '',
                category: 'Nội quy',
                url: ''
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
        if (editingDoc) {
            await dataProvider.update<Document>('documents', editingDoc.id, payload);
        } else {
            await dataProvider.add<Document>('documents', payload as Omit<Document, 'id'>);
        }
        setIsModalOpen(false);
        loadDocuments();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) {
            await dataProvider.remove('documents', id);
            loadDocuments();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                <h1 className="text-2xl font-bold text-gray-900">Tài liệu lớp học</h1>
                <p className="text-gray-500 mt-1">Quản lý biểu mẫu, kế hoạch, nội quy</p>
                </div>
                <button 
                onClick={() => handleOpenModal()}
                disabled={!selectedClassId}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2"
                >
                <Plus size={20} />
                <span>Thêm Tài liệu</span>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents.map(doc => (
                    <div key={doc.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                <FileText size={24} />
                            </div>
                            <div className="flex space-x-2">
                                <button onClick={() => handleOpenModal(doc)} className="text-gray-400 hover:text-blue-600">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(doc.id)} className="text-gray-400 hover:text-red-600">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="mb-4 flex-1">
                            <span className="text-xs font-semibold text-blue-600 mb-1 inline-block uppercase tracking-wider">{doc.category}</span>
                            <h3 className="text-gray-900 font-bold mb-1 line-clamp-2">{doc.title}</h3>
                            <p className="text-xs text-gray-500">Đăng ngày: {new Date(doc.createdAt).toLocaleDateString('vi-VN')} {new Date(doc.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <a 
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mt-auto w-full flex items-center justify-center space-x-2 py-2 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-lg transition-colors border border-gray-200"
                        >
                            <ExternalLink size={16} />
                            <span>Mở liên kết</span>
                        </a>
                    </div>
                ))}
            </div>
            
            {documents.length === 0 && selectedClassId && (
                <div className="bg-white p-12 rounded-xl text-center text-gray-500 border border-gray-100 shadow-sm flex flex-col items-center">
                    <FileText size={48} className="text-gray-300 mb-4" />
                    <p>Chưa có tài liệu nào cho lớp này.</p>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingDoc ? "Sửa tài liệu" : "Thêm tài liệu mới"}>
                <form onSubmit={handleSave} className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Loại tài liệu / Chuyên mục</label>
                        <select 
                            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none"
                            value={formData.category || 'Nội quy'}
                            onChange={e => setFormData({...formData, category: e.target.value})}
                        >
                            <option value="Nội quy">Nội quy</option>
                            <option value="Kế hoạch">Kế hoạch</option>
                            <option value="Biểu mẫu">Biểu mẫu</option>
                            <option value="Tài liệu học tập">Tài liệu học tập</option>
                            <option value="Khác">Khác</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên tài liệu</label>
                        <input 
                            required
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none"
                            value={formData.title || ''}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Đường dẫn liên kết (URL)</label>
                        <input 
                            required
                            type="url" 
                            placeholder="https://..."
                            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none"
                            value={formData.url || ''}
                            onChange={e => setFormData({...formData, url: e.target.value})}
                        />
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
                    <div className="pt-4 flex justify-end space-x-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Hủy</button>
                        <button type="submit" className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium shadow-sm">Lưu</button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
