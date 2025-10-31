import React, { useState, useEffect } from 'react';
import { Box, Text, Tabs, Card, Grid, Loader, Alert, Group, Progress, Stack, Textarea } from '@mantine/core';
import AppShell from '../components/AppShell';
import VideoRecorder from '../components/VideoRecorder';
import axios from '../lib/axios';

interface VideoInterviewData {
  _id: string;
  videoUrl: string;
  transcript: string;
  duration: number;
  fileSize: number;
  scores: {
    clarity: number;
    relevance: number;
    presentation: number;
    overall: number;
  };
  status: 'processing' | 'completed' | 'failed';
  createdAt: string;
  keywords?: string;
  topics?: string;
}

const VideoInterview: React.FC = () => {
  const [tabValue, setTabValue] = useState('record');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [interviews, setInterviews] = useState<VideoInterviewData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/video-interviews');
      setInterviews(response.data);
    } catch (error) {
      console.error('Error fetching interviews:', error);
      setError('Failed to load your interviews. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordingComplete = async (videoBlob: Blob, duration: number) => {
    try {
      setUploading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('video', videoBlob, 'interview.webm');
      formData.append('duration', duration.toString());
      
      await axios.post('/api/video-interviews/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setSuccess('Video uploaded successfully! It is now being processed.');
      fetchInterviews();
      setTabValue('results'); // Switch to Results tab
    } catch (error) {
      console.error('Error uploading video:', error);
      setError('Failed to upload video. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const renderScoreGauge = (score: number, label: string) => (
    <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box style={{ position: 'relative', display: 'inline-flex' }}>
        <Progress
          value={score}
          size="xl"
          radius="xl"
          color={score > 80 ? 'green' : score > 60 ? 'yellow' : 'red'}
        />
        <Text style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} size="xl">
          {score}
        </Text>
      </Box>
      <Text size="sm" mt="sm">
        {label}
      </Text>
    </Box>
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AppShell>
      <Box p="md" style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Text component="h1" size="xl" fw={700} mb="md">
          Video Self-Introduction
        </Text>
        
        <Tabs value={tabValue} onChange={(value) => setTabValue(value || 'record')} mb="md">
          <Tabs.List>
            <Tabs.Tab value="record">Record Video</Tabs.Tab>
            <Tabs.Tab value="results">Results Dashboard</Tabs.Tab>
          </Tabs.List>
        </Tabs>
        
        {error && (
          <Alert color="red" title="Error" onClose={() => setError(null)} withCloseButton mb="md">
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert color="green" title="Success" onClose={() => setSuccess(null)} withCloseButton mb="md">
            {success}
          </Alert>
        )}
        
        {tabValue === 'record' && (
          <Box>
            <Text component="h2" size="lg" fw={600} mb="sm">
              Record Your Self-Introduction
            </Text>
            <Text mb="md">
              Please record a 2-3 minute video introducing yourself, your skills, and why you're a good fit for the position.
            </Text>
            
            {uploading ? (
              <Stack align="center" p="xl">
                <Loader />
                <Text mt="sm">
                  Uploading your video...
                </Text>
              </Stack>
            ) : (
              <VideoRecorder onRecordingComplete={handleRecordingComplete} maxDuration={180} />
            )}
          </Box>
        )}
        
        {tabValue === 'results' && (
          <Box>
            <Text component="h2" size="lg" fw={600} mb="sm">
              Your Interview Results
            </Text>
            
            {loading ? (
              <Group justify="center" p="xl">
                <Loader />
              </Group>
            ) : interviews.length === 0 ? (
              <Alert color="blue" title="Info">
                You haven't recorded any interviews yet. Go to the "Record Video" tab to get started.
              </Alert>
            ) : (
              <Grid>
                {interviews.map((interview) => (
                  <Grid.Col span={{ base: 12, sm: 12, md: 6 }} key={interview._id}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                      <Stack>
                        <Text component="h3" size="md" fw={600}>
                          Interview from {new Date(interview.createdAt).toLocaleDateString()}
                        </Text>
                        
                        <Box mb="sm">
                          <video 
                            src={`${import.meta.env.VITE_API_BASE_URL}${interview.videoUrl}`}
                            controls
                            style={{ width: '100%', maxHeight: '200px', backgroundColor: 'black' }}
                          />
                        </Box>

                        <Group justify="space-between" mt="xs" mb="xs">
                          <Text size="sm" c="dimmed">Duration: {formatDuration(interview.duration)}</Text>
                          <Text size="sm" c="dimmed">Size: {formatFileSize(interview.fileSize)}</Text>
                        </Group>

                        <Text size="sm" c="dimmed">Status: {interview.status}</Text>

                        {interview.status === 'completed' && (
                          <Stack mt="md">
                            <Text component="h4" size="sm" fw={600}>Scores:</Text>
                            <Group justify="space-around">
                              {renderScoreGauge(interview.scores.clarity, 'Clarity')}
                              {renderScoreGauge(interview.scores.relevance, 'Relevance')}
                              {renderScoreGauge(interview.scores.presentation, 'Presentation')}
                              {renderScoreGauge(interview.scores.overall, 'Overall')}
                            </Group>

                            {interview.transcript && (
                              <Stack mt="md">
                                <Text size="sm" fw={600}>Transcript:</Text>
                                <Textarea
                                  value={interview.transcript}
                                  readOnly
                                  minRows={3}
                                  maxRows={6}
                                />
                              </Stack>
                            )}

                            {interview.keywords && (
                              <Stack mt="md">
                                <Text size="sm" fw={600}>Keywords:</Text>
                                <Textarea
                                  value={interview.keywords}
                                  readOnly
                                  minRows={2}
                                  maxRows={4}
                                />
                              </Stack>
                            )}

                            {interview.topics && (
                              <Stack mt="md">
                                <Text size="sm" fw={600}>Topics:</Text>
                                <Textarea
                                  value={interview.topics}
                                  readOnly
                                  minRows={2}
                                  maxRows={4}
                                />
                              </Stack>
                            )}
                          </Stack>
                        )}
                      </Stack>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>
            )}
          </Box>
        )}
      </Box>
    </AppShell>
  );
};

export default VideoInterview;