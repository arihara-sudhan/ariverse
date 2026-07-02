import Head from 'next/head';
import { ArichuvadiIndexView } from '../../src/components/ArichuvadiBlog';
import { listArichuvadiCategories, listArichuvadiPosts } from '../../lib/arichuvadiData';
import { ARICHUVADI_SITE_LOGO_URL } from '../../lib/arichuvadiAssets';

export async function getServerSideProps() {
  const [posts, categories] = await Promise.all([listArichuvadiPosts(), listArichuvadiCategories()]);

  return {
    props: {
      posts,
      categories,
    },
  };
}

export default function ArichuvadiIndexPage({ posts, categories }) {
  return (
    <>
      <Head>
        <title>அரிச்சுவடி</title>
        <meta name="description" content="அரிச்சுவடி - ஒரு தமிழ்ப் பதிவகம்." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap" rel="stylesheet" />
        <link rel="icon" href={ARICHUVADI_SITE_LOGO_URL} />
        <link rel="apple-touch-icon" href={ARICHUVADI_SITE_LOGO_URL} />
      </Head>
      <ArichuvadiIndexView posts={posts} categories={categories} />
    </>
  );
}
