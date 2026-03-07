import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { API_URL } from "./constantes";
import Registro from "./Registro";
import Login from "./Login";

function Home() {
  return (
    <div className="App">
      <h1>Hola mundo</h1>
      <p><Link to="/registro">Registro</Link> · <Link to="/login">Login</Link></p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
