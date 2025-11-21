import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './components/logInPage/loginPage';
import Register from './components/registerForm';
import MainPage from './components/mainPage/mainPage';
import MapPicker from './components/MapPage/MapPage';

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path='/login' element={<Login />} />
          <Route path='/register' element={<Register />} />
          <Route path='/main' element={<MainPage />} />

          {/* ВАЖНО: передаем onSelect */}
          <Route 
            path='/map' 
            element={
              <MapPicker 
                onSelect={(coords) => {
                  console.log("Выбрано:", coords.lat, coords.lng);
                }} 
              />
            } 
          />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App;
