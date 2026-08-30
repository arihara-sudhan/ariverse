import Head from 'next/head';
import Header from '../../src/components/Header';
import { AriXpandDetailView } from '../../src/components/AriXpandsPublic';
import { getXpandBySlug, listXpands } from '../../lib/ariXpands';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '../../lib/pageCache';

export async function getStaticPaths() {
  const xpands = await listXpands({ includePrivate: false });
  return {
    paths: xpands.map((xpand) => ({ params: { slug: xpand.slug } })),
    fallback: 'blocking',
  };
}

export async function getStaticProps({ params }) {
  const xpand = await getXpandBySlug(params?.slug, { includePrivate: false });
  if (!xpand) {
    return { notFound: true };
  }
  return {
    props: {
      xpand,
    },
    revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
  };
}

export default function AriXpandPage({ xpand }) {
  const description = String(xpand?.description || '').trim()
    || `A public Xpand on AriVerse documenting ${xpand?.title || 'an active learning journey'}.`;

  return (
    <>
      <Head>
        <title>{xpand?.title ? `${xpand.title} | ARI XPands` : 'ARI XPands'}</title>
        <meta name="description" content={description} />
      </Head>
      <Header subPage />
      <AriXpandDetailView xpand={xpand} />
    </>
  );
}
