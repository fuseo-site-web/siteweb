import { contentMetadata, ContentPage } from '@/lib/content-page';

export const generateMetadata = ({ params }: PageProps<'/[locale]/la-science'>) =>
  contentMetadata(params, 'science', '/la-science', false);

export default function Page({ params }: PageProps<'/[locale]/la-science'>) {
  return <ContentPage params={params} name="science" />;
}
