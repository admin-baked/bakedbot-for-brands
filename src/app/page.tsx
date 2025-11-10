import { HomePageClient } from './components/home-page-client';
import Chatbot from '@/components/chatbot';

export default async function HomePage() {
  return (
    <>
      <HomePageClient />
      <Chatbot />
    </>
  );
}
