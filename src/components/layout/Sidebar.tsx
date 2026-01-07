import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  FileText,
  LogOut,
  Menu,
  X,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { useState, memo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/revenues', icon: TrendingUp, label: 'Receitas' },
  { to: '/expenses', icon: TrendingDown, label: 'Despesas' },
  { to: '/cash-flow', icon: ArrowLeftRight, label: 'Fluxo de Caixa' },
  { to: '/reports', icon: FileText, label: 'Relatórios' },
  { to: '/companies', icon: Building2, label: 'Empresas' },
];

const SidebarHeader = memo(() => (
  <div className="p-6 border-b border-sidebar-border">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-sidebar-accent">
        <img
          src="/logo.png"
          alt="Funerária Imbituba"
          className="w-8 h-8 object-contain"
          loading="eager"
          decoding="async"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-bold text-sidebar-foreground truncate">
          Gestão Financeira
        </h1>
        <p className="text-xs text-sidebar-foreground/70 truncate">
          Imbituba & Garopaba
        </p>
      </div>
    </div>
  </div>
));
SidebarHeader.displayName = 'SidebarHeader';

const CompanySelector = memo(() => {
  const { companies, selectedCompany, setSelectedCompany } = useCompany();

  if (companies.length === 0) return null;

  return (
    <div className="px-4 py-3 border-b border-sidebar-border">
      <p className="text-xs text-sidebar-foreground/60 mb-2">Empresa</p>
      <Select
        value={selectedCompany?.id || ''}
        onValueChange={(id) => {
          const company = companies.find((c) => c.id === id);
          if (company) setSelectedCompany(company);
        }}
      >
        <SelectTrigger className="w-full bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              {company.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});
CompanySelector.displayName = 'CompanySelector';

const NavMenu = memo(({ onLinkClick }: { onLinkClick: () => void }) => (
  <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
    {navItems.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={onLinkClick}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
            isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          )
        }
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        <span>{item.label}</span>
      </NavLink>
    ))}
  </nav>
));
NavMenu.displayName = 'NavMenu';

const SidebarFooter = memo(
  ({ user, onSignOut }: { user: any; onSignOut: () => void }) => (
    <div className="p-4 border-t border-sidebar-border">
      <div className="mb-3 px-4">
        <p className="text-xs text-sidebar-foreground/60 truncate">
          Logado como
        </p>
        <p className="text-sm font-medium text-sidebar-foreground truncate">
          {user?.email}
        </p>
      </div>
      <Button
        variant="ghost"
        className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        onClick={onSignOut}
      >
        <LogOut className="w-5 h-5" />
        <span>Sair</span>
      </Button>
    </div>
  )
);
SidebarFooter.displayName = 'SidebarFooter';

export default memo(function Sidebar() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleLinkClick = () => setMobileOpen(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <SidebarHeader />
      <CompanySelector />
      <NavMenu onLinkClick={handleLinkClick} />
      <SidebarFooter user={user} onSignOut={handleSignOut} />
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-primary text-primary-foreground shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar transform transition-transform duration-300',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
});
