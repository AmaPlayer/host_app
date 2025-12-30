/**
 * AmaPlayer Moderation Service
 *
 * Containerized microservice for content moderation
 * Migrated from Firebase Cloud Functions for better scalability
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const admin = require('firebase-admin');
const logger = require('./utils/logger');
require('dotenv').config();

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'moderation',
    timestamp: new Date().toISOString(),
  });
});

// Moderation endpoint
app.post('/moderate', async (req, res) => {
  try {
    const { content, contentType, userId } = req.body;

    if (!content || !contentType) {
      return res.status(400).json({
        error: 'Missing required fields: content, contentType'
      });
    }

    logger.info('Moderating content', { contentType, userId });

    // Perform moderation (implement your logic here)
    const moderationResult = await moderateContent(content, contentType);

    // Log moderation result
    if (moderationResult.flagged) {
      await db.collection('moderationLogs').add({
        userId,
        contentType,
        severity: moderationResult.severity,
        categories: moderationResult.categories,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    res.status(200).json({
      success: true,
      result: moderationResult,
    });

  } catch (error) {
    logger.error('Moderation error', { error: error.message });
    res.status(500).json({
      error: 'Moderation failed',
      message: error.message,
    });
  }
});

// Batch moderation endpoint
app.post('/moderate/batch', async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Invalid items array'
      });
    }

    logger.info('Batch moderation', { count: items.length });

    const results = await Promise.all(
      items.map(item => moderateContent(item.content, item.contentType))
    );

    res.status(200).json({
      success: true,
      results,
    });

  } catch (error) {
    logger.error('Batch moderation error', { error: error.message });
    res.status(500).json({
      error: 'Batch moderation failed',
      message: error.message,
    });
  }
});

/**
 * Moderation logic - implement based on functions/src/moderation.ts
 */
async function moderateContent(content, contentType) {
  // TODO: Implement actual moderation logic
  // This is a simplified example

  const flaggedWords = ['spam', 'inappropriate', 'offensive'];
  const contentLower = content.toLowerCase();

  const flagged = flaggedWords.some(word => contentLower.includes(word));

  return {
    flagged,
    severity: flagged ? 'medium' : 'none',
    categories: flagged ? ['spam'] : [],
    confidence: 0.85,
  };
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Moderation service started on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;
