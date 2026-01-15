const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const accountId = process.env.REACT_APP_R2_ACCOUNT_ID;
const accessKeyId = process.env.REACT_APP_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.REACT_APP_R2_SECRET_ACCESS_KEY;
const bucketName = process.env.REACT_APP_R2_BUCKET_NAME;

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    console.error('❌ Missing R2 environment variables (REACT_APP_R2_*)');
    process.exit(1);
}

const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});

const corsRules = [
    {
        AllowedHeaders: ['*'],
        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        AllowedOrigins: [
            'http://localhost:3000',
            'https://www.amaplayer.com',
            'https://amaplayer.com',
            'https://*.pages.dev' // For Cloudflare Pages previews
        ],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3600,
    },
];

async function applyCors() {
    try {
        console.log(`🔧 Applying CORS policy to bucket: ${bucketName}...`);

        await client.send(new PutBucketCorsCommand({
            Bucket: bucketName,
            CORSConfiguration: {
                CORSRules: corsRules,
            },
        }));

        console.log('✅ CORS policy successfully applied!');
        console.log('ALLOWED ORIGINS:', corsRules[0].AllowedOrigins);
    } catch (error) {
        console.error('❌ Failed to apply CORS policy:', error);
    }
}

applyCors();
