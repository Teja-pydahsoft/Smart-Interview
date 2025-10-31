import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Container, Paper, PasswordInput, Stack, TextInput, Title, Group } from '@mantine/core';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Lock } from 'lucide-react';
import axios from 'axios';
import { notifications } from '@mantine/notifications';
import { useNavigate, Link } from 'react-router-dom';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export default function Register() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      const res = await axios.post('/api/auth/register', data);
      localStorage.setItem('token', res.data.token);
      notifications.show({ color: 'green', message: 'Account created!' });
      navigate('/onboarding');
    } catch (e: any) {
      notifications.show({ color: 'red', message: e?.response?.data?.error || 'Registration failed' });
    }
  }

  return (
    <Container size="xs">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Paper p="lg" radius="md" withBorder>
          <Stack>
            <Group>
              <UserPlus size={22} />
              <Title order={2}>Create account</Title>
            </Group>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack>
                <TextInput leftSection={<Mail size={16} />} label="Email" placeholder="you@email.com" {...register('email')} error={errors.email?.message} />
                <PasswordInput leftSection={<Lock size={16} />} label="Password" placeholder="Your password" {...register('password')} error={errors.password?.message} />
                <Button type="submit" loading={isSubmitting} leftSection={<UserPlus size={16} />}>Register</Button>
                <div>Have an account? <Link to="/login">Login</Link></div>
              </Stack>
            </form>
          </Stack>
        </Paper>
      </motion.div>
    </Container>
  );
}


