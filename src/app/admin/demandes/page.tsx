import { connection } from 'next/server';
import { Inbox } from 'lucide-react';
import { MessageBoard } from '@/components/admin/MessageBoard';
import { Card, PageHead } from '@/components/admin/parts';
import { getMessages } from '@/lib/admin/data';

export default async function Requests() {
  // Données du jour : jamais prérendues.
  await connection();
  const rows = await getMessages(['contact']);
  const todo = rows.filter((r) => r.status === 'new' || r.status === 'open').length;
  return (
    <>
      <PageHead
        icon={Inbox}
        title="Demandes"
        lead={`Les questions envoyées par le formulaire de contact du site. ${todo} à traiter sur ${rows.length}.`}
      />
      <Card
        title="Messages reçus"
        info="Chaque message envoyé depuis la page Contact arrive ici. Vous le marquez « en cours » puis « répondu » pour savoir où vous en êtes. Le bouton Répondre ouvre votre messagerie."
        example="Un voyageur demande si le plan convient aux vols de nuit : vous répondez par e-mail, puis cliquez sur « Marquer répondue »."
      >
        <MessageBoard
          rows={rows}
          empty="Aucune demande pour l'instant. Elles apparaîtront ici dès que le formulaire de contact sera utilisé."
        />
      </Card>
    </>
  );
}
