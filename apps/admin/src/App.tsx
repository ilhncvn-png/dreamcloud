import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { getStoredAuth, isAdminRole, isTokenExpired, clearStoredAuth } from './store/auth.store';
import Layout from './components/Layout';
import Login from './pages/Login';

// Existing pages
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Dreams from './pages/Dreams';
import DreamDetail from './pages/DreamDetail';
import DreamAnalytics from './pages/DreamAnalytics';
import Reports from './pages/Reports';
import LiveActivity from './pages/LiveActivity';
import Settings from './pages/Settings';
import AdminLogs from './pages/AdminLogs';

// Phase 6 — Command Center pages
import CommandCenter from './pages/CommandCenter';
import DreamIntelligence from './pages/DreamIntelligence';
import Moderation from './pages/Moderation';
import BannedUsers from './pages/BannedUsers';
import FeaturedContent from './pages/FeaturedContent';
import Analytics from './pages/Analytics';
import UserGrowth from './pages/UserGrowth';
import DreamTrends from './pages/DreamTrends';
import Engagement from './pages/Engagement';
import Advertising from './pages/Advertising';
import Campaigns from './pages/Campaigns';
import Segments from './pages/Segments';

// Phase 8 — AI Operators & Intelligence pages
import OperatorsCenter from './pages/OperatorsCenter';
import DreamWeather from './pages/DreamWeather';
import GlobalEmotion from './pages/GlobalEmotion';
import PredictionCenter from './pages/PredictionCenter';
import TrendRadar from './pages/TrendRadar';
import AIRecommendations from './pages/AIRecommendations';

// Phase 9 — Dream Intelligence Center pages
import ConsciousnessMap from './pages/ConsciousnessMap';
import EmotionMap from './pages/EmotionMap';
import SymbolAnalysis from './pages/SymbolAnalysis';
import ArchetypeAnalysis from './pages/ArchetypeAnalysis';
import DreamGenome from './pages/DreamGenome';
import GlobalDreamMap from './pages/GlobalDreamMap';
import CollectiveConsciousness from './pages/CollectiveConsciousness';

// Dream Connection Engine
import DreamConnections  from './pages/DreamConnections';
import ResonanceEvents   from './pages/ResonanceEvents';
import SeenInDreams      from './pages/SeenInDreams';
import CollectiveSignals from './pages/CollectiveSignals';

// Phase 13 — World Model
import WorldWeather       from './pages/WorldWeather';
import SymbolEconomy      from './pages/SymbolEconomy';
import ArchetypeDynamics  from './pages/ArchetypeDynamics';
import ConsciousnessIndex from './pages/ConsciousnessIndex';
import DreamSeasons       from './pages/DreamSeasons';

// Phase 12 — Dream Operating System
import AutomationCenter from './pages/AutomationCenter';
import ScenarioBuilder  from './pages/ScenarioBuilder';
import AlertCenter      from './pages/AlertCenter';
import AIObserver       from './pages/AIObserver';
import Scheduler        from './pages/Scheduler';

// Phase 11 — Dream Event Engine
import EventStream        from './pages/EventStream';
import UserTimeline       from './pages/UserTimeline';
import DreamGraphExplorer from './pages/DreamGraphExplorer';
import DreamAssistant     from './pages/DreamAssistant';

// Phase 10 — Full Control Layer
import SystemControl    from './pages/SystemControl';
import AppControlCenter from './pages/AppControlCenter';
import FeatureFlags     from './pages/FeatureFlags';
import NotificationControl from './pages/NotificationControl';
import AutomationRules  from './pages/AutomationRules';

// Phase 7 — Operating System pages
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import CommunityHealth from './pages/CommunityHealth';
import ModerationWarRoom from './pages/ModerationWarRoom';
import SupportCenter from './pages/SupportCenter';
import EmployeeManagement from './pages/EmployeeManagement';
import RolePermissions from './pages/RolePermissions';
import UserRiskCenter from './pages/UserRiskCenter';
import RevenueCenter from './pages/RevenueCenter';
import AICenter from './pages/AICenter';

