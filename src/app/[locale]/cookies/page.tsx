import { contentMetadata, ContentPage } from '@/lib/content-page';

export const generateMetadata = ({ params }: PageProps<'/[locale]/cookies'>) =>
  contentMetadata(params, 'cookies', '/cookies', true);

export default function Page({ params }: PageProps<'/[locale]/cookies'>) {
  return <ContentPage params={params} name="cookies" />;
}
