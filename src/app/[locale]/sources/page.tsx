import { contentMetadata, ContentPage } from '@/lib/content-page';

export const generateMetadata = ({ params }: PageProps<'/[locale]/sources'>) =>
  contentMetadata(params, 'sources', '/sources', false);

export default function Page({ params }: PageProps<'/[locale]/sources'>) {
  return <ContentPage params={params} name="sources" />;
}
