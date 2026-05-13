import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login'
import Admin from './components/Admin'
import AdminStatistics from './components/AdminStatistics'
import AdminUsers from './components/AdminUsers'
import AdminAlbums from './components/AdminAlbums'
import AdminArtists from './components/AdminArtists'
import AdminSongs from './components/AdminSongs'
import Dashboard from './components/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/admin/*" 
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        >
          <Route path="statistics" element={<AdminStatistics />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="albums" element={<AdminAlbums />} />
          <Route path="artists" element={<AdminArtists />} />
          <Route path="songs" element={<AdminSongs />} />
          <Route index element={<Navigate to="statistics" replace />} />
        </Route>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

export default App
