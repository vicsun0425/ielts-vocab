import type { Metadata } from 'next';
import { getAllDates } from './lib/db';
import ClientApp from './components/client-app';

export const metadata: Metadata = {
  title: 'IELTS Vocabulary Tool',
  description: 'Paste an English article, get vocabulary words with phonetics, definitions, and audio.',
};

export default async function Home() {
  const dates = await getAllDates();
  return <ClientApp initialDates={dates} />;
}
