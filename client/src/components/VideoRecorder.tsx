import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Text, Alert, Loader, Grid, Group, Card, Stack, Progress } from '@mantine/core';
import axios from '../lib/axios';

interface VideoRecorderProps {
  onRecordingComplete: (videoBlob: Blob, duration: number) => void;
  maxDuration?: number; // in seconds
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({ 
  onRecordingComplete, 
  maxDuration = 180 // 3 minutes default
}) => {
  const [permission, setPermission] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [systemChecks, setSystemChecks] = useState({
    camera: false,
    microphone: false,
    network: false
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  // Check system requirements
  useEffect(() => {
    const checkRequirements = async () => {
      try {
        // Check network connectivity
        try {
          await axios.get('/api/health');
          setSystemChecks(prev => ({ ...prev, network: true }));
        } catch (error) {
          setSystemChecks(prev => ({ ...prev, network: false }));
          setError('Network connectivity issue detected. Please check your internet connection.');
          return;
        }

        // Request camera and microphone permissions
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        setPermission(true);
        setStream(mediaStream);
        setSystemChecks({
          camera: true,
          microphone: true,
          network: true
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Error accessing media devices:', err);
        setPermission(false);
        
        // Determine which permission failed
        if (err instanceof DOMException) {
          if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            setError('Camera or microphone not found. Please connect these devices and try again.');
            setSystemChecks({ camera: false, microphone: false, network: true });
          } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setError('Permission denied. Please allow access to camera and microphone.');
            // We don't know which one was denied specifically
            setSystemChecks(prev => ({ ...prev, camera: false, microphone: false }));
          } else {
            setError(`Media error: ${err.message}`);
          }
        } else {
          setError('An unknown error occurred while accessing media devices.');
        }
      }
    };

    checkRequirements();

    // Cleanup function
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = () => {
    if (!stream) return;
    
    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setVideoBlob(blob);
      onRecordingComplete(blob, recordingTime);
    };
    
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setRecording(true);
    
    // Start timer
    let seconds = 0;
    timerRef.current = window.setInterval(() => {
      seconds++;
      setRecordingTime(seconds);
      
      if (seconds >= maxDuration) {
        stopRecording();
      }
    }, 1000);
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };
  
  const resetRecording = () => {
    setVideoBlob(null);
    setRecordingTime(0);
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const renderSystemChecks = () => (
    <Card p="md" mb="lg" withBorder>
      <Text fw={600} mb="sm">System Requirements Check</Text>
      <Stack gap="xs">
        <Group justify="space-between">
          <Text>Camera Access:</Text>
          <Text c={systemChecks.camera ? 'green' : 'red'}>
            {systemChecks.camera ? 'Available ✓' : 'Not Available ✗'}
          </Text>
        </Group>
        <Group justify="space-between">
          <Text>Microphone Access:</Text>
          <Text c={systemChecks.microphone ? 'green' : 'red'}>
            {systemChecks.microphone ? 'Available ✓' : 'Not Available ✗'}
          </Text>
        </Group>
        <Group justify="space-between">
          <Text>Network Connectivity:</Text>
          <Text c={systemChecks.network ? 'green' : 'red'}>
            {systemChecks.network ? 'Connected ✓' : 'Disconnected ✗'}
          </Text>
        </Group>
      </Stack>
    </Card>
  );

  return (
    <Box style={{ width: '100%', maxWidth: 600, margin: 'auto', padding: '0 1rem' }}>
      {renderSystemChecks()}
      
      {error && (
        <Alert color="red" title="Error" withCloseButton onClose={() => setError(null)} mb="md">
          {error}
        </Alert>
      )}
      
      <Box style={{ position: 'relative', marginBottom: '1rem' }}>
        <video 
          ref={videoRef} 
          autoPlay 
          muted={!recording} // Only mute during preview
          playsInline
          style={{ 
            width: '100%', 
            borderRadius: '8px',
            display: videoBlob ? 'none' : 'block'
          }}
          className="responsive-video"
        />
        
        {videoBlob && (
          <video 
            src={URL.createObjectURL(videoBlob)} 
            controls
            style={{ width: '100%', borderRadius: '8px' }}
            className="responsive-video"
          />
        )}
        
        {recording && (
          <Box 
            style={{ 
              position: 'absolute', 
              top: 10, 
              right: 10, 
              backgroundColor: 'red', 
              color: 'white',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Box 
              style={{ 
                width: 12, 
                height: 12, 
                borderRadius: '50%', 
                backgroundColor: 'white', 
                marginRight: '0.5rem',
                animation: 'pulse 1.5s infinite'
              }} 
            />
            <Text size="sm">REC {formatTime(recordingTime)}</Text>
          </Box>
        )}
      </Box>
      
      {recording && (
        <Box mb="md">
          <Group justify="space-between" mb={4}>
            <Text size="sm">
              {formatTime(recordingTime)} / {formatTime(maxDuration)}
            </Text>
            <Text size="sm">
              {Math.round((recordingTime / maxDuration) * 100)}%
            </Text>
          </Group>
          <Progress 
            value={(recordingTime / maxDuration) * 100} 
            size="lg"
            radius="sm"
          />
        </Box>
      )}
      
      <Group justify="center" grow>
        {!recording && !videoBlob && permission && (
          <Button 
            onClick={startRecording}
            disabled={!permission || !systemChecks.camera || !systemChecks.microphone}
          >
            Start Recording
          </Button>
        )}
        
        {recording && (
          <Button 
            color="red" 
            onClick={stopRecording}
          >
            Stop Recording
          </Button>
        )}
        
        {videoBlob && (
          <>
            <Button 
              variant="outline" 
              onClick={resetRecording}
            >
              Record Again
            </Button>
          </>
        )}
      </Group>
    </Box>
  );
};

export default VideoRecorder;