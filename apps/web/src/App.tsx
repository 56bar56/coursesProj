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
          <Route element={<ProtectedRoute />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="my-courses" element={<MyCoursesPage />} />
            <Route path="courses/:slug/lessons/:lessonId" element={<LessonPlayerPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
