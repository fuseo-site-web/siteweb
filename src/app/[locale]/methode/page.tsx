import { contentMetadata, ContentPage } from '@/lib/content-page';

export const generateMetadata = ({ params }: PageProps<'/[locale]/methode'>) =>
  contentMetadata(params, 'method', '/methode', false);

export default function Page({ params }: PageProps<'/[locale]/methode'>) {
  return <ContentPage params={params} name="method" />;
}
