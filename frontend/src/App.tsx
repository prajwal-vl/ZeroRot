import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, MainNavSection } from './components/Sidebar';
import { LandingPage } from './components/LandingPage';
import { OverviewTab } from './components/OverviewTab';
import { PostHarvestTab } from './components/PostHarvestTab';
import { ColdChainTab } from './components/ColdChainTab';
import { MarketReportsTab } from './components/MarketReportsTab';
import { SettingsTab } from './components/SettingsTab';
import { SimulationLabView } from './components/SimulationLabView';
import { AlertsTab } from './components/AlertsTab';
import { MobilePWAView } from './components/MobilePWAView';
import { AuthModal } from './components/AuthModal';
import { DigitalTwinTab } from './components/DigitalTwinTab';
import { TransportationTab } from './components/TransportationTab';
import { BatchManagementTab } from './components/BatchManagementTab';
import { PredictionsTab } from './components/PredictionsTab';
import { AIRecommendationsTab } from './components/AIRecommendationsTab';
import { PreservationModuleTab } from './components/PreservationModuleTab';
import { ScenarioBuilderTab } from './components/ScenarioBuilderTab';
import { SimulationHistoryTab } from './components/SimulationHistoryTab';
import { PriceIntelligenceView } from './components/PriceIntelligenceView';
import { SimulationState } from './types/simulation';
import { api, User } from './services/api';
import { FlaskConical, ArrowLeft } from 'lucide-react';

