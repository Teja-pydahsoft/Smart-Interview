import { Card, Stack, Title, Text, Table } from '@mantine/core';
import { useEffect, useState } from 'react';
import axios from '../lib/axios';
import { Link } from 'react-router-dom';

interface Interview {
  id: string;
  userId: string;
  videoUrl: string;
  transcription: string;
  scores: {
    clarity: number;
    conciseness: number;
    confidence: number;
    engagement: number;
  };
  keywords: string[];
  topics: string[];
  createdAt: string;
}

export default function History() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        const response = await axios.get('/api/video-interviews');
        setInterviews(response.data);
      } catch (error) {
        console.error('Error fetching interviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInterviews();
  }, []);

  return (
    <Stack>
      <Title order={2}>Interview History</Title>
      <Card withBorder>
        {loading ? (
          <Text>Loading...</Text>
        ) : interviews.length === 0 ? (
          <Text c="dimmed">No interview attempts found.</Text>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Topics</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {interviews.map((interview) => (
                <tr key={interview.id}>
                  <td>{new Date(interview.createdAt).toLocaleDateString()}</td>
                  <td>{interview.topics.join(', ')}</td>
                  <td>
                    <Link to={`/interview/${interview.id}`}>View Results</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </Stack>
  );
}


