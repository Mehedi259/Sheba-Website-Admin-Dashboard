import ClassifiedsView from '@/components/ClassifiedsView';

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  const category = (resolvedParams.category as string) || '';

  return <ClassifiedsView type="services" title="সার্ভিস" defaultCategory={category} />;
}