export const App: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<MainNavSection>('overview');
  const [simpleMode, setSimpleMode] = useState<boolean>(true);
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null);
  const [mobileToken, setMobileToken] = useState<string | null>(null);
  const [alertsOpen, setAlertsOpen] = useState<boolean>(false);
  const [showLabView, setShowLabView] = useState<boolean>(false);
  const [isLandingPage, setIsLandingPage] = useState<boolean>(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Check URL path for mobile PWA mode: /monitor/:token, /m/:token, or landing page
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/monitor/')) {
      const token = path.replace('/monitor/', '').trim();
      if (token) setMobileToken(token);
    } else if (path.startsWith('/m/')) {
      const token = path.replace('/m/', '').trim();
      if (token) setMobileToken(token);
    } else if (path === '/landing') {
      setIsLandingPage(true);
    }
  }, []);

  // Authentication check on startup
  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await api.getCurrentUser();
        setCurrentUser(user);
      } catch {
        api.logoutUser();
        setCurrentUser(null);
        // If no users exist in system, open auth modal to prompt first administrator registration
        try {
          const authStatus = await api.getAuthStatus();
          if (!authStatus.has_users) {
            setIsAuthOpen(true);
          }
        } catch (e) {
          console.warn('Auth status check error:', e);
        }
      }
    };
    initAuth();
  }, []);

  // Fetch initial state and establish WebSocket connection with polling fallback
  const fetchState = async () => {
    try {
      const state = await api.getSimulationState();
      setSimulationState(state);
    } catch (e) {
      console.warn('Initial state fetch error:', e);
    }
  };

  useEffect(() => {
    fetchState();

    // Setup WebSocket
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/simulation`;

    let isSubscribed = true;

    const connectWs = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[WebSocket] Connected to ZERO ROOT Digital Twin state feed.');
        };

        ws.onmessage = (event) => {
          if (!isSubscribed) return;
          try {
            const data: SimulationState = JSON.parse(event.data);
            setSimulationState(data);
          } catch (err) {
            console.error('Error parsing WS simulation message:', err);
          }
        };

        ws.onclose = () => {
          console.warn('[WebSocket] Closed. Fallback auto-polling active.');
        };

        ws.onerror = () => {
          // Fallback auto-polling will maintain state
        };
      } catch (err) {
        console.warn('WebSocket init exception:', err);
      }
    };

    connectWs();

    // Fallback polling interval every 2.5s for 100% state guarantee
    const pollInterval = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        fetchState();
      }
    }, 2500);

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const handleTogglePlay = async () => {
    if (!simulationState) return;
    const nextState = !simulationState.is_running;
    const res = await api.updateControls({ is_running: nextState });
    setSimulationState(res);
  };

  const handleReset = async () => {
    const res = await api.resetSimulation();
    setSimulationState(res);
  };

  const handleSpeedChange = async (speed: number) => {
    const res = await api.updateControls({ sim_speed: speed });
    setSimulationState(res);
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    await api.acknowledgeAlert(alertId);
    fetchState();
  };

  // If viewing via Mobile PWA token
  if (mobileToken) {
    return (
      <MobilePWAView
        token={mobileToken}
        onBackToDashboard={() => {
          setMobileToken(null);
          window.history.pushState({}, '', '/');
        }}
      />
    );
  }

  // If viewing Landing Page
  if (isLandingPage) {
    return (
      <LandingPage
        onLaunchDashboard={() => {
          setIsLandingPage(false);
          window.history.pushState({}, '', '/');
        }}
        onExploreSimulations={() => {
          setIsLandingPage(false);
          setCurrentSection('post_harvest');
          window.history.pushState({}, '', '/');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-[#1E293B]">
      {/* Top Header Navbar */}
      <Navbar
        simulationState={simulationState}
        simpleMode={simpleMode}
        setSimpleMode={(mode) => {
          setSimpleMode(mode);
          if (mode) setShowLabView(false);
        }}
        onTogglePlay={handleTogglePlay}
        onReset={handleReset}
        onSpeedChange={handleSpeedChange}
        onOpenAlerts={() => {
          setAlertsOpen((prev) => !prev);
          setShowLabView(false);
        }}
        activeTabTitle={currentSection.replace('_', ' ').toUpperCase()}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={() => {
          api.logoutUser();
          setCurrentUser(null);
        }}
      />

      {/* Advanced Lab Sub-Banner when in Advanced Mode */}
      {!simpleMode && (
        <div className="bg-[#1E40AF] border-b border-[#2563EB] px-6 py-2.5 flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-[#93C5FD]" />
            <span className="font-semibold">Advanced Mathematical Simulation Lab Active:</span>
            <span className="text-[#DBEAFE]">Differential equations &amp; stress injectors accessible</span>
          </div>

          <button
            onClick={() => {
              setShowLabView((prev) => !prev);
              setAlertsOpen(false);
            }}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              showLabView
                ? 'bg-white text-[#1E40AF] shadow-sm'
                : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
            }`}
          >
            {showLabView ? 'Return to Section View' : 'Inspect Mathematical Lab'}
          </button>
        </div>
      )}

      {/* Main Workspace: Left Sidebar + Central Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentSection={currentSection}
          onSelectSection={(section) => {
            setCurrentSection(section);
            setAlertsOpen(false);
            setShowLabView(false);
          }}
          unreadAlertCount={simulationState?.unacknowledged_alerts_count ?? 0}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {/* If Alerts overlay active */}
            {alertsOpen ? (
              <div className="space-y-4">
                <button
                  onClick={() => setAlertsOpen(false)}
                  className="text-xs font-semibold text-[#64748B] hover:text-[#1E293B] flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-[#2563EB]" />
                  <span>Return to {currentSection.replace('_', ' ').toUpperCase()}</span>
                </button>
                <AlertsTab
                  alerts={simulationState?.alerts ?? []}
                  onAcknowledge={handleAcknowledgeAlert}
                  onClose={() => setAlertsOpen(false)}
                />
              </div>
            ) : showLabView ? (
              <div className="space-y-4">
                <button
                  onClick={() => setShowLabView(false)}
                  className="text-xs font-semibold text-[#64748B] hover:text-[#1E293B] flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-[#2563EB]" />
                  <span>Return to {currentSection.replace('_', ' ').toUpperCase()}</span>
                </button>
                <SimulationLabView
                  simulationState={simulationState}
                  onRefreshState={fetchState}
                />
              </div>
            ) : (
              /* Main Navigation Sections */
              <>
                {currentSection === 'overview' && (
                  <OverviewTab
                    simulationState={simulationState}
                    simpleMode={simpleMode}
                    onNavigateSection={(section) => {
                      setCurrentSection(section);
                      setAlertsOpen(false);
                    }}
                    onAcknowledgeAlert={handleAcknowledgeAlert}
                  />
                )}

                {(currentSection === 'digital_twin' || currentSection === 'post_harvest') && (
                  <DigitalTwinTab
                    simulationState={simulationState}
                    onRefreshState={fetchState}
                  />
                )}

                {currentSection === 'batch_management' && (
                  <BatchManagementTab
                    onRefreshState={fetchState}
                    onOpenMobileQR={(token) => {
                      setMobileToken(token);
                      window.history.pushState({}, '', `/monitor/${token}`);
                    }}
                  />
                )}

                {(currentSection === 'transportation' || currentSection === 'cold_chain') && (
                  <TransportationTab
                    simulationState={simulationState}
                    onRefreshState={fetchState}
                  />
                )}

                {currentSection === 'predictions' && (
                  <PredictionsTab
                    simulationState={simulationState}
                    onRefreshState={fetchState}
                  />
                )}

                {currentSection === 'ai_recommendations' && (
                  <AIRecommendationsTab
                    simulationState={simulationState}
                    onRefreshState={fetchState}
                  />
                )}

                {(currentSection === 'mandi_prices' || currentSection === 'market_reports') && (
                  <PriceIntelligenceView />
                )}

                {currentSection === 'preservation' && (
                  <PreservationModuleTab
                    simulationState={simulationState}
                    onRefreshState={fetchState}
                  />
                )}

                {currentSection === 'simulation_lab' && (
                  <ScenarioBuilderTab
                    simulationState={simulationState}
                    onRefreshState={fetchState}
                  />
                )}

                {currentSection === 'alerts' && (
                  <AlertsTab
                    alerts={simulationState?.alerts ?? []}
                    onAcknowledge={handleAcknowledgeAlert}
                  />
                )}

                {currentSection === 'history' && (
                  <SimulationHistoryTab
                    simulationState={simulationState}
                    onRefreshState={fetchState}
                  />
                )}

                {currentSection === 'settings' && (
                  <SettingsTab
                    onOpenMobileView={(token) => {
                      setMobileToken(token);
                      window.history.pushState({}, '', `/monitor/${token}`);
                    }}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* User Registration & Login Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthOpen(false);
        }}
      />
    </div>
  );
};
