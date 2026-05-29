export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/aris-books',
      permanent: true,
    },
  };
}

export default function MyBooksRedirectPage() {
  return null;
}
