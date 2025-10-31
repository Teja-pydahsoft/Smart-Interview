import { useState } from 'react';
import { Button, Container, Paper, Stack, Text, TextInput, Title, Select, MultiSelect, FileInput, Group, Badge } from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Cpu, Briefcase, FileText } from 'lucide-react';
import axios from 'axios';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';

const DOMAINS = ['frontend', 'backend', 'full stack', 'data science', 'machine learning', 'devops', 'mobile', 'cloud', 'cybersecurity'];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [course, setCourse] = useState('');
  const [branch, setBranch] = useState('');
  const [institution, setInstitution] = useState('');
  const [graduationYear, setGraduationYear] = useState<string | null>(null);
  const [isTech, setIsTech] = useState<string | null>(null);
  const [interestedDomains, setInterestedDomains] = useState<string[]>([]);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const token = localStorage.getItem('token');
  const api = axios.create({ headers: { Authorization: `Bearer ${token}` } });

  async function submitStep1() {
    try {
      await api.put('/api/profile/step1', { fullName, academic: { course, branch, institution, graduationYear: graduationYear ? Number(graduationYear) : undefined } });
      setStep(2);
    } catch (e: any) {
      notifications.show({ color: 'red', message: e?.response?.data?.error || 'Failed to save' });
    }
  }

  async function submitStep2() {
    try {
      await api.put('/api/profile/step2', { isTech: isTech === 'tech', interestedDomains });
      setStep(3);
    } catch (e: any) {
      notifications.show({ color: 'red', message: e?.response?.data?.error || 'Failed to save' });
    }
  }

  async function submitStep3() {
    try {
      if (resumeFile) {
        const form = new FormData();
        form.append('resume', resumeFile);
        await api.post('/api/resume/upload', form, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } });
      }
      await api.put('/api/profile/complete');
      notifications.show({ color: 'green', message: 'Onboarding complete!' });
      navigate('/');
    } catch (e: any) {
      notifications.show({ color: 'red', message: e?.response?.data?.error || 'Failed to complete' });
    }
  }

  return (
    <Container size="sm">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Paper p="lg" radius="md" withBorder>
          <Stack>
            <Group>
              <GraduationCap size={22} />
              <Title order={2}>Onboarding</Title>
              <Badge variant="light">Step {step} / 3</Badge>
            </Group>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <Stack>
                    <TextInput label="Full name" value={fullName} onChange={(e) => setFullName(e.currentTarget.value)} />
                    <Group grow>
                      <TextInput label="Course" value={course} onChange={(e) => setCourse(e.currentTarget.value)} />
                      <TextInput label="Branch" value={branch} onChange={(e) => setBranch(e.currentTarget.value)} />
                    </Group>
                    <TextInput label="Institution" value={institution} onChange={(e) => setInstitution(e.currentTarget.value)} />
                    <Select label="Graduation year" data={Array.from({ length: 8 }, (_, i) => `${new Date().getFullYear() - 1 + i}`)} value={graduationYear} onChange={setGraduationYear} placeholder="Select year" />
                    <Button leftSection={<Cpu size={16} />} onClick={submitStep1}>Continue</Button>
                  </Stack>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <Stack>
                    <Select label="Track" data={[{ value: 'tech', label: 'Tech' }, { value: 'non-tech', label: 'Non Tech' }]} value={isTech} onChange={setIsTech} placeholder="Choose track" />
                    {isTech === 'tech' && (
                      <MultiSelect label="Interested domains" data={DOMAINS} value={interestedDomains} onChange={setInterestedDomains} placeholder="Pick your domains" searchable />
                    )}
                    <Group justify="space-between">
                      <Button variant="light" onClick={() => setStep(1)}>Back</Button>
                      <Button leftSection={<Briefcase size={16} />} onClick={submitStep2}>Continue</Button>
                    </Group>
                  </Stack>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <Stack>
                    <FileInput leftSection={<FileText size={16} />} label="Upload resume (PDF or DOCX)" value={resumeFile} onChange={setResumeFile} accept=".pdf,.docx" />
                    <Group justify="space-between">
                      <Button variant="light" onClick={() => setStep(2)}>Back</Button>
                      <Button onClick={submitStep3}>Finish</Button>
                    </Group>
                  </Stack>
                </motion.div>
              )}
            </AnimatePresence>
          </Stack>
        </Paper>
      </motion.div>
    </Container>
  );
}


