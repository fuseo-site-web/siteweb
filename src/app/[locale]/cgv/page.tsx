import { contentMetadata, ContentPage } from '@/lib/content-page';

export const generateMetadata = ({ params }: PageProps<'/[locale]/cgv'>) =>
  contentMetadata(params, 'cgv', '/cgv', true);

export default function Page({ params }: PageProps<'/[locale]/cgv'>) {
  return <ContentPage params={params} name="cgv" />;
}
