const {
  FIREBASE_API_KEY = '',
  FIREBASE_AUTH_DOMAIN = '',
  FIREBASE_PROJECT_ID = '',
  FIREBASE_STORAGE_BUCKET = '',
  FIREBASE_MESSAGING_SENDER_ID = '',
  FIREBASE_APP_ID = '',
} = process.env;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  env: {
    FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID,
  },
};

export default nextConfig;
