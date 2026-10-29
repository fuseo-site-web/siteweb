import { connection } from 'next/server';
import { CalendarClock } from 'lucide-react';
import { MessageBoard } from '@/components/admin/MessageBoard';
import { Card, PageHead } from '@/components/admin/parts';
import { getMessages } from '@/lib/admin/data';

export default async function Leads() {
  // Données du jour : jamais prérendues.
  await connection();
  const rows = await getMessages(['rdv', 'pro']);
  const todo = rows.filter((r) => r.status === 'new').length;
  return (
    <>
      <PageHead
        icon={CalendarClock}
        title="Leads & rendez-vous"
        lead={`Les personnes qui demandent un rendez-vous ou s'intéressent à Fuseo Pro (entreprises, équipes). ${todo} nouvelle(s) sur ${rows.length}.`}
      />
      <Card
        title="Demandes commerciales"
        info="Un lead est une personne ou une entreprise qui a montré de l'intérêt et qu'il faut recontacter. Ici : les demandes de rendez-vous et celles de la page Fuseo Pro. Répondez vite : un lead contacté dans la journée a beaucoup plus de chances de devenir client."
        example="Une compagnie aérienne demande un rendez-vous pour proposer Fuseo à ses équipages : c'est un lead « Fuseo Pro » à rappeler en priorité."
      >
        <MessageBoard
          rows={rows}
          empty="Aucun lead pour l'instant. Les demandes de rendez-vous et de Fuseo Pro apparaîtront ici."
        />
      </Card>
    </>
  );
}
