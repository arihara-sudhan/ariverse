import Head from 'next/head';
import { ArichuvadiPostView } from '../../src/components/ArichuvadiBlog';
import { getArichuvadiPostBySlug } from '../../lib/arichuvadiData';
import { listContentComments, listContentEntryReactions } from '../../lib/adminData';
import { ARICHUVADI_SITE_LOGO_URL } from '../../lib/arichuvadiAssets';

export async function getServerSideProps(context) {
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
      initialComments: await listContentComments({ sectionKey: 'arichuvadi', entryId: post.id }),
      initialLikesCount: (await listContentEntryReactions({ sectionKey: 'arichuvadi', entryIds: [post.id] }))?.[post.id]?.likesCount || 0,
    },
  };
}

export default function ArichuvadiPostPage({ post, initialComments, initialLikesCount }) {
  return (
    <>
      <Head>
        <title>{post?.title ? `${post.title} | அரிச்சுவடி` : 'அரிச்சுவடி'}</title>
        <meta name="description" content={post?.summary || post?.title || 'அரிச்சுவடி பதிவு.'} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap" rel="stylesheet" />
        <link rel="icon" href={ARICHUVADI_SITE_LOGO_URL} />
        <link rel="apple-touch-icon" href={ARICHUVADI_SITE_LOGO_URL} />
      </Head>
      <ArichuvadiPostView post={post} initialComments={initialComments} initialLikesCount={initialLikesCount} />
    </>
  );
}
