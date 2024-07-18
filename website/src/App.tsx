import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import { Routes, Route } from "react-router-dom";
import "./App.css";

import { DashboardRoute } from "./routes/player/login/dashboard";
import { Navbar } from "./components/header/navbar";
import { ThemeProvider } from "./components/theme-provider";
import { RootRoute } from "./routes/root";

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/player/login/dashboard" element={<DashboardRoute />} />
      </Routes>
    </ThemeProvider>
  );
}
