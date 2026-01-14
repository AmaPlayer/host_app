// Server-side Content Moderation Functions
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { verifyAdminAccess } from './admin';

// Content filtering categories and severity levels
enum FilterCategory {
  POLITICS = 'politics',
  NUDITY = 'nudity', 
  VIOLENCE = 'violence',
  HATE_SPEECH = 'hate_speech',
  SPAM = 'spam',
  DRUGS = 'drugs'
}

enum SeverityLevel {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

interface FilterResult {
  isClean: boolean;
  violations: {
    category: FilterCategory;
    severity: SeverityLevel;
    matches: string[];
    confidence: number;
  }[];
  riskScore: number;
  action: 'allow' | 'warn' | 'block' | 'flag';
}

// Secure content filtering patterns (server-side only)
const contentFilters = {
  [FilterCategory.POLITICS]: {
    critical: [
      /\b(terrorist|terrorism|bomb|attack|kill|murder|death|violence)\b/gi,
      /\b(modi|bjp|congress|aap|political party|election|vote|politics)\b/gi
    ],
    high: [
      /\b(government|minister|pm|president|political|party|election)\b/gi,
      /\b(hindu|muslim|christian|sikh|religion|caste|community)\b/gi
    ],
    medium: [
      /\b(policy|law|rule|regulation|authority)\b/gi
    ]
  },
  [FilterCategory.NUDITY]: {
    critical: [
      /\b(nude|naked|nsfw|xxx|porn|sex|sexual|intimate|private parts)\b/gi,
      /\b(breast|penis|vagina|genital|explicit|adult content)\b/gi
    ],
    high: [
      /\b(topless|underwear|lingerie|bikini|revealing|exposed)\b/gi
    ],
    medium: [
      /\b(attractive|hot|sexy|beautiful|gorgeous)\b/gi
    ]
  },
  [FilterCategory.VIOLENCE]: {
    critical: [
      /\b(kill|murder|death|blood|violence|fight|attack|hurt|harm)\b/gi,
      /\b(weapon|gun|knife|sword|dangerous|threat)\b/gi
    ],
    high: [
      /\b(punch|kick|hit|slap|beat|injure|wound)\b/gi
    ],
    medium: [
      /\b(angry|mad|furious|aggressive|rough)\b/gi
    ]
  },
  [FilterCategory.HATE_SPEECH]: {
    critical: [
      /\b(hate|racist|discrimination|abuse|harassment|bully)\b/gi,
      /\b(stupid|idiot|fool|loser|worthless|pathetic)\b/gi
    ],
    high: [
      /\b(ugly|fat|skinny|weird|freak|dumb)\b/gi
    ],
    medium: [
      /\b(bad|terrible|awful|horrible|disgusting)\b/gi
    ]
  },
  [FilterCategory.SPAM]: {
    critical: [
      /\b(buy now|click here|free money|get rich|lottery|winner)\b/gi,
      /\b(discount|offer|sale|promotion|advertisement|marketing)\b/gi
    ],
    high: [
      /\b(subscribe|follow|like|share|comment|visit)\b/gi
    ],
    medium: [
      /\b(check out|amazing|incredible|unbelievable)\b/gi
    ]
  },
  [FilterCategory.DRUGS]: {
    critical: [
      /\b(drug|drugs|cocaine|heroin|marijuana|weed|alcohol|drunk)\b/gi,
      /\b(smoking|cigarette|tobacco|addiction|substance)\b/gi
    ],
    high: [
      /\b(beer|wine|party|drink|intoxicated)\b/gi
    ],
    medium: [
      /\b(celebration|fun|enjoy|relax)\b/gi
    ]
  }
};

// Sports whitelist - terms that should be allowed even if they match filters
const sportsWhitelist = [
  'fight', 'attack', 'kill', 'murder', 'beat', 'hit', 'punch', 'kick', 'shot', 'fire',
  'competition', 'match', 'game', 'tournament', 'championship', 'victory', 'win',
  'performance', 'training', 'practice', 'workout', 'exercise', 'fitness',
  'team', 'player', 'athlete', 'coach', 'sport', 'sports'
];

/**
 * Server-side content filtering function
 * This replaces the client-side filtering to prevent bypass
 */
export const moderateContent = functions.https.onCall(async (data, context) => {
  const { content, contentType = 'post', sportsContext = false } = data;

  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Authentication required'
    );
  }

  if (!content || typeof content !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Content text is required'
    );
  }

  try {
    const filterResult = analyzeContent(content, sportsContext);
    
    // Log moderation result for analysis
    await admin.firestore()
      .collection('moderationLogs')
      .add({
        userId: context.auth.uid,
        content: content.substring(0, 100), // First 100 chars only
        contentType,
        filterResult,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

    return filterResult;

  } catch (error) {
    console.error('Error in content moderation:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Content moderation failed'
    );
  }
});

/**
 * Content analysis function
 */
