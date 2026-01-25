import { useEffect } from "react";
import "./App.css";
import { Dashboard } from "./components/Dashboard";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useTrackerStore } from "./store/TrackerStore";
import { useSettingsStore } from "./store/SettingsStore";
import { initAnalytics, trackAppOpen, flushAnalytics } from "./utils/Analytics";

function App() {
  const { loadRecords } = useTrackerStore();
  const { loadSettings } = useSettingsStore();

  useEffect(() => {
    // Load persisted data on mount
    loadRecords();
    loadSettings().then(() => {
      // Initialize analytics after settings are loaded (to get telemetry preference)
      const { telemetryEnabled } = useSettingsStore.getState();
      initAnalytics(telemetryEnabled).then(() => {
        trackAppOpen();
      });
    });

    // Disable Right Click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", handleContextMenu);

    // Flush analytics on app close
    const handleBeforeUnload = () => {
      flushAnalytics();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      flushAnalytics();
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen bg-transparent overflow-hidden select-none font-sans text-foreground">
        {/* Main Application Container */}
        <div className="h-full w-full flex flex-col bg-background/95 backdrop-blur-3xl shadow-2xl border border-white/10 relative overflow-hidden">
          <Dashboard />
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
