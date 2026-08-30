import Head from 'next/head';
import Header from '../../src/components/Header';
import { AriXpandsIndexView } from '../../src/components/AriXpandsPublic';
import { getXpandsGlobalStats, listXpands } from '../../lib/ariXpands';
import { getProfileLinkByHref, getSectionHero } from '../../lib/adminData';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '../../lib/pageCache';

export async function getStaticProps() {
  const [xpands, stats, link] = await Promise.all([
    listXpands({ includePrivate: false }),
    getXpandsGlobalStats(),
    getProfileLinkByHref('/ari-xpands'),
  ]);
  const hero = link
    ? await getSectionHero(link.id, "#Ari'sXpands")
    : {
        heading: "#Ari'sXpands",
        description: "A living record of things Ari is learning, building, questioning, and exploring.",
        quote: '',
        imageUrl: '',
      };

  return {
    props: {
      xpands,
      stats,
      hero,
    },
    revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
  };
}

export default function AriXpandsIndexPage({ xpands, stats, hero }) {
  const description = String(hero?.description || '').trim()
    || 'A living record of things Ari is learning, building, questioning, and exploring.';

  return (
    <>
      <Head>
        <title>ARI XPands | AriVerse</title>
        <meta name="description" content={description} />
      </Head>
      <div className="site ari-xpands-site">
        <Header subPage />
        <AriXpandsIndexView xpands={xpands} stats={stats} hero={hero} />
      </div>
    </>
  );
}
