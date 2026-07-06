import React, { useEffect, useState } from 'react';
import { dataProvider } from '../../core/provider';
import { Document } from '../../core/types';
import { FileText, ExternalLink } from 'lucide-react';

export const AppDocuments = () => {
    const userStr = localStorage.getItem('currentUser');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const classId = currentUser?.classId || 'class-1';
    
    const [documents, setDocuments] = useState<Document[]>([]);
    
    useEffect(() => {
        const fetchDocuments = async () => {
            const allDocs = await dataProvider.list<Document>('documents');
            const classDocs = allDocs.filter(d => d.classId === classId);
            classDocs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setDocuments(classDocs);
        };
        fetchDocuments();
    }, []);

    // Grouping documents by category
    const groupedDocs = documents.reduce((acc, doc) => {
        if (!acc[doc.category]) {
            acc[doc.category] = [];
        }
        acc[doc.category].push(doc);
        return acc;
    }, {} as Record<string, Document[]>);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <FileText className="mr-3 text-blue-500" size={28} />
                    Tài liệu lớp học
                </h1>
                <p className="text-gray-500 mt-1 ml-10">Truy cập các nội quy, kế hoạch và biểu mẫu</p>
            </div>

            {Object.keys(groupedDocs).length > 0 ? (
                Object.entries(groupedDocs).map(([category, docs]: [string, any]) => (
                    <div key={category} className="mb-8">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">{category}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {docs.map(doc => (
                                <div key={doc.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center hover:shadow-md transition-shadow">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg mr-4">
                                        <FileText size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-gray-900 font-semibold mb-1 line-clamp-1" title={doc.title}>{doc.title}</h3>
                                        <p className="text-xs text-gray-500">Ngày đăng: {new Date(doc.createdAt).toLocaleDateString('vi-VN')}</p>
                                    </div>
                                    <a 
                                        href={doc.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="ml-4 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex flex-col items-center justify-center flex-shrink-0"
                                        title="Mở liên kết"
                                    >
                                        <ExternalLink size={20} />
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            ) : (
                <div className="bg-white p-12 rounded-xl text-center text-gray-500 border border-gray-100 shadow-sm flex flex-col items-center">
                    <FileText size={48} className="text-gray-300 mb-4" />
                    <p>Chưa có tài liệu nào được chia sẻ.</p>
                </div>
            )}
        </div>
    );
};
