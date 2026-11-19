import { Route, Routes } from 'react-router';
import { GuestOnly, RequireAuth } from './auth/RouteGuards';
import { AuthLayout } from './features/auth/AuthLayout';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { CalendarPage } from './features/calendar/CalendarPage';
import { HistoryPage } from './features/history/HistoryPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { SubscriptionsPage } from './features/subscriptions/SubscriptionsPage';
import { AppShell } from './layout/AppShell';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        {/* Log in and Create account only make sense when logged out. */}
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        {/* Links from emails work whether or not someone is logged in on this browser. */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<CalendarPage />} />
          <Route path="/subscriptions" element={<SubscriptionsPage />} />
          {/* "View subscription" in reminder emails: the list with that subscription's drawer open. */}
          <Route path="/subscriptions/:id" element={<SubscriptionsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
