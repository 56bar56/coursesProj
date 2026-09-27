import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from './components/Layout';
import { HomePage } from './routes/HomePage';
import { DashboardPage } from './routes/DashboardPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { CourseCataloguePage } from './routes/CourseCataloguePage';
import { CourseDetailPage } from './routes/CourseDetailPage';
import { MyCoursesPage } from './routes/MyCoursesPage';
import { LessonPlayerPage } from './routes/LessonPlayerPage';
import { FakeCheckoutPage } from './routes/FakeCheckoutPage';
import { OrderHistoryPage } from './routes/OrderHistoryPage';
import { MentorListPage } from './routes/MentorListPage';
import { MentorAvailabilityPage } from './routes/MentorAvailabilityPage';
import { BookingHistoryPage } from './routes/BookingHistoryPage';
import { StubCallPage } from './routes/StubCallPage';
import { InstructorDashboardPage } from './routes/InstructorDashboardPage';
import { CourseEditorPage } from './routes/CourseEditorPage';
import { AdminCourseQueuePage } from './routes/AdminCourseQueuePage';
import { AdminUsersPage } from './routes/AdminUsersPage';
import { AdminMetricsPage } from './routes/AdminMetricsPage';
import { RTL_LOCALES } from './i18n/i18n';

export function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const applyDirection = (lng: string) => {
      document.documentElement.lang = lng;
      document.documentElement.dir = RTL_LOCALES.includes(lng) ? 'rtl' : 'ltr';
    };
    applyDirection(i18n.resolvedLanguage ?? 'en');
    i18n.on('languageChanged', applyDirection);
    return () => {
      i18n.off('languageChanged', applyDirection);
    };
  }, [i18n]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="courses" element={<CourseCataloguePage />} />
          <Route path="courses/:slug" element={<CourseDetailPage />} />
          <Route path="mentors" element={<MentorListPage />} />
          <Route path="mentors/:mentorId" element={<MentorAvailabilityPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="my-courses" element={<MyCoursesPage />} />
            <Route path="courses/:slug/lessons/:lessonId" element={<LessonPlayerPage />} />
            <Route path="checkout/fake/:orderId" element={<FakeCheckoutPage />} />
            <Route path="orders" element={<OrderHistoryPage />} />
            <Route path="bookings" element={<BookingHistoryPage />} />
            <Route path="call/stub/:bookingId" element={<StubCallPage />} />
          </Route>
          <Route element={<ProtectedRoute role="INSTRUCTOR" />}>
            <Route path="instructor/courses" element={<InstructorDashboardPage />} />
            <Route path="instructor/courses/:id" element={<CourseEditorPage />} />
          </Route>
          <Route element={<ProtectedRoute role="ADMIN" />}>
            <Route path="admin/courses" element={<AdminCourseQueuePage />} />
            <Route path="admin/users" element={<AdminUsersPage />} />
            <Route path="admin/metrics" element={<AdminMetricsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
