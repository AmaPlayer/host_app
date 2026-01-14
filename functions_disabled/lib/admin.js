"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAdminAccess = exports.deactivateAdmin = exports.createAdmin = exports.checkAdminPermission = exports.verifyAdminRole = exports.AdminRole = void 0;
// Admin Role Management and Verification
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Admin role levels
var AdminRole;
(function (AdminRole) {
    AdminRole["SUPER_ADMIN"] = "super_admin";
    AdminRole["ADMIN"] = "admin";
    AdminRole["MODERATOR"] = "moderator";
    AdminRole["CONTENT_MODERATOR"] = "content_moderator";
})(AdminRole = exports.AdminRole || (exports.AdminRole = {}));
const rolePermissions = {
    [AdminRole.SUPER_ADMIN]: {
        canDeleteContent: true,
        canBanUsers: true,
        canManageReports: true,
        canAccessAnalytics: true,
        canManageAdmins: true,
        canRunTests: true
    },
    [AdminRole.ADMIN]: {
        canDeleteContent: true,
        canBanUsers: true,
        canManageReports: true,
        canAccessAnalytics: true,
        canManageAdmins: false,
        canRunTests: true
    },
    [AdminRole.MODERATOR]: {
        canDeleteContent: true,
        canBanUsers: false,
        canManageReports: true,
        canAccessAnalytics: false,
        canManageAdmins: false,
        canRunTests: false
    },
    [AdminRole.CONTENT_MODERATOR]: {
        canDeleteContent: true,
        canBanUsers: false,
        canManageReports: true,
        canAccessAnalytics: false,
        canManageAdmins: false,
        canRunTests: false
    }
};
/**
 * Verify if user has admin privileges
 * This replaces the insecure client-side email checking
 */
exports.verifyAdminRole = functions.https.onCall(async (data, context) => {
    var _a, _b;
    // Ensure user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to check admin status');
    }
    const uid = context.auth.uid;
    try {
        // Check if user has admin role in Firestore
        const adminDoc = await admin.firestore()
            .collection('admins')
            .doc(uid)
            .get();
        if (!adminDoc.exists) {
            return {
                isAdmin: false,
                role: null,
                permissions: null
            };
        }
        const adminData = adminDoc.data();
        const role = adminData === null || adminData === void 0 ? void 0 : adminData.role;
        const isActive = (adminData === null || adminData === void 0 ? void 0 : adminData.active) === true;
        if (!isActive) {
            return {
                isAdmin: false,
                role: null,
                permissions: null,
                message: 'Admin account is deactivated'
            };
        }
        const permissions = rolePermissions[role];
        return {
            isAdmin: true,
            role: role,
            permissions: permissions,
            adminSince: ((_b = (_a = adminData === null || adminData === void 0 ? void 0 : adminData.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || null
        };
    }
    catch (error) {
        console.error('Error verifying admin role:', error);
        throw new functions.https.HttpsError('internal', 'Failed to verify admin status');
    }
});
/**
 * Check specific permission for authenticated admin
 */
exports.checkAdminPermission = functions.https.onCall(async (data, context) => {
    const { permission } = data;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    if (!permission) {
        throw new functions.https.HttpsError('invalid-argument', 'Permission parameter is required');
    }
    const uid = context.auth.uid;
    try {
        const adminDoc = await admin.firestore()
            .collection('admins')
            .doc(uid)
            .get();
        if (!adminDoc.exists) {
            return { hasPermission: false };
        }
        const adminData = adminDoc.data();
        const role = adminData === null || adminData === void 0 ? void 0 : adminData.role;
        const isActive = (adminData === null || adminData === void 0 ? void 0 : adminData.active) === true;
        if (!isActive) {
            return { hasPermission: false };
        }
        const permissions = rolePermissions[role];
        const hasPermission = permissions[permission] === true;
        return { hasPermission };
    }
    catch (error) {
        console.error('Error checking admin permission:', error);
        throw new functions.https.HttpsError('internal', 'Failed to check permission');
    }
});
/**
 * Create admin user (Super Admin only)
 */
exports.createAdmin = functions.https.onCall(async (data, context) => {
    var _a;
    // Verify caller is super admin
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const callerUid = context.auth.uid;
    const callerAdminDoc = await admin.firestore()
        .collection('admins')
        .doc(callerUid)
        .get();
    if (!callerAdminDoc.exists || ((_a = callerAdminDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== AdminRole.SUPER_ADMIN) {
        throw new functions.https.HttpsError('permission-denied', 'Only super admins can create new admins');
    }
    const { userId, role, email } = data;
    if (!userId || !role || !Object.values(AdminRole).includes(role)) {
        throw new functions.https.HttpsError('invalid-argument', 'Valid userId and role are required');
    }
    try {
        // Create admin document
        await admin.firestore()
            .collection('admins')
            .doc(userId)
            .set({
            role: role,
            email: email,
            active: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: callerUid
        });
        // Set custom claims for faster client-side verification
        await admin.auth().setCustomUserClaims(userId, {
            admin: true,
            role: role
        });
        // Log admin creation
        await admin.firestore()
            .collection('adminLogs')
            .add({
            action: 'admin_created',
            targetUserId: userId,
            targetRole: role,
            performedBy: callerUid,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true, message: 'Admin created successfully' };
    }
    catch (error) {
        console.error('Error creating admin:', error);
        throw new functions.https.HttpsError('internal', 'Failed to create admin');
    }
});
/**
 * Deactivate admin (Super Admin only)
 */
exports.deactivateAdmin = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const callerUid = context.auth.uid;
    const callerAdminDoc = await admin.firestore()
        .collection('admins')
        .doc(callerUid)
        .get();
    if (!callerAdminDoc.exists || ((_a = callerAdminDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== AdminRole.SUPER_ADMIN) {
        throw new functions.https.HttpsError('permission-denied', 'Only super admins can deactivate admins');
    }
    const { userId } = data;
    if (!userId) {
        throw new functions.https.HttpsError('invalid-argument', 'userId is required');
    }
    try {
        // Deactivate admin
        await admin.firestore()
            .collection('admins')
            .doc(userId)
            .update({
            active: false,
            deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
            deactivatedBy: callerUid
        });
        // Remove custom claims
        await admin.auth().setCustomUserClaims(userId, {
            admin: false,
            role: null
        });
        return { success: true, message: 'Admin deactivated successfully' };
    }
    catch (error) {
        console.error('Error deactivating admin:', error);
        throw new functions.https.HttpsError('internal', 'Failed to deactivate admin');
    }
});
// Helper function for other Cloud Functions to verify admin access
async function verifyAdminAccess(uid, requiredPermission) {
    try {
        const adminDoc = await admin.firestore()
            .collection('admins')
            .doc(uid)
            .get();
        if (!adminDoc.exists) {
            return false;
        }
        const adminData = adminDoc.data();
        const role = adminData === null || adminData === void 0 ? void 0 : adminData.role;
        const isActive = (adminData === null || adminData === void 0 ? void 0 : adminData.active) === true;
        if (!isActive) {
            return false;
        }
        if (!requiredPermission) {
            return true; // Just check if user is admin
        }
        const permissions = rolePermissions[role];
        return permissions[requiredPermission] === true;
    }
    catch (error) {
        console.error('Error verifying admin access:', error);
        return false;
    }
}
exports.verifyAdminAccess = verifyAdminAccess;
//# sourceMappingURL=admin.js.map