import { getPgaSchedule } from '@/lib/datagolf';
import PredictionsView from '@/components/PredictionsView';

export default async function Page() {
  const schedule = await getPgaSchedule();
  return <PredictionsView schedule={schedule} />;
}
