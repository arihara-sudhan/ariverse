const THIRUKKURAL_EXTERNAL_URL = 'https://arihara-sudhan.github.io/uyir-kural/';

export async function getServerSideProps() {
  return {
    redirect: {
      destination: THIRUKKURAL_EXTERNAL_URL,
      permanent: false,
    },
  };
}

export default function ThirukkuralPage() {
  return null;
}
