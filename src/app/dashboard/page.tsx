
'use server';

import { getPlaybooksForBrand } from '@/app/dashboard/actions';
import DashboardPageComponent from '@/app/dashboard/page-client';


// This is now a Server Component that fetches data and passes it to the client.
export default async function DashboardPage() {
  
  // Fetch live playbook data from Firestore.
  const playbooks = await getPlaybooksForBrand();

  return (
      <DashboardPageComponent initialPlaybooks={playbooks} />
  );
}
