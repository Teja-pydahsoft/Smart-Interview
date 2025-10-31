import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Container, Paper, PasswordInput, Stack, TextInput, Title, Group } from '@mantine/core';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock } from 'lucide-react';
import axios from 'axios';
import { notifications } from '@mantine/notifications';
import { useNavigate, Link } from 'react-router-dom';

const schema = z.object({
  email: z.string().min(3),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      const payload = { ...data, email: data.email === 'admin' ? 'admin@local' : data.email };
      const res = await axios.post('/api/auth/login', payload);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      window.dispatchEvent(new Event('auth-changed'));
      notifications.show({ color: 'green', message: 'Logged in!' });
      if (res.data.role === 'admin') {
        navigate('/admin');
      } else if (res.data.onboardingCompleted) {
        navigate('/');
      } else {
        navigate('/onboarding');
      }
    } catch (e: any) {
      notifications.show({ color: 'red', message: e?.response?.data?.error || 'Login failed' });
    }
  }

  return (
    <Container size="xs">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Paper p="lg" radius="md" withBorder>
          <Stack>
            <Group>
              <LogIn size={22} />
              <Title order={2}>Welcome back</Title>
            </Group>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack>
                <TextInput leftSection={<Mail size={16} />} label="Email or admin" placeholder="you@email.com or admin" {...register('email')} error={errors.email?.message} />
                <PasswordInput leftSection={<Lock size={16} />} label="Password" placeholder="Your password" {...register('password')} error={errors.password?.message} />
                <Button type="submit" loading={isSubmitting} leftSection={<LogIn size={16} />}>Login</Button>
                <div>New here? <Link to="/register">Create account</Link></div>
              </Stack>
            </form>
          </Stack>
        </Paper>
      </motion.div>
    </Container>
  );
}


