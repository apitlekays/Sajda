import React from "react";
import ReactDOM from "react-dom/client";
import { PostHogProvider } from "@posthog/react";
import App from "./App";

const POSTHOG_KEY = "phc_8fg0KsOQwSC7R0bPcIE0geAGi49SXfG6ejU5oVNkXWw";
const POSTHOG_HOST = "https://eu.i.posthog.com";

const posthogOptions = {
  api_host: POSTHOG_HOST,
  persistence: "localStorage" as const,
  autocapture: false,
  capture_pageview: false,
  capture_pageleave: false,
  disable_session_recording: true,
  capture_exceptions: true,
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <PostHogProvider apiKey={POSTHOG_KEY} options={posthogOptions}>
      <App />
    </PostHogProvider>
  </React.StrictMode>
);
