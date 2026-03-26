import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
}

export default function PageHeader({ title }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background px-4 py-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate('/')}
        aria-label="Volver al inicio"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
    </header>
  );
}
