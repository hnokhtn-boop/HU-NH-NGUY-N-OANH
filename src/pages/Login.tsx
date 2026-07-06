import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, UserPlus, LogIn } from 'lucide-react';
import { dataProvider } from '../core/provider';
import { Student } from '../core/types';

interface LoginProps {
  role: 'admin' | 'app';
}

export const Login: React.FC<LoginProps> = ({ role }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      if (role === 'admin') {
        const cleanUsername = username.trim();
        if (cleanUsername === 'GVTHCSVT' && password === '123456@') {
          // Giáo viên đăng nhập thành công
          localStorage.setItem('currentUser', JSON.stringify({
            role: 'teacher',
            name: 'Giáo viên Chủ nhiệm (GVTHCSVT)'
          }));
          navigate('/admin');
        } else {
          setError('Tên đăng nhập hoặc mật khẩu giáo viên không chính xác!');
        }
      } else {
        // Đăng nhập học sinh / phụ huynh thực tế
        try {
          const students = await dataProvider.list<Student>('students');
          
          // Hỗ trợ đăng nhập nhanh nếu để trống (demo)
          if (!username.trim() && !password.trim()) {
            const defaultStudent = students.find(s => s.id === 'student-1') || students[0];
            if (defaultStudent) {
              localStorage.setItem('currentUser', JSON.stringify({
                role: 'student',
                studentId: defaultStudent.id,
                name: defaultStudent.name,
                classId: defaultStudent.classId
              }));
              navigate('/app');
              return;
            }
          }

          const matchedStudent = students.find(
            (s) => s.username === username.trim() && s.password === password
          );

          if (matchedStudent) {
            localStorage.setItem('currentUser', JSON.stringify({
              role: 'student',
              studentId: matchedStudent.id,
              name: matchedStudent.name,
              classId: matchedStudent.classId
            }));
            navigate('/app');
          } else {
            setError('Mã học sinh hoặc mật khẩu không chính xác!');
          }
        } catch (err) {
          console.error(err);
          setError('Lỗi kết nối cơ sở dữ liệu xác thực.');
        }
      }
    } else {
      alert('Chức năng đăng ký tự động dành cho phụ huynh đang bảo trì. Vui lòng liên hệ nhà trường để được cấp tài khoản!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex flex-col items-center justify-center p-6 text-gray-800 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {role === 'admin' ? 'Giáo Viên' : 'Phụ Huynh / Học Sinh'}
          </h2>
          <p className="text-gray-500">
            {isLogin ? 'Đăng nhập để tiếp tục' : 'Yêu cầu cấp tài khoản'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-100 rounded-xl p-3 text-sm font-medium mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {role === 'admin' ? 'Tên đăng nhập Giáo viên' : 'Tên đăng nhập (Mã học sinh)'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                placeholder={role === 'admin' ? "Nhập tên đăng nhập" : "Nhập mã học sinh"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mật khẩu
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-400" />
              </div>
              <input
                type="password"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm cursor-pointer shadow-md"
          >
            {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
            <span>{isLogin ? 'Đăng nhập' : 'Yêu cầu'}</span>
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors cursor-pointer"
          >
            {isLogin
              ? 'Chưa có tài khoản? Xem hướng dẫn'
              : 'Đã có tài khoản? Đăng nhập'}
          </button>
        </div>
        
        <div className="mt-4 text-center">
          <button 
             onClick={() => navigate('/')} 
             className="text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            ← Quay lại trang chủ
          </button>
        </div>
      </div>
    </div>
  );
};
