import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { App } from "./App";

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      retry: 1,
    },
  },
});

async function bootstrap() {
  // Start MSW in development mode
  if (import.meta.env.DEV) {
    const { worker } = await import("./mocks/browser");
    await worker.start({ onUnhandledRequest: "bypass" });
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

bootstrap();
