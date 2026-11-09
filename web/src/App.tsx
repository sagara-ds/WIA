import { createBrowserRouter, Navigate } from 'react-router'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Lapor } from './pages/Lapor'
import { Bukti } from './pages/Bukti'
import { Tinjau } from './pages/Tinjau'
import { Terkirim } from './pages/Terkirim'
import { Cek } from './pages/Cek'
import { Tiket } from './pages/Tiket'
import { Balas } from './pages/Balas'
import { BalasTerkirim } from './pages/BalasTerkirim'
import { Transparansi } from './pages/Transparansi'
import { Panduan } from './pages/Panduan'
import { PetugasLogin } from './pages/PetugasLogin'
import { AdminQueue } from './pages/AdminQueue'
import { AdminDetail } from './pages/AdminDetail'
import { AdminVerifikasi } from './pages/AdminVerifikasi'
import { AdminLengkapi } from './pages/AdminLengkapi'
import { AdminTolak } from './pages/AdminTolak'
import { AdminTeruskan } from './pages/AdminTeruskan'
import { AdminTindakan } from './pages/AdminTindakan'
import { AdminSelesai } from './pages/AdminSelesai'
import { AdminAudit } from './pages/AdminAudit'
import { AdminMaster } from './pages/AdminMaster'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'lapor', element: <Lapor /> },
      { path: 'bukti', element: <Bukti /> },
      { path: 'tinjau', element: <Tinjau /> },
      { path: 'terkirim', element: <Terkirim /> },
      { path: 'cek', element: <Cek /> },
      { path: 'tiket', element: <Tiket /> },
      { path: 'tiket/balas', element: <Balas /> },
      { path: 'tiket/balas-terkirim', element: <BalasTerkirim /> },
      { path: 'transparansi', element: <Transparansi /> },
      { path: 'panduan', element: <Panduan /> },
      { path: 'petugas', element: <PetugasLogin /> },
      { path: 'petugas/antrean', element: <AdminQueue /> },
      { path: 'petugas/detail', element: <AdminDetail /> },
      { path: 'petugas/verifikasi', element: <AdminVerifikasi /> },
      { path: 'petugas/lengkapi', element: <AdminLengkapi /> },
      { path: 'petugas/tolak', element: <AdminTolak /> },
      { path: 'petugas/teruskan', element: <AdminTeruskan /> },
      { path: 'petugas/tindakan', element: <AdminTindakan /> },
      { path: 'petugas/selesai', element: <AdminSelesai /> },
      { path: 'petugas/audit', element: <AdminAudit /> },
      { path: 'petugas/master', element: <AdminMaster /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
