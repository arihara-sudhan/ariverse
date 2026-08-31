import Head from 'next/head';
import Header from '../../src/components/Header';
import { AriXpandDetailView } from '../../src/components/AriXpandsPublic';
import { getXpandPublicPageData } from '../../lib/ariXpands';

export async function getServerSideProps({ params, query }) {
  const xpand = await getXpandPublicPageData(params?.slug, { month: query?.month });
  if (!xpand) {
    return { notFound: true };
  }
  return {
    props: {
      xpand,
    },
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
      <div className="site ari-xpand-page-shell">
        <Header subPage />
        <AriXpandDetailView xpand={xpand} />
      </div>
    </>
  );
}
