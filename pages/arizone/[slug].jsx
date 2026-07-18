import Head from 'next/head';
import { AriZonePostView } from '../../src/components/AriZoneBlog';
import { getArizonePostBySlug, listArizonePosts } from '../../lib/arizoneData';
import { ARIZONE_SITE_LOGO_URL } from '../../lib/arizoneAssets';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '../../lib/pageCache';

export async function getStaticPaths() {
  const posts = await listArizonePosts();

  return {
    paths: Array.isArray(posts)
      ? posts
          .map((post) => String(post?.slug || '').trim())
          .filter(Boolean)
          .map((slug) => ({ params: { slug } }))
      : [],
    fallback: 'blocking',
  };
}

export async function getStaticProps(context) {
  const slug = context?.params?.slug;
  const post = await getArizonePostBySlug(slug);

  if (!post) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      post,
      // Let the client fetch live social state after the post HTML is already visible.
      initialComments: [],
      initialLikesCount: 0,
    },
    revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
  };
}

export default function AriZonePostPage({ post, initialComments, initialLikesCount }) {
  return (
    <>
      <Head>
        <title>{post?.title ? `${post.title} | AriZone` : 'AriZone'}</title>
        <meta name="description" content={post?.summary || post?.title || 'AriZone post.'} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap" rel="stylesheet" />
        <link rel="icon" href={ARIZONE_SITE_LOGO_URL} />
        <link rel="apple-touch-icon" href={ARIZONE_SITE_LOGO_URL} />
      </Head>
      <AriZonePostView post={post} initialComments={initialComments} initialLikesCount={initialLikesCount} />
    </>
  );
}
