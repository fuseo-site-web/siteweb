import { contentMetadata, ContentPage } from '@/lib/content-page';

export const generateMetadata = ({ params }: PageProps<'/[locale]/mentions-legales'>) =>
  contentMetadata(params, 'mentions', '/mentions-legales', true);

export default function Page({ params }: PageProps<'/[locale]/mentions-legales'>) {
  return <ContentPage params={params} name="mentions" />;
}
