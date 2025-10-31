import { useEffect, useState } from 'react';
import { Button, Card, Container, Group, Stack, Text, Textarea, Title, Badge } from '@mantine/core';
import { motion } from 'framer-motion';
import { PlayCircle, RefreshCw } from 'lucide-react';
import axios from '../lib/axios';
import { notifications } from '@mantine/notifications';
import VideoRecorderModal from '../components/VideoRecorderModal';

type Interview = { id: string; title: string; score: number };

interface AttemptedInterview {
  id: string;
  topics: string[];
}

export default function Dashboard() {
  const [intro, setIntro] = useState('');
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [attemptedInterviews, setAttemptedInterviews] = useState<AttemptedInterview[]>([]);
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('');

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        const [interviewsRes, attemptedInterviewsRes] = await Promise.all([
          axios.get('/api/interviews'),
          axios.get('/api/video-interviews'),
        ]);
        setInterviews(interviewsRes.data.interviews);
        setAttemptedInterviews(attemptedInterviewsRes.data);
      } catch (e: any) {
        notifications.show({ color: 'red', message: 'Failed to load interviews' });
      }
    };
    fetchInterviews();
  }, []);

  const handleStartInterview = (topic: string) => {
    setSelectedTopic(topic);
    setModalOpened(true);
  };

  const isAttempted = (interviewTitle: string) => {
    return attemptedInterviews.some((attempted) => attempted.topics.includes(interviewTitle));
  };

  return (
    <Container size="md">
      <Stack>
        <Title order={2}>Dashboard</Title>
        <Card withBorder p="lg">
          <Stack>
            <Text fw={500}>Start with a self introduction</Text>
            <Textarea placeholder="Write your self introduction..." value={intro} onChange={(e) => setIntro(e.currentTarget.value)} minRows={4} />
          </Stack>
        </Card>

        <Title order={3}>Suggested Interviews</Title>
        <Stack>
          {interviews.map((iv, idx) => (
            <motion.div key={iv.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <Card withBorder>
                <Group justify="space-between">
                  <div>
                    <Text fw={600}>{iv.title}</Text>
                    <Badge variant="light" mt={6}>
                      {isAttempted(iv.title) ? 'Completed' : 'Pending'}
                    </Badge>
                  </div>
                  {isAttempted(iv.title) ? (
                    <Button onClick={() => handleStartInterview(iv.title)} leftSection={<RefreshCw size={16} />}>
                      Re-attend
                    </Button>
                  ) : (
                    <Button onClick={() => handleStartInterview(iv.title)} leftSection={<PlayCircle size={16} />}>
                      Start
                    </Button>
                  )}
                </Group>
              </Card>
            </motion.div>
          ))}
          {interviews.length === 0 && <Text c="dimmed">No interviews matched yet. Update your profile or resume.</Text>}
        </Stack>
      </Stack>
      <VideoRecorderModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        topic={selectedTopic}
      />
    </Container>
  );
}


