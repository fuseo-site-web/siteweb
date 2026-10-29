import { contentMetadata, ContentPage } from '@/lib/content-page';

export const generateMetadata = ({ params }: PageProps<'/[locale]/confidentialite'>) =>
  contentMetadata(params, 'privacy', '/confidentialite', true);

export default function Page({ params }: PageProps<'/[locale]/confidentialite'>) {
  return <ContentPage params={params} name="privacy" />;
}
