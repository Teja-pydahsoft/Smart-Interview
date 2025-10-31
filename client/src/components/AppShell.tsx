import { AppShell as MantineShell, AppShellNavbar, AppShellHeader, Group, Title, NavLink, Avatar } from '@mantine/core';
import type { PropsWithChildren } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, User2, History, LogOut, Shield } from 'lucide-react';

export default function AppShell({ children }: PropsWithChildren) {
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
			navbar={{ width: 260, breakpoint: 'sm', collapsed: { mobile: true, desktop: false } }}
			header={{ height: 56 }}
			className="responsive-container"
		>
			<AppShellHeader>
				<Group h="100%" px="md" justify="space-between">
					<Group>
						<Title order={4}>Interview Portal</Title>
					</Group>
					<Group>
						<Avatar size="sm" radius="xl" color="blue">S</Avatar>
					</Group>
				</Group>
			</AppShellHeader>
			<AppShellNavbar p="sm">
				<NavLink active={location.pathname === '/'} label="Dashboard" leftSection={<LayoutDashboard size={16} />} onClick={() => go('/')} />
				<NavLink active={location.pathname === '/profile'} label="Profile" leftSection={<User2 size={16} />} onClick={() => go('/profile')} />
				<NavLink active={location.pathname === '/history'} label="History" leftSection={<History size={16} />} onClick={() => go('/history')} />
				<NavLink active={location.pathname === '/video-interview'} label="Video Interview" leftSection={<User2 size={16} />} onClick={() => go('/video-interview')} />
				{localStorage.getItem('role') === 'admin' && (
					<NavLink active={location.pathname === '/admin'} label="Admin" leftSection={<Shield size={16} />} onClick={() => go('/admin')} />
				)}
				<NavLink label="Logout" leftSection={<LogOut size={16} />} onClick={logout} />
			</AppShellNavbar>
			{children}
		</MantineShell>
	);
}
