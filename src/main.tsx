import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import "./index.css";
import App from "./App";

RectAreaLightUniformsLib.init();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
