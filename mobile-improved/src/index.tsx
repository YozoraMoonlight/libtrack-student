import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { AppErrorBoundary, installGlobalErrorHandlers } from "./components/AppErrorBoundary";
import "./index.css";

// Before anything renders. A rejected promise from the data poll or the session
// bootstrap produces no React error and no visible symptom, so these have to be
// listening first.
installGlobalErrorHandlers();

const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>,
  );
}