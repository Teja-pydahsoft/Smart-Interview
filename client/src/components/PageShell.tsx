import { Container } from '@mantine/core';
import { PropsWithChildren } from 'react';

export default function PageShell({ children }: PropsWithChildren) {
  return (
    <div style={{ position: 'relative', minHeight: '100%', zIndex: 1 }}>
      <Container size="md" pt="xl" pb="xl" style={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ width: '100%' }}>
          {children}
        </div>
      </Container>
    </div>
  );
}


