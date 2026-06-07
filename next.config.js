/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/works',
        destination: '/ari-career',
        permanent: false,
      },
      {
        source: '/my-books',
        destination: '/aris-books',
        permanent: true,
      },
      {
        source: '/aris-trials',
        destination: '/aris-xperiments',
        permanent: false,
      },
      {
        source: '/thirukkural',
        destination: 'https://arihara-sudhan.github.io/uyir-kural/',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
