import {BrowserRouter, Routes, Route} from "react-router-dom";
import {Home} from "./pages/home.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Home/>}/>
      </Routes>
    </BrowserRouter>
  );
}
