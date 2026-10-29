import { contentMetadata, ContentPage } from '@/lib/content-page';

export const generateMetadata = ({ params }: PageProps<'/[locale]/cgu'>) =>
  contentMetadata(params, 'cgu', '/cgu', true);

export default function Page({ params }: PageProps<'/[locale]/cgu'>) {
  return <ContentPage params={params} name="cgu" />;
}
