import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Home from "@/app/page";
import Privacidade from "@/app/privacidade/page";

// Prévia em arquivo único: "#privacidade" mostra a política; o resto é a home.
function App() {
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => {
    const on = () => {
      const prev = hash;
      setHash(location.hash);
      if ((prev === "#privacidade") !== (location.hash === "#privacidade")) window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, [hash]);
  return hash === "#privacidade" ? <Privacidade /> : <Home />;
}

document.documentElement.classList.add("js");
createRoot(document.getElementById("mio-root")!).render(<App />);
