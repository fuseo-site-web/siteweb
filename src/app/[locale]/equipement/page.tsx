import { contentMetadata, ContentPage } from '@/lib/content-page';

export const generateMetadata = ({ params }: PageProps<'/[locale]/equipement'>) =>
  contentMetadata(params, 'gear', '/equipement', false);

export default function Page({ params }: PageProps<'/[locale]/equipement'>) {
  return <ContentPage params={params} name="gear" />;
}