function RequireAdmin() {
  const location = useLocation();
  const auth = getStoredAuth();

  const invalid = !auth || isTokenExpired(auth.accessToken) || !isAdminRole(auth.role);
  if (invalid) {
    if (auth) clearStoredAuth();
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAdmin />}>
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* ── Command section ──────────────────────────────────────────── */}
          <Route path="/dashboard"          element={<Dashboard />} />
          <Route path="/executive"          element={<ExecutiveDashboard />} />
          <Route path="/command-center"     element={<CommandCenter />} />
          <Route path="/dream-intelligence" element={<DreamIntelligence />} />

          {/* ── Operations section ───────────────────────────────────────── */}
          <Route path="/community-health"    element={<CommunityHealth />} />
          <Route path="/moderation-war-room" element={<ModerationWarRoom />} />
          <Route path="/support-center"      element={<SupportCenter />} />
          <Route path="/user-risk"           element={<UserRiskCenter />} />

          {/* ── Users section ────────────────────────────────────────────── */}
          <Route path="/users"        element={<Users />} />
          <Route path="/users/:id"    element={<UserDetail />} />
          <Route path="/banned-users" element={<BannedUsers />} />

          {/* ── Content section ──────────────────────────────────────────── */}
          <Route path="/dreams"            element={<Dreams />} />
          <Route path="/dreams/analytics"  element={<DreamAnalytics />} />
          <Route path="/dreams/:id"        element={<DreamDetail />} />
          <Route path="/featured"          element={<FeaturedContent />} />
          <Route path="/reports"           element={<Reports />} />
          <Route path="/moderation"        element={<Moderation />} />

          {/* ── Analytics section ────────────────────────────────────────── */}
          <Route path="/analytics"    element={<Analytics />} />
          <Route path="/user-growth"  element={<UserGrowth />} />
          <Route path="/dream-trends" element={<DreamTrends />} />
          <Route path="/engagement"   element={<Engagement />} />

          {/* ── Employee section ─────────────────────────────────────────── */}
          <Route path="/employees"        element={<EmployeeManagement />} />
          <Route path="/role-permissions" element={<RolePermissions />} />

          {/* ── Revenue & Growth section ──────────────────────────────────── */}
          <Route path="/revenue"     element={<RevenueCenter />} />
          <Route path="/advertising" element={<Advertising />} />
          <Route path="/campaigns"   element={<Campaigns />} />
          <Route path="/segments"    element={<Segments />} />

          {/* ── Operators section ────────────────────────────────────────── */}
          <Route path="/operators"          element={<OperatorsCenter />} />
          <Route path="/dream-weather"      element={<DreamWeather />} />
          <Route path="/global-emotion"     element={<GlobalEmotion />} />
          <Route path="/predictions"        element={<PredictionCenter />} />
          <Route path="/trend-radar"        element={<TrendRadar />} />
          <Route path="/ai-recommendations" element={<AIRecommendations />} />

          {/* ── Dream Connection Engine ──────────────────────────────────── */}
          <Route path="/dream-connections"  element={<DreamConnections />} />
          <Route path="/resonance-events"   element={<ResonanceEvents />} />
          <Route path="/seen-in-dreams"     element={<SeenInDreams />} />
          <Route path="/collective-signals" element={<CollectiveSignals />} />

          {/* ── Dream Event Engine ───────────────────────────────────────── */}
          <Route path="/event-stream"         element={<EventStream />} />
          <Route path="/user-timeline"        element={<UserTimeline />} />
          <Route path="/dream-graph-explorer" element={<DreamGraphExplorer />} />
          <Route path="/dream-assistant"      element={<DreamAssistant />} />

          {/* ── World Model ──────────────────────────────────────────────── */}
          <Route path="/world-weather"       element={<WorldWeather />} />
          <Route path="/symbol-economy"      element={<SymbolEconomy />} />
          <Route path="/archetype-dynamics"  element={<ArchetypeDynamics />} />
          <Route path="/consciousness-index" element={<ConsciousnessIndex />} />
          <Route path="/dream-seasons"       element={<DreamSeasons />} />

          {/* ── Dream Operating System ───────────────────────────────────── */}
          <Route path="/automation-center" element={<AutomationCenter />} />
          <Route path="/scenario-builder"  element={<ScenarioBuilder />} />
          <Route path="/alert-center"      element={<AlertCenter />} />
          <Route path="/ai-observer"       element={<AIObserver />} />
          <Route path="/scheduler"         element={<Scheduler />} />

          {/* ── Dream Intelligence section ───────────────────────────────── */}
          <Route path="/consciousness-map"        element={<ConsciousnessMap />} />
          <Route path="/emotion-map"              element={<EmotionMap />} />
          <Route path="/symbol-analysis"          element={<SymbolAnalysis />} />
          <Route path="/archetype-analysis"       element={<ArchetypeAnalysis />} />
          <Route path="/dream-genome"             element={<DreamGenome />} />
          <Route path="/global-dream-map"         element={<GlobalDreamMap />} />
          <Route path="/collective-consciousness" element={<CollectiveConsciousness />} />

          {/* ── AI section ───────────────────────────────────────────────── */}
          <Route path="/ai-center" element={<AICenter />} />

          {/* ── Control section ──────────────────────────────────────────── */}
          <Route path="/system-control"   element={<SystemControl />} />
          <Route path="/app-control"      element={<AppControlCenter />} />
          <Route path="/feature-flags"    element={<FeatureFlags />} />
          <Route path="/notifications"    element={<NotificationControl />} />
          <Route path="/automation-rules" element={<AutomationRules />} />

          {/* ── System section ───────────────────────────────────────────── */}
          <Route path="/live-activity" element={<LiveActivity />} />
          <Route path="/admin-logs"    element={<AdminLogs />} />
          <Route path="/settings"      element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
