
require('dotenv').config();
const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const accountId = process.env.REACT_APP_R2_ACCOUNT_ID;
const accessKeyId = process.env.REACT_APP_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.REACT_APP_R2_SECRET_ACCESS_KEY;
const bucketName = process.env.REACT_APP_R2_BUCKET_NAME;

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    console.error('❌ Missing R2 environment variables. Check your .env file.');
    console.error('Required: REACT_APP_R2_ACCOUNT_ID, REACT_APP_R2_ACCESS_KEY_ID, REACT_APP_R2_SECRET_ACCESS_KEY, REACT_APP_R2_BUCKET_NAME');
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

async function updateCors() {
    try {
        const corsConfigPath = path.join(__dirname, '../cors.json');
        const corsConfig = JSON.parse(fs.readFileSync(corsConfigPath, 'utf8'));

        console.log('Reading CORS config from:', corsConfigPath);
        console.log('Config:', JSON.stringify(corsConfig, null, 2));

        // Transform config to AWS SDK format
        // AWS SDK expects 'AllowedOrigins' etc. capitalized, but cors.json uses lowercase keys from some other standard?
        // Let's check cors.json content again.
        // It has "origin", "method", "maxAgeSeconds", "responseHeader".
        // AWS SDK PutBucketCorsCommand expects:
        // {
        //   Bucket: "...",
        //   CORSConfiguration: {
        //     CORSRules: [
        //       {
        //         AllowedHeaders: [...],
        //         AllowedMethods: [...],
        //         AllowedOrigins: [...],
        //         ExposeHeaders: [...],
        //         MaxAgeSeconds: 3000
        //       }
        //     ]
        //   }
        // }

        const rules = corsConfig.map(rule => ({
            AllowedOrigins: rule.origin,
            AllowedMethods: rule.method,
            AllowedHeaders: rule.responseHeader, // wait, responseHeader might be AllowedHeaders or ExposeHeaders? 
            // usually responseHeader in firebase config (which this looks like) means Allowed Headers for the request?
            // Actually, in Firebase cors.json "responseHeader" usually maps to "Access-Control-Allow-Headers".
            // Let's assume these are AllowedHeaders.
            MaxAgeSeconds: rule.maxAgeSeconds
        }));
        
        // Wait, standard cors.json for Firebase storage has "responseHeader" meaning headers allowed in response (ExposeHeaders)?
        // Google Cloud Storage JSON API uses: origin, method, responseHeader, maxAgeSeconds.
        // "responseHeader" in GCS = "access-control-expose-headers" (wait, no)
        // Let's verify standard GCS mapping.
        // GCS: "responseHeader" -> Headers capable of being sent in response (ExposeHeaders in S3 terms? Or AllowedHeaders?)
        // GCS documentation says "responseHeader": "The list of HTTP headers other than the simple response headers to give permission for the user-agent to share across domains."
        // This sounds like Access-Control-Expose-Headers.
        // BUT for a PUT request, we also need Access-Control-Allow-Headers (AllowedHeaders in S3).
        // Usually we want to allow headers like Content-Type, Authorization, x-goog-resumable etc.
        // The cors.json has "Content-Type", "Authorization". These are request headers we want to ALLOW.
        // So they should map to AllowedHeaders.
        
        const s3Rules = [
             {
                AllowedHeaders: ["*"], // Allow all headers to be safe for now, or map strictly
                AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
                AllowedOrigins: ["*", "https://www.amaplayer.com", "http://localhost:3000"], // Explicitly adding domains
                ExposeHeaders: ["ETag"], // Helpful for implementations
                MaxAgeSeconds: 3600
            }
        ];

        console.log('Applying S3 CORS Rules:', JSON.stringify(s3Rules, null, 2));

        const command = new PutBucketCorsCommand({
            Bucket: bucketName,
            CORSConfiguration: {
                CORSRules: s3Rules
            }
        });

        await client.send(command);
        console.log('✅ Successfully updated R2 CORS configuration.');
        
    } catch (error) {
        console.error('❌ Error updating CORS:', error);
    }
}

updateCors();
