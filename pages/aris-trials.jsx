export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/aris-xperiments',
      permanent: false,
    },
  };
}

export default function ArisTrialsRedirectPage() {
  return null;
}

