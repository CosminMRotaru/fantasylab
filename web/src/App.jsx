import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";

export default function App() {
  return (
    <>
      <Navbar />
      <main className="max-w-[1280px] mx-auto px-6 py-6">
        <Outlet />
      </main>
    </>
  );
}
