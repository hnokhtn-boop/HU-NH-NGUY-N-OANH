import React from 'react';
import { Link } from 'react-router-dom';
import { UserCog, Users } from 'lucide-react';

export const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex flex-col items-center justify-center p-6 text-white font-sans">
      <div className="text-center mb-16 space-y-4">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight drop-shadow-md">
          Quản Lý Lớp Chủ Nhiệm
        </h1>
        <p className="text-lg md:text-xl text-blue-100 font-medium opacity-90 drop-shadow">
          Cổng thông tin kết nối Nhà trường & Gia đình
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full px-4">
        <Link 
          to="/login/admin" 
          className="group bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-300 rounded-3xl p-10 flex flex-col items-center text-center shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.2)] hover:-translate-y-1"
        >
          <div className="bg-white/20 p-5 rounded-full mb-6 group-hover:bg-white/30 transition-colors duration-300 shadow-inner">
            <UserCog size={56} className="text-white drop-shadow-sm" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold mb-4 drop-shadow-sm">Giáo Viên</h2>
          <p className="text-blue-50 leading-relaxed font-medium">
            Quản lý học sinh, điểm danh, thông báo và báo cáo.
          </p>
        </Link>

        <Link 
          to="/login/app" 
          className="group bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-300 rounded-3xl p-10 flex flex-col items-center text-center shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.2)] hover:-translate-y-1"
        >
          <div className="bg-white/20 p-5 rounded-full mb-6 group-hover:bg-white/30 transition-colors duration-300 shadow-inner">
            <Users size={56} className="text-white drop-shadow-sm" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold mb-4 drop-shadow-sm">Phụ Huynh / Học Sinh</h2>
          <p className="text-blue-50 leading-relaxed font-medium">
            Xem thông báo, bài tập về nhà và trao đổi với giáo viên.
          </p>
        </Link>
      </div>
    </div>
  );
};
