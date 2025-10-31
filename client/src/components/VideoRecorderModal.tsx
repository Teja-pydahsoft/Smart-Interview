import { Modal, Box, Text, Loader, Stack } from '@mantine/core';
import { useState } from 'react';
import VideoRecorder from './VideoRecorder';
import axios from '../lib/axios';

interface VideoRecorderModalProps {
  opened: boolean;
  onClose: () => void;
  topic: string;
}

export default function VideoRecorderModal({ opened, onClose, topic }: VideoRecorderModalProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRecordingComplete = async (videoBlob: Blob, duration: number) => {
    try {
      setUploading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('video', videoBlob, 'interview.webm');
      formData.append('duration', duration.toString());
      formData.append('topics', topic);
      
      await axios.post('/api/video-interviews/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setSuccess('Video uploaded successfully! It is now being processed.');
      onClose();
    } catch (error) {
      console.error('Error uploading video:', error);
      setError('Failed to upload video. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={`Interview: ${topic}`} size="xl">
      <Box>
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
        {error && <Text c="red">{error}</Text>}
        {success && <Text c="green">{success}</Text>}
      </Box>
    </Modal>
  );
}