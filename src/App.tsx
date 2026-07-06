/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './components/layout/AdminLayout';
import { AppLayout } from './components/layout/AppLayout';

import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ClassManagement } from './pages/admin/ClassManagement';
import { StudentManagement } from './pages/admin/StudentManagement';
import { ParentManagement } from './pages/admin/ParentManagement';
import { AttendanceManagement } from './pages/admin/AttendanceManagement';
import { BehaviorManagement } from './pages/admin/BehaviorManagement';
import { AnnouncementManagement } from './pages/admin/AnnouncementManagement';
import { DocumentManagement } from './pages/admin/DocumentManagement';
import { MessageManagement } from './pages/admin/MessageManagement';
import { ReportManagement } from './pages/admin/ReportManagement';

import { AppDashboard } from './pages/app/AppDashboard';
import { AttendanceHistory } from './pages/app/AttendanceHistory';
import { BehaviorHistory } from './pages/app/BehaviorHistory';
import { AppAnnouncements } from './pages/app/AppAnnouncements';
import { AppDocuments } from './pages/app/AppDocuments';
import { AppMessages } from './pages/app/AppMessages';

import { Home } from './pages/Home';
import { Login } from './pages/Login';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login/admin" element={<Login role="admin" />} />
        <Route path="/login/app" element={<Login role="app" />} />
        
        {/* Admin Routes (GVCN) */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="classes" element={<ClassManagement />} />
          <Route path="students" element={<StudentManagement />} />
          <Route path="parents" element={<ParentManagement />} />
          <Route path="attendance" element={<AttendanceManagement />} />
          <Route path="behavior" element={<BehaviorManagement />} />
          <Route path="announcements" element={<AnnouncementManagement />} />
          <Route path="documents" element={<DocumentManagement />} />
          <Route path="messages" element={<MessageManagement />} />
          <Route path="reports" element={<ReportManagement />} />
          {/* Add more admin routes here */}
        </Route>

        {/* App Routes (Parents/Students) */}
        <Route path="/app" element={<AppLayout />}>
           <Route index element={<AppDashboard />} />
           <Route path="attendance" element={<AttendanceHistory />} />
           <Route path="behavior" element={<BehaviorHistory />} />
           <Route path="announcements" element={<AppAnnouncements />} />
           <Route path="documents" element={<AppDocuments />} />
           <Route path="messages" element={<AppMessages />} />
           {/* Add more app routes here */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

