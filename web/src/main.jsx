import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Fixtures from "./pages/Fixtures.jsx";
import Squad from "./pages/Squad.jsx";

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />,
      children: [
        { index: true, element: <Dashboard /> },
        { path: "fixtures", element: <Fixtures /> },
        { path: "squad", element: <Squad /> },
      ],
    },
  ],
  { future: { v7_startTransition: true } }
);

createRoot(document.getElementById("root")).render(
  <RouterProvider router={router} future={{ v7_startTransition: true }} />
);
