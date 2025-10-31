import { useEffect, useState } from 'react';
import axios from '../lib/axios';
import { ActionIcon, Avatar, Badge, Button, Card, Group, Loader, Stack, Table, Text, Title, TextInput, ScrollArea } from '@mantine/core';
import { Trash2, Users, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

type AdminUser = {
  id: string;
  email: string;
  role: string;
  fullName: string;
  onboardingCompleted: boolean;
  createdAt: string;
  performanceScore: number;
  academic?: { course?: string; branch?: string; institution?: string; graduationYear?: number };
  isTech?: boolean | null;
  interestedDomains?: string[];
  resumeUrl?: string;
  certifications?: string[];
  internships?: string[];
  tags?: string[];
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [q, setQ] = useState('');

  async function load() {
    setLoading(true);
    const res = await axios.get('/api/admin/users', { params: q ? { q } : undefined });
    setUsers(res.data.users);
    setLoading(false);
  }

  async function deleteUser(id: string) {
    setDeletingId(id);
    try {
      await axios.delete(`/api/admin/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Stack p="md" gap="md">
      <Group align="center" justify="space-between">
        <Group>
          <Users size={22} />
          <Title order={2}>Admin Dashboard</Title>
          <Badge color="blue" leftSection={<Sparkles size={12} />}>Live Overview</Badge>
        </Group>
        <Group>
          <TextInput value={q} onChange={(e) => setQ(e.currentTarget.value)} placeholder="Search name, email, tags..." w={280} />
          <Button onClick={load} variant="light">Refresh</Button>
        </Group>
      </Group>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card withBorder radius="md" p="md" style={{ position: 'relative', overflow: 'hidden' }}>
          {/* Animated SVG background */}
          <svg style={{ position: 'absolute', top: -40, right: -40, opacity: 0.15 }} width="220" height="220" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#70a3ff" />
                <stop offset="100%" stopColor="#0b3ca0" />
              </linearGradient>
            </defs>
            <motion.circle cx="100" cy="100" r="80" fill="url(#grad)" animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 6 }} />
          </svg>

          {loading ? (
            <Group justify="center" py="lg"><Loader /></Group>
          ) : (
            <ScrollArea>
              <Table striped withRowBorders highlightOnHover miw={1000}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>User</Table.Th>
                    <Table.Th>Role</Table.Th>
                    <Table.Th>Onboarding</Table.Th>
                    <Table.Th>Course</Table.Th>
                    <Table.Th>Branch</Table.Th>
                    <Table.Th>Institute</Table.Th>
                    <Table.Th>Grad</Table.Th>
                    <Table.Th>Domains</Table.Th>
                    <Table.Th>Tags</Table.Th>
                    <Table.Th>Perf</Table.Th>
                    <Table.Th>Joined</Table.Th>
                    <Table.Th></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {users.map((u) => (
                    <Table.Tr key={u.id}>
                      <Table.Td>
                        <Group>
                          <Avatar radius="xl" color="blue">{(u.fullName || u.email)[0]?.toUpperCase()}</Avatar>
                          <Stack gap={0}>
                            <Text fw={600}>{u.fullName || 'Unnamed'}</Text>
                            <Text size="sm" c="dimmed">{u.email}</Text>
                          </Stack>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={u.role === 'admin' ? 'red' : 'gray'}>{u.role}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={u.onboardingCompleted ? 'green' : 'yellow'}>{u.onboardingCompleted ? 'Completed' : 'Pending'}</Badge>
                      </Table.Td>
                      <Table.Td>{u.academic?.course || '-'}</Table.Td>
                      <Table.Td>{u.academic?.branch || '-'}</Table.Td>
                      <Table.Td>{u.academic?.institution || '-'}</Table.Td>
                      <Table.Td>{u.academic?.graduationYear || '-'}</Table.Td>
                      <Table.Td>
                        {(u.interestedDomains || []).slice(0,3).map((d) => (
                          <Badge key={d} mr={4} variant="light">{d}</Badge>
                        ))}
                      </Table.Td>
                      <Table.Td>
                        {(u.tags || []).slice(0,3).map((t) => (
                          <Badge key={t} mr={4} color="blue" variant="light">{t}</Badge>
                        ))}
                      </Table.Td>
                      <Table.Td>
                        <Badge color={u.performanceScore > 2 ? 'green' : u.performanceScore > 0 ? 'yellow' : 'gray'}>
                          {u.performanceScore}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{new Date(u.createdAt).toLocaleDateString()}</Text>
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon variant="light" color="red" onClick={() => deleteUser(u.id)} disabled={deletingId === u.id}>
                          {deletingId === u.id ? <Loader size="sm" /> : <Trash2 size={16} />}
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  {users.length === 0 && (
                    <Table.Tr>
                      <Table.Td colSpan={6}><Text c="dimmed">No users yet.</Text></Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Card>
      </motion.div>
    </Stack>
  );
}


