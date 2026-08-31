import Head from 'next/head';
import Header from '../../src/components/Header';
import { AriXpandsIndexView } from '../../src/components/AriXpandsPublic';
import { listXpands } from '../../lib/ariXpands';
import { getProfileLinkByHref, getSectionHero } from '../../lib/adminData';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '../../lib/pageCache';

export async function getStaticProps() {
  const [xpands, link] = await Promise.all([
    listXpands({ includePrivate: false }),
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
      hero,
    },
    revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
  };
}

export default function AriXpandsIndexPage({ xpands, hero }) {
  const description = String(hero?.description || '').trim()
    || 'A living record of things Ari is learning, building, questioning, and exploring.';

  return (
    <>
      <Head>
        <title>ARI XPands | AriVerse</title>
        <meta name="description" content={description} />
      </Head>
      <div className="site">
        <Header subPage />
        <AriXpandsIndexView xpands={xpands} hero={hero} />
      </div>
    </>
  );
}
