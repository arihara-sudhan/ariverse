import Head from 'next/head';
import { AriZonePostView } from '../../src/components/AriZoneBlog';
import { getArizonePostBySlug } from '../../lib/arizoneData';
import { listContentComments } from '../../lib/adminData';
import { ARIZONE_SITE_LOGO_URL } from '../../lib/arizoneAssets';

export async function getServerSideProps(context) {
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
      initialComments: await listContentComments({ sectionKey: 'arizone', entryId: post.id }),
    },
  };
}

export default function AriZonePostPage({ post, initialComments }) {
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
      <AriZonePostView post={post} initialComments={initialComments} />
    </>
  );
}
