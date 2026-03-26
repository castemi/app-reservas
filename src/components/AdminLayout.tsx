import { useNavigate, useLocation } from 'react-router-dom';
import { CalendarDays, Clock, Users, Home, Mail, BarChart3, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

const tabs = [
  { icon: CalendarDays, label: 'Agenda', path: '/admin/agenda' },
  { icon: Clock, label: 'Horarios', path: '/admin/horarios' },
  { icon: Users, label: 'Usuarios', path: '/admin/usuarios' },
  { icon: Mail, label: 'Email', path: '/admin/marketing' },
  { icon: BarChart3, label: 'Analíticas', path: '/admin/analiticas' },
  { icon: CreditCard, label: 'Pagos', path: '/admin/facturacion' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold text-foreground">Panel Admin</h1>
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <Home className="mr-1 h-4 w-4" /> Inicio
        </Button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-card">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
                active ? 'text-accent' : 'text-muted-foreground'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
