// next.config.js
const fs = require('fs');
const path = require('path');

/** @type {import('next').NextConfig} */

const buildEnv = process.env.BUILD_ENV || 'development';

const basePath = ['production', 'homolog'].includes(buildEnv) ? '/saas' : '';
const distDir = buildEnv === 'production' ? 'production' : buildEnv === 'homolog' ? 'homolog' : '.next';
const isDevelopment = [buildEnv].includes('development');

const nextConfig = {
    reactStrictMode: false,
    swcMinify: true,
    images: {
        dangerouslyAllowSVG: true,
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
        domains: [
            "localhost",
            "www.tickflow.com.br",
        ],
        unoptimized: true
    },
    output: 'export',
    basePath: basePath,
    distDir: distDir,
    // Desabilitar ESLint durante builds de homolog e produção
    eslint: {
        ignoreDuringBuilds: ['production', 'homolog'].includes(buildEnv)
    },
    env: {
        API_URL: process.env.NEXT_PUBLIC_API_URL,
        BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
        RELATIVE_PATH: process.env.NEXT_PUBLIC_RELATIVE_PATH,
        WEBSOCKET_URL: process.env.NEXT_WEBSOCKET_URL,
        BUILD_ENV: process.env.BUILD_ENV,
    },
    generateBuildId: async () => {
        const buildId = Date.now().toString();
        const filePath = path.join(__dirname, 'public', 'build-id.json');
        fs.writeFileSync(filePath, JSON.stringify({ buildId }, null, 2));
        return buildId;
    },
};

module.exports = nextConfig;
