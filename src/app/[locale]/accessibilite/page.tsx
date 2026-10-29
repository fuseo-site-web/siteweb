import { contentMetadata, ContentPage } from '@/lib/content-page';

export const generateMetadata = ({ params }: PageProps<'/[locale]/accessibilite'>) =>
  contentMetadata(params, 'accessibility', '/accessibilite', true);

export default function Page({ params }: PageProps<'/[locale]/accessibilite'>) {
  return <ContentPage params={params} name="accessibility" />;
}
