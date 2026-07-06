import React from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { Users, BookOpen, Bell, Settings, FileText, MessageCircle, BarChart3, LogOut } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const AdminLayout = () => {
  const location = useLocation();

  const userStr = localStorage.getItem('currentUser');
  const currentUser = userStr ? JSON.parse(userStr) : null;

  // Chặn học sinh truy cập trang giáo viên
  if (currentUser && currentUser.role === 'student') {
    return <Navigate to="/app" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
  };

  const navItems = [
    { name: 'Tổng quan', path: '/admin', icon: BookOpen },
    { name: 'Lớp học', path: '/admin/classes', icon: Users },
    { name: 'Học sinh', path: '/admin/students', icon: Users },
    { name: 'Phụ huynh', path: '/admin/parents', icon: Users },
    { name: 'Điểm danh', path: '/admin/attendance', icon: BookOpen },
    { name: 'Nề nếp', path: '/admin/behavior', icon: BookOpen },
    { name: 'Tài liệu', path: '/admin/documents', icon: FileText },
    { name: 'Thông báo', path: '/admin/announcements', icon: Bell },
    { name: 'Tin nhắn', path: '/admin/messages', icon: MessageCircle },
    { name: 'Báo cáo', path: '/admin/reports', icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b">
          <h1 className="text-xl font-bold text-gray-800">Quản lý (GVCN)</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
               <Link 
                key={item.path} 
                to={item.path} 
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg font-medium transition-colors",
                  isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon size={20} className={isActive ? "text-blue-700" : "text-gray-500"} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t">
          <Link 
            to="/" 
            onClick={handleLogout}
            className="flex items-center space-x-3 p-3 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
          >
            <LogOut size={20} />
            <span>Thoát</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-6">
          <div className="md:hidden">
            <span className="font-bold text-lg">Quản lý (GVCN)</span>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
               O
            </div>
            <span className="text-sm font-medium hidden sm:block">GVCN: Huỳnh Nguyên Oanh</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
