import { contentMetadata, ContentPage } from '@/lib/content-page';

export const generateMetadata = ({ params }: PageProps<'/[locale]/pro'>) =>
  contentMetadata(params, 'pro', '/pro', false);

export default function Page({ params }: PageProps<'/[locale]/pro'>) {
  return <ContentPage params={params} name="pro" />;
}
