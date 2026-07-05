export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/arichuvadi?category=kavithaigal',
      permanent: true,
    },
  };
}

export default function AriyinKavithaigalRedirectPage() {
  return null;
}
