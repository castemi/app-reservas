import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import AdminLayout from "@/components/AdminLayout";
import CookieBanner from "@/components/CookieBanner";
import InstallPrompt from "@/components/InstallPrompt";
import { lazy, Suspense } from "react";

const Auth = lazy(() => import("@/pages/Auth"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Home = lazy(() => import("@/pages/Home"));
const ReservarCita = lazy(() => import("@/pages/ReservarCita"));
const MisCitas = lazy(() => import("@/pages/MisCitas"));
const Empresa = lazy(() => import("@/pages/Empresa"));
const Perfil = lazy(() => import("@/pages/Perfil"));
const Notificaciones = lazy(() => import("@/pages/Notificaciones"));
const Privacidad = lazy(() => import("@/pages/Privacidad"));
const Terminos = lazy(() => import("@/pages/Terminos"));
const AdminIndex = lazy(() => import("@/pages/admin/AdminIndex"));
const AdminAgenda = lazy(() => import("@/pages/admin/AdminAgenda"));
const AdminHorarios = lazy(() => import("@/pages/admin/AdminHorarios"));
const AdminUsuarios = lazy(() => import("@/pages/admin/AdminUsuarios"));
const AdminMarketing = lazy(() => import("@/pages/admin/AdminMarketing"));
const AdminAnaliticas = lazy(() => import("@/pages/admin/AdminAnaliticas"));
const AdminFacturacion = lazy(() => import("@/pages/admin/AdminFacturacion"));
const ConfirmacionReserva = lazy(() => import("@/pages/ConfirmacionReserva"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutos de caché por defecto
      retry: 1,
    },
  },
});

const LoadingFallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/privacidad" element={<Privacidad />} />
              <Route path="/terminos" element={<Terminos />} />
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/reservar" element={<ProtectedRoute><ReservarCita /></ProtectedRoute>} />
              <Route path="/mis-citas" element={<ProtectedRoute><MisCitas /></ProtectedRoute>} />
              <Route path="/empresa" element={<ProtectedRoute><Empresa /></ProtectedRoute>} />
              <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
              <Route path="/notificaciones" element={<ProtectedRoute><Notificaciones /></ProtectedRoute>} />
              <Route path="/admin" element={<AdminRoute><AdminLayout><AdminIndex /></AdminLayout></AdminRoute>} />
              <Route path="/admin/agenda" element={<AdminRoute><AdminLayout><AdminAgenda /></AdminLayout></AdminRoute>} />
              <Route path="/admin/horarios" element={<AdminRoute><AdminLayout><AdminHorarios /></AdminLayout></AdminRoute>} />
              <Route path="/admin/usuarios" element={<AdminRoute><AdminLayout><AdminUsuarios /></AdminLayout></AdminRoute>} />
              <Route path="/admin/marketing" element={<AdminRoute><AdminLayout><AdminMarketing /></AdminLayout></AdminRoute>} />
              <Route path="/admin/analiticas" element={<AdminRoute><AdminLayout><AdminAnaliticas /></AdminLayout></AdminRoute>} />
              <Route path="/admin/facturacion" element={<AdminRoute><AdminLayout><AdminFacturacion /></AdminLayout></AdminRoute>} />
              <Route path="/reservar/confirmacion" element={<ProtectedRoute><ConfirmacionReserva /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <CookieBanner />
          <InstallPrompt />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
