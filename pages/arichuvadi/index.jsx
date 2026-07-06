import Head from 'next/head';
import { ArichuvadiIndexView } from '../../src/components/ArichuvadiBlog';
import { listArichuvadiCategories, listArichuvadiPosts } from '../../lib/arichuvadiData';
import { ARICHUVADI_SITE_LOGO_URL } from '../../lib/arichuvadiAssets';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '../../lib/pageCache';

export async function getStaticProps() {
  const [posts, categories] = await Promise.all([listArichuvadiPosts(), listArichuvadiCategories()]);

  return {
    props: {
      posts,
      categories,
      initialTopic: 'all',
    },
    revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
  };
}

export default function ArichuvadiIndexPage({ posts, categories, initialTopic }) {
  return (
    <>
      <Head>
        <title>அரிச்சுவடி</title>
        <meta name="description" content="அரிச்சுவடி - ஒரு தமிழ்ப்பதிவகம்." />
        <link rel="icon" href={ARICHUVADI_SITE_LOGO_URL} />
        <link rel="apple-touch-icon" href={ARICHUVADI_SITE_LOGO_URL} />
      </Head>
      <ArichuvadiIndexView posts={posts} categories={categories} initialTopic={initialTopic} />
    </>
  );
}
