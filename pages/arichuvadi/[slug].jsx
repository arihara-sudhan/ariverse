import Head from 'next/head';
import { ArichuvadiPostView } from '../../src/components/ArichuvadiBlog';
import { getArichuvadiPostBySlug, listArichuvadiPosts } from '../../lib/arichuvadiData';
import { ARICHUVADI_SITE_LOGO_URL } from '../../lib/arichuvadiAssets';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '../../lib/pageCache';

export async function getStaticPaths() {
  const posts = await listArichuvadiPosts();

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
  const post = await getArichuvadiPostBySlug(slug);

  if (!post) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      post,
      // Let the client load comments and live like counts after the post is visible.
      initialComments: [],
      initialLikesCount: 0,
    },
    revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
  };
}

export default function ArichuvadiPostPage({ post, initialComments, initialLikesCount }) {
  return (
    <>
      <Head>
        <title>{post?.title ? `${post.title} | அரிச்சுவடி` : 'அரிச்சுவடி'}</title>
        <meta name="description" content={post?.summary || post?.title || 'அரிச்சுவடி பதிவு.'} />
        <link rel="icon" href={ARICHUVADI_SITE_LOGO_URL} />
        <link rel="apple-touch-icon" href={ARICHUVADI_SITE_LOGO_URL} />
      </Head>
      <ArichuvadiPostView post={post} initialComments={initialComments} initialLikesCount={initialLikesCount} />
    </>
  );
}
