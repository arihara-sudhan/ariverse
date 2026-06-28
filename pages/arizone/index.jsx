import Head from 'next/head';
import { AriZoneIndexView } from '../../src/components/AriZoneBlog';
import { listArizoneCategories, listArizonePosts } from '../../lib/arizoneData';
import { ARIZONE_SITE_LOGO_URL } from '../../lib/arizoneAssets';

export async function getServerSideProps() {
  const [posts, categories] = await Promise.all([listArizonePosts(), listArizoneCategories()]);

  return {
    props: {
      posts,
      categories,
    },
  };
}

export default function AriZoneIndexPage({ posts, categories }) {
  return (
    <>
      <Head>
        <title>AriZone</title>
        <meta name="description" content="AriZone blog on AriVerse." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap" rel="stylesheet" />
        <link rel="icon" href={ARIZONE_SITE_LOGO_URL} />
        <link rel="apple-touch-icon" href={ARIZONE_SITE_LOGO_URL} />
      </Head>
      <AriZoneIndexView posts={posts} categories={categories} />
    </>
  );
}
