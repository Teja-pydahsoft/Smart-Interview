import { useEffect, useState } from 'react';
import { Card, Stack, Title, Text, Group, Badge, Divider, ScrollArea } from '@mantine/core';
import axios from '../lib/axios';

type User = {
  email: string;
  profile?: {
    fullName?: string;
    academic?: { course?: string; branch?: string; institution?: string; graduationYear?: number };
    isTech?: boolean | null;
    interestedDomains?: string[];
    certifications?: string[];
    internships?: string[];
    tags?: string[];
    resumeUrl?: string;
    resumeText?: string;
  }
};

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      const res = await axios.get('/api/profile/me');
      setUser(res.data.user);
    })();
  }, []);

  const p = user?.profile;

  return (
    <Stack>
      <Title order={2}>Profile</Title>

      <Card withBorder>
        <Stack>
          <Group>
            <Title order={4}>{p?.fullName || 'Unnamed Student'}</Title>
            {p?.isTech != null && <Badge variant="light">{p.isTech ? 'Tech' : 'Non Tech'}</Badge>}
          </Group>
          <Text c="dimmed">{user?.email}</Text>
          {p?.academic && (
            <Text>
              {(p.academic.course || 'Course N/A')} · {(p.academic.branch || 'Branch N/A')} · {(p.academic.institution || 'Institution N/A')} · {(p.academic.graduationYear || 'Year N/A')}
            </Text>
          )}
          {!!(p?.interestedDomains && p.interestedDomains.length) && (
            <Group>
              {p.interestedDomains.map((d) => <Badge key={d}>{d}</Badge>)}
            </Group>
          )}
          <Group>
            {(p?.certifications || []).map((c, i) => <Badge key={`cert-${i}`} color="green" variant="light">{c}</Badge>)}
            {(p?.internships || []).map((c, i) => <Badge key={`int-${i}`} color="yellow" variant="light">{c}</Badge>)}
          </Group>
        </Stack>
      </Card>

      <Card withBorder>
        <Stack>
          <Title order={4}>Resume</Title>
          {p?.resumeUrl && (
            <Text component="a" href={p.resumeUrl} target="_blank" rel="noreferrer">View uploaded file</Text>
          )}
          <Divider my="sm" />
          <Title order={5}>Extracted text</Title>
          <ScrollArea h={240} type="auto">
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{p?.resumeText || 'No text extracted.'}</Text>
          </ScrollArea>
        </Stack>
      </Card>

      <Card withBorder>
        <Stack>
          <Title order={4}>Tags</Title>
          <Group>
            {(p?.tags || []).map((t) => <Badge key={t} variant="dot">{t}</Badge>)}
            {!(p?.tags && p.tags.length) && <Text c="dimmed">No tags yet.</Text>}
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}


