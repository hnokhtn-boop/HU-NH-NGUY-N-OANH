import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, MessageCircle, FileText, Bell, LogOut } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const AppLayout = () => {
    const location = useLocation();

    const userStr = localStorage.getItem('currentUser');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const displayName = currentUser?.name || 'Nguyễn Văn B';
    const displayInitial = displayName ? displayName.split(' ').pop()?.charAt(0).toUpperCase() || 'H' : 'H';

    const handleLogout = () => {
      localStorage.removeItem('currentUser');
    };

    const navItems = [
      { name: 'Tổng quan', path: '/app', icon: Home },
      { name: 'Chuyên cần', path: '/app/attendance', icon: BookOpen },
      { name: 'Nề nếp', path: '/app/behavior', icon: BookOpen },
      { name: 'Tài liệu', path: '/app/documents', icon: FileText },
      { name: 'Thông báo', path: '/app/announcements', icon: Bell },
      { name: 'Tin nhắn', path: '/app/messages', icon: MessageCircle },
    ];
  
    return (
      <div className="flex h-screen bg-gray-50">
        <aside className="w-64 bg-white border-r flex flex-col hidden md:flex">
          <div className="h-16 flex items-center px-6 border-b">
            <h1 className="text-xl font-bold text-gray-800">Cổng thông tin</h1>
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
                    isActive ? "bg-orange-50 text-orange-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon size={20} className={isActive ? "text-orange-700" : "text-gray-500"} />
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
  
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-white border-b flex items-center justify-between px-6">
            <div className="md:hidden">
              <span className="font-bold text-lg">Cổng thông tin</span>
            </div>
            <div className="ml-auto flex items-center space-x-4">
               <div className="w-8 h-8 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center font-bold">
                 {displayInitial}
              </div>
              <span className="text-sm text-gray-600">Xin chào, {displayName} (Học sinh)</span>
            </div>
          </header>
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
             <Outlet />
          </main>
        </div>
      </div>
    )
}
