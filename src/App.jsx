import React, { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Eager imports
import Dashboard from './pages/admin/Dashboard';
import EventList from './pages/admin/EventList';
import Reports from './pages/admin/Reports';

import MentorManagement from './pages/admin/MentorManagement';
import SeriesManagement from './pages/admin/SeriesManagement';
import PastSessions from './pages/admin/PastSessions';

// Lazy-loaded pages
const Home = React.lazy(() => import('./pages/Home'));
const EventPage = React.lazy(() => import('./pages/EventPage'));
const SeriesPage = React.lazy(() => import('./pages/SeriesPage'));
const OrderConfirmation = React.lazy(() => import('./pages/OrderConfirmation'));
const ManageOrder = React.lazy(() => import('./pages/ManageOrder'));
const MyTickets = React.lazy(() => import('./pages/MyTickets'));
const WorkspaceProfile = React.lazy(() => import('./pages/WorkspaceProfile'));
const PublicLayout = React.lazy(() => import('./components/PublicLayout'));
const AdminLayout = React.lazy(() => import('./components/admin/AdminLayout'));
const ScannerLayout = React.lazy(() => import('./components/scanner/ScannerLayout'));
const ScannerHome = React.lazy(() => import('./pages/scanner/ScannerHome'));
const ScannerDashboard = React.lazy(() => import('./pages/scanner/ScannerDashboard'));
const QRScanner = React.lazy(() => import('./pages/scanner/QRScanner'));
const ManualCheckinList = React.lazy(() => import('./pages/scanner/ManualCheckinList'));
const BrowseEvents = React.lazy(() => import('./pages/BrowseEvents'));
const Pricing = React.lazy(() => import('./pages/Pricing'));
const EventForm = React.lazy(() => import('./pages/admin/EventForm'));
const AttendeeList = React.lazy(() => import('./pages/admin/AttendeeList'));
const UserManagement = React.lazy(() => import('./pages/admin/UserManagement'));
const EmailTesting = React.lazy(() => import('./pages/admin/EmailTesting'));
const LoadTest = React.lazy(() => import('./pages/admin/LoadTest'));
const RateLimitLogs = React.lazy(() => import('./pages/admin/RateLimitLogs'));
const WorkspaceManagement = React.lazy(() => import('./pages/admin/WorkspaceManagement'));
const EmailManagement = React.lazy(() => import('./pages/admin/EmailManagement'));
const WebhookSettings = React.lazy(() => import('./pages/admin/WebhookSettings'));
const CustomFieldManager = React.lazy(() => import('./pages/admin/CustomFieldManager'));
const IntegrationSettings = React.lazy(() => import('./pages/admin/IntegrationSettings'));
const AccountSettings = React.lazy(() => import('./components/AccountSettings'));

// Platform admin pages
const PlatformLayout = React.lazy(() => import('./components/platform/PlatformLayout'));
const PlatformDashboard = React.lazy(() => import('./pages/platform/PlatformDashboard'));
const PlatformWorkspaces = React.lazy(() => import('./pages/platform/PlatformWorkspaces'));
const PlatformSubscriptions = React.lazy(() => import('./pages/platform/PlatformSubscriptions'));
const PlatformFeatureFlags = React.lazy(() => import('./pages/platform/PlatformFeatureFlags'));
const PlatformSupportTools = React.lazy(() => import('./pages/platform/PlatformSupportTools'));
const PlatformRiskControls = React.lazy(() => import('./pages/platform/PlatformRiskControls'));
const PlatformIntegrationHealth = React.lazy(() => import('./pages/platform/PlatformIntegrationHealth'));
const PlatformAuditLogs = React.lazy(() => import('./pages/platform/PlatformAuditLogs'));


const LazyFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Suspense fallback={<LazyFallback />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<BrowseEvents />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/event/:slug" element={<EventPage />} />
            <Route path="/series/:slug" element={<SeriesPage />} />
            <Route path="/order/:orderNumber" element={<OrderConfirmation />} />
            <Route path="/manage/:orderNumber" element={<ManageOrder />} />
            <Route path="/my-tickets" element={<MyTickets />} />
            <Route path="/org/:slug" element={<WorkspaceProfile />} />
            <Route path="/account" element={<AccountSettings />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="series" element={<SeriesManagement />} />
            <Route path="events" element={<EventList />} />
            <Route path="events/new" element={<EventForm />} />
            <Route path="events/:id/edit" element={<EventForm />} />
            <Route path="events/:id/attendees" element={<AttendeeList />} />
            <Route path="past-sessions" element={<PastSessions />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings/mentors" element={<MentorManagement />} />

            <Route path="settings/users" element={<UserManagement />} />
            <Route path="settings/email-testing" element={<EmailTesting />} />
            <Route path="settings/load-test" element={<LoadTest />} />
            <Route path="settings/rate-limit-logs" element={<RateLimitLogs />} />
            <Route path="settings/workspaces" element={<WorkspaceManagement />} />
            <Route path="settings/integrations" element={<IntegrationSettings />} />
            <Route path="settings/emails" element={<EmailManagement />} />
            <Route path="settings/webhooks" element={<WebhookSettings />} />
            <Route path="settings/custom-fields" element={<CustomFieldManager />} />
          </Route>
          <Route path="/scanner" element={<ScannerLayout />}>
            <Route index element={<ScannerHome />} />
            <Route path=":occurrenceId/dashboard" element={<ScannerDashboard />} />
            <Route path=":occurrenceId/scan" element={<QRScanner />} />
            <Route path=":occurrenceId/list" element={<ManualCheckinList />} />
          </Route>
          <Route path="/platform" element={<PlatformLayout />}>
            <Route index element={<PlatformDashboard />} />
            <Route path="workspaces" element={<PlatformWorkspaces />} />
            <Route path="subscriptions" element={<PlatformSubscriptions />} />
            <Route path="feature-flags" element={<PlatformFeatureFlags />} />
            <Route path="support" element={<PlatformSupportTools />} />
            <Route path="risk" element={<PlatformRiskControls />} />
            <Route path="integrations" element={<PlatformIntegrationHealth />} />
            <Route path="audit" element={<PlatformAuditLogs />} />
          </Route>
          <Route path="*" element={<PageNotFound />} />
        </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App