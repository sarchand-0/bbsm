/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'world.openfoodfacts.org' },
      { protocol: 'http',  hostname: 'localhost' },
    ],
  },
}

export default nextConfig
