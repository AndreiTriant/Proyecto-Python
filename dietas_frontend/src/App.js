import { useState, useEffect } from "react";

const API_URL = "http://127.0.0.1:8080";

function App() {
  const [autor, setAutor] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/autor`)
      .then((res) => res.json())
      .then((data) => setAutor(data.Autor))
      .catch(() => setAutor(null));
  }, []);

  return (
    <div className="App">
      <h1>Hola mundo Soy Calamares2.0</h1>
      {autor && <p>Autor: {autor}</p>}
    </div>
  );
}

export default App;
