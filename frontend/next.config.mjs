/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    typescript: {
        ignoreBuildErrors: true,
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'https://counselai-backend.onrender.com/api/:path*',
            },
        ];
    },
};

export default nextConfig; 