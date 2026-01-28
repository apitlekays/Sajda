import { useEffect } from "react";
import "./App.css";
import { Dashboard } from "./components/Dashboard";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useTrackerStore } from "./store/TrackerStore";
import { useSettingsStore } from "./store/SettingsStore";
import { useBackgroundInit } from "./hooks/useBackgroundInit";
import { flushAnalytics, trackError } from "./utils/Analytics";

function App() {
  const { loadRecords } = useTrackerStore();
  const { loadSettings } = useSettingsStore();

  // Phase 1: Critical path - load persisted data (fast, ~100ms)
  // Fire-and-forget: Zustand updates state when complete, triggering re-renders
  useEffect(() => {
    loadRecords();   // Fire, don't await
    loadSettings();  // Fire, don't await
  }, [loadRecords, loadSettings]);

  // Phase 2: Background initialization (fire-and-forget)
  // Analytics, autostart, location sync, first-run setup
  useBackgroundInit();

  // Event listeners for context menu, error handling, analytics cleanup
  useEffect(() => {
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

    // Global error handlers for uncaught errors
    const handleError = (event: ErrorEvent) => {
      trackError('uncaught_error', event.message, event.error);
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      trackError('unhandled_rejection', error.message, error);
    };
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
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