function analyzeContent(content: string, sportsContext: boolean = false): FilterResult {
  const violations: FilterResult['violations'] = [];
  let riskScore = 0;

  // Normalize content for analysis
  const normalizedContent = content.toLowerCase().trim();

  // Check against each filter category
  Object.entries(contentFilters).forEach(([category, patterns]) => {
    Object.entries(patterns).forEach(([severity, regexList]) => {
      regexList.forEach((regex: RegExp) => {
        const matches = normalizedContent.match(regex);
        if (matches) {
          // Check if matches are in sports whitelist
          const filteredMatches = sportsContext 
            ? matches.filter(match => !sportsWhitelist.some(term => match.includes(term)))
            : matches;

          if (filteredMatches.length > 0) {
            violations.push({
              category: category as FilterCategory,
              severity: severity as SeverityLevel,
              matches: filteredMatches,
              confidence: calculateConfidence(filteredMatches, severity as SeverityLevel)
            });

            // Add to risk score
            riskScore += getSeverityScore(severity as SeverityLevel) * filteredMatches.length;
          }
        }
      });
    });
  });

  // Normalize risk score (0-100)
  riskScore = Math.min(100, riskScore);

  // Determine action based on violations and risk score
  const action = determineAction(violations, riskScore);

  return {
    isClean: violations.length === 0,
    violations,
    riskScore,
    action
  };
}

function calculateConfidence(matches: string[], severity: SeverityLevel): number {
  const baseConfidence = {
    [SeverityLevel.LOW]: 0.3,
    [SeverityLevel.MEDIUM]: 0.6,
    [SeverityLevel.HIGH]: 0.8,
    [SeverityLevel.CRITICAL]: 0.95
  };

  return Math.min(1.0, baseConfidence[severity] + (matches.length * 0.1));
}

function getSeverityScore(severity: SeverityLevel): number {
  return {
    [SeverityLevel.LOW]: 5,
    [SeverityLevel.MEDIUM]: 15,
    [SeverityLevel.HIGH]: 30,
    [SeverityLevel.CRITICAL]: 50
  }[severity];
}

function determineAction(violations: FilterResult['violations'], riskScore: number): FilterResult['action'] {
  const hasCritical = violations.some(v => v.severity === SeverityLevel.CRITICAL);
  const hasHigh = violations.some(v => v.severity === SeverityLevel.HIGH);

  if (hasCritical || riskScore >= 50) {
    return 'block';
  } else if (hasHigh || riskScore >= 30) {
    return 'flag';
  } else if (riskScore >= 15) {
    return 'warn';
  } else {
    return 'allow';
  }
}

/**
 * Handle content reports (Admin only)
 */
export const handleContentReport = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  // Verify admin access
  const hasPermission = await verifyAdminAccess(context.auth.uid, 'canManageReports');
  if (!hasPermission) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Admin access required'
    );
  }

  const { reportId, action, notes } = data;

  if (!reportId || !action) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Report ID and action are required'
    );
  }

  try {
    // Update report status
    await admin.firestore()
      .collection('contentReports')
      .doc(reportId)
      .update({
        status: action,
        moderatorId: context.auth.uid,
        moderatorNotes: notes || '',
        reviewedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    // Log admin action
    await admin.firestore()
      .collection('adminLogs')
      .add({
        action: 'report_handled',
        reportId,
        moderatorAction: action,
        performedBy: context.auth.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

    return { success: true, message: 'Report handled successfully' };

  } catch (error) {
    console.error('Error handling content report:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to handle report'
    );
  }
});

/**
 * Delete content (Admin only)
 */
export const deleteContent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  // Verify admin access
  const hasPermission = await verifyAdminAccess(context.auth.uid, 'canDeleteContent');
  if (!hasPermission) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Content deletion permission required'
    );
  }

  const { contentId, contentType, reason } = data;

  if (!contentId || !contentType) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Content ID and type are required'
    );
  }

  try {
    // Delete content from appropriate collection
    const collectionName = contentType === 'message' ? 'messages' : 'posts';
    await admin.firestore()
      .collection(collectionName)
      .doc(contentId)
      .delete();

    // Log admin action
    await admin.firestore()
      .collection('adminLogs')
      .add({
        action: 'content_deleted',
        contentId,
        contentType,
        reason: reason || 'Policy violation',
        performedBy: context.auth.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

    return { success: true, message: 'Content deleted successfully' };

  } catch (error) {
    console.error('Error deleting content:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to delete content'
    );
  }
});

/**
 * Automatic content moderation trigger
 * Runs when new posts are created
 */
export const autoModeratePost = functions.firestore
  .document('posts/{postId}')
  .onCreate(async (snap, context) => {
    const postData = snap.data();
    const postId = context.params.postId;

    try {
      // Analyze post content
      const filterResult = analyzeContent(postData.caption || '', true); // Sports context = true

      // If content should be blocked, update post visibility
      if (filterResult.action === 'block') {
        await snap.ref.update({
          isVisible: false,
          moderationStatus: 'blocked',
          moderationReason: 'Automatic content filter',
          moderatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Create automatic report
        await admin.firestore()
          .collection('contentReports')
          .add({
            contentId: postId,
            contentType: 'post',
            reporterId: 'system',
            reporterName: 'Automatic Moderation',
            reasons: filterResult.violations.map(v => v.category),
            priority: filterResult.riskScore >= 70 ? 'high' : 'medium',
          status: 'pending',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          autoGenerated: true,
          filterResult
        });
      } else if (filterResult.action === 'flag') {
        // Flag for manual review
        await snap.ref.update({
          moderationStatus: 'flagged',
          flaggedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      // Log moderation result
      await admin.firestore()
        .collection('moderationLogs')
        .add({
          contentId: postId,
          contentType: 'post',
          userId: postData.userId,
          filterResult,
          action: filterResult.action,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

    } catch (error) {
      console.error('Error in automatic post moderation:', error);
    }
  });