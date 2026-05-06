/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    '192.168.1.53',
    '192.168.1.53:3000',
    '192.168.1.30',
    '192.168.1.30:3000',
  ],
}

module.exports = nextConfig