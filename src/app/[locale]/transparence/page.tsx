import { contentMetadata, ContentPage } from '@/lib/content-page';

export const generateMetadata = ({ params }: PageProps<'/[locale]/transparence'>) =>
  contentMetadata(params, 'transparency', '/transparence', false);

export default function Page({ params }: PageProps<'/[locale]/transparence'>) {
  return <ContentPage params={params} name="transparency" />;
}
