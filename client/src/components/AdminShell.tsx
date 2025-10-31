import { AppShell as MantineShell, AppShellNavbar, AppShellHeader, Group, Title, NavLink, Avatar } from '@mantine/core';
import type { PropsWithChildren } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Shield, LayoutDashboard, LogOut } from 'lucide-react';

export default function AdminShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const navigate = useNavigate();

  function go(path: string) {
    navigate(path);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  }

  return (
    <MantineShell
      navbar={{ width: 260, breakpoint: 'sm' }}
      header={{ height: 56 }}
    >
      <AppShellHeader>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Title order={4}>Admin Console</Title>
            <Shield size={16} />
          </Group>
          <Group>
            <Avatar size="sm" radius="xl" color="red">A</Avatar>
          </Group>
        </Group>
      </AppShellHeader>
      <AppShellNavbar p="sm">
        <NavLink active={location.pathname === '/admin'} label="Dashboard" leftSection={<LayoutDashboard size={16} />} onClick={() => go('/admin')} />
        <NavLink label="Logout" leftSection={<LogOut size={16} />} onClick={logout} />
      </AppShellNavbar>
      {children}
    </MantineShell>
  );
}


