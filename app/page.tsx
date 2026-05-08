import Hero from '@/components/home/Hero';
import EntryCards from '@/components/home/EntryCards';
import Workflow from '@/components/home/Workflow';
import RecentExecutions from '@/components/home/RecentExecutions';

export default function HomePage() {
  return (
    <>
      <Hero />
      <EntryCards />
      <Workflow />
      <RecentExecutions />
    </>
  );
}
