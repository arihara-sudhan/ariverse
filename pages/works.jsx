export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/ari_career',
      permanent: false,
    },
  };
}

export default function WorksRedirectPage() {
  return null;
}
