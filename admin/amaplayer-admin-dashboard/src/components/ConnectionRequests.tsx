import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  limit,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';

import { db } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import './ConnectionRequests.css';

interface OrganizationConnection {
  id: string;
  organizationId?: string;
  organizationName?: string;
  athleteId?: string;
  athleteName?: string;
  senderId?: string;
  senderName?: string;
  senderPhotoURL?: string;
  senderRole?: 'organization' | 'coach' | 'athlete';
  recipientId?: string;
  recipientName?: string;
  recipientPhotoURL?: string;
  recipientRole?: 'athlete' | 'organization' | 'coach';
  connectionType?: 'org_to_athlete' | 'athlete_to_org' | 'org_to_coach' | 'coach_to_org';
  status: 'pending' | 'approved' | 'rejected' | 'accepted';
  createdAt: Timestamp | Date | string;
  acceptedAt?: Timestamp | Date | string;
  rejectedAt?: Timestamp | Date | string;
  requestDate?: Timestamp | Date | string;
  friendshipId?: string;
  createdViaConnection?: boolean;
  source?: 'current' | 'migrated'; // Track which collection it came from
}

interface ConnectionStats {
  totalPending: number;
  totalAccepted: number;
  totalRejected: number;
  acceptanceRate: number;
  averageDaysToAccept: number;
  totalConnections: number;
}

interface TabType {
  all: 'all';
  pending: 'pending';
  accepted: 'accepted';
  rejected: 'rejected';
  org_to_athlete: 'org_to_athlete';
  athlete_to_org: 'athlete_to_org';
  org_to_coach: 'org_to_coach';
  coach_to_org: 'coach_to_org';
}

export const ConnectionRequests: React.FC = () => {
  const [activeTab, setActiveTab] = useState<keyof TabType>('all');
  const [connections, setConnections] = useState<OrganizationConnection[]>([]);
  const [stats, setStats] = useState<ConnectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

  // Refs to store unsubscribe functions for cleanup
  const unsubscribersRef = useRef<Array<() => void>>([]);
  const statsUnsubscribersRef = useRef<Array<() => void>>([]);

  // Load data on component mount and tab change
  useEffect(() => {
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    loadData();
    loadStats();

    // Cleanup function to unsubscribe from all listeners
    return () => {
      // Cleanup data listeners
      unsubscribersRef.current.forEach(unsub => unsub());
      unsubscribersRef.current = [];

      // Cleanup stats listeners
      statsUnsubscribersRef.current.forEach(unsub => unsub());
      statsUnsubscribersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📍 Loading data for tab:', activeTab);

      // Clear previous listeners (if any)
      unsubscribersRef.current.forEach(unsub => unsub());
      unsubscribersRef.current = [];

      console.log('🔥 Fetching connections from BOTH Supabase (Active) and Firestore (Legacy)...');

      // 1. Fetch Supabase Data (The Source of Truth for New App Usage)
      let supabaseQuery = supabase
        .from('organization_connections')
        .select(`
          *,
          sender:users!sender_id (uid, display_name, photo_url, role),
          recipient:users!recipient_id (uid, display_name, photo_url, role)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply Supabase Filters
      if (activeTab === 'pending') {
        supabaseQuery = supabaseQuery.eq('status', 'pending');
      } else if (activeTab === 'accepted') {
        supabaseQuery = supabaseQuery.eq('status', 'accepted');
      } else if (activeTab === 'rejected') {
        supabaseQuery = supabaseQuery.eq('status', 'rejected');
      } else if (activeTab !== 'all') {
        supabaseQuery = supabaseQuery.eq('connection_type', activeTab);
      }

      const { data: supabaseData, error: supabaseError } = await supabaseQuery;
      if (supabaseError) throw supabaseError;

      const supabaseConnections = (supabaseData || []).map(row => ({
        id: row.id,
        connectionType: row.connection_type,
        senderId: row.sender_id, // Internal ID or UID depending on schema, usually internal ID in Supabase
        senderName: row.sender?.display_name || 'Unknown',
        senderPhotoURL: row.sender?.photo_url,
        senderRole: (row.sender?.role || 'organization') as any,
        recipientId: row.recipient_id,
        recipientName: row.recipient?.display_name || 'Unknown',
        recipientPhotoURL: row.recipient?.photo_url,
        recipientRole: (row.recipient?.role || 'athlete') as any,
        status: row.status,
        createdAt: row.created_at,
        acceptedAt: row.accepted_at,
        rejectedAt: row.rejected_at,
        source: 'current' as const // Marked as Current/Active
      }));

      // 2. Fetch Firestore Data (Legacy / Migrated Data)
      let firestoreQ = query(
        collection(db, 'organizationConnections'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      // Apply Firestore Filters
      if (activeTab === 'pending') {
        firestoreQ = query(firestoreQ, where('status', '==', 'pending'));
      } else if (activeTab === 'accepted') {
        firestoreQ = query(firestoreQ, where('status', '==', 'accepted'));
      } else if (activeTab === 'rejected') {
        firestoreQ = query(firestoreQ, where('status', '==', 'rejected'));
      } else if (activeTab !== 'all') {
        firestoreQ = query(firestoreQ, where('connectionType', '==', activeTab));
      }

      const firestoreSnapshot = await getDocs(firestoreQ);
      const firestoreConnections = firestoreSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          source: 'migrated' as const // Marked as Migrated/Legacy
        } as OrganizationConnection;
      });

      console.log(`✅ Loaded: ${supabaseConnections.length} Active (Supabase) + ${firestoreConnections.length} Legacy (Firestore)`);

      // 3. Merge and Sort
      // We prioritize Supabase. If IDs happen to match (unlikely), Supabase wins.
      const allConnections = [...supabaseConnections, ...firestoreConnections].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // Descending
      });

      setConnections(allConnections);
      setLoading(false);

      // OPTIONAL: Set up Realtime Listener for the LIST view as well
      // (For now, we just fetch once on tab change to avoid complexity/flicker, 
      // but stats are realtime)

    } catch (err: any) {
      console.error('❌ Load Info Error:', err);
      setError(`Failed to load connections: ${err.message}`);
      setLoading(false);
    }
  };

  const loadStats = () => {
    try {
      console.log('📊 Setting up listeners for Hybrid Stats (Supabase + Firestore)...');

      // Clear previous stats listeners
      statsUnsubscribersRef.current.forEach(unsub => unsub());
      statsUnsubscribersRef.current = [];

      // State to hold counts from both sources
      const counts = {
        firestore: { pending: 0, accepted: 0, rejected: 0, total: 0 },
        supabase: { pending: 0, accepted: 0, rejected: 0, total: 0 }
      };

      // Store documents for average days calculation (Firestore Only for now, Supabase calc is heavier)
      let firestoreAcceptedDocs: any[] = [];

      // Function to update stats display
      const updateStats = () => {
        const totalPending = counts.firestore.pending + counts.supabase.pending;
        const totalAccepted = counts.firestore.accepted + counts.supabase.accepted;
        const totalRejected = counts.firestore.rejected + counts.supabase.rejected;
        const totalConnections = counts.firestore.total + counts.supabase.total;

        const acceptanceRate = totalConnections > 0 ? (totalAccepted / totalConnections) * 100 : 0;

        // Calculate average days to accept (Mixed calculation is strict, mostly relying on Firestore for legacy)
        // For robustness, simply using Firestore docs for avg days is acceptable as legacy data is most likely to have history.
        let totalDays = 0;
        let acceptedTimeCount = 0;

        firestoreAcceptedDocs.forEach(doc => {
          const data = doc.data();
          if (data.createdAt && data.acceptedAt) {
            const createdTime = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : new Date(data.createdAt).getTime();
            const acceptedTime = data.acceptedAt instanceof Timestamp ? data.acceptedAt.toMillis() : new Date(data.acceptedAt).getTime();
            const days = (acceptedTime - createdTime) / (1000 * 60 * 60 * 24);
            totalDays += days;
            acceptedTimeCount++;
          }
        });

        const averageDaysToAccept = acceptedTimeCount > 0 ? Math.round(totalDays / acceptedTimeCount * 10) / 10 : 0;

        setStats({
          totalPending,
          totalAccepted,
          totalRejected,
          acceptanceRate: Math.round(acceptanceRate * 100) / 100,
          averageDaysToAccept,
          totalConnections
        });
      };

      // 1. Fetch Initial Supabase Counts
      const fetchSupabaseCounts = async () => {
        try {
          // We use HEAD requests to get counts efficiently
          const { count: pending } = await supabase.from('organization_connections').select('*', { count: 'exact', head: true }).eq('status', 'pending');
          const { count: accepted } = await supabase.from('organization_connections').select('*', { count: 'exact', head: true }).eq('status', 'accepted');
          const { count: rejected } = await supabase.from('organization_connections').select('*', { count: 'exact', head: true }).eq('status', 'rejected');

          counts.supabase.pending = pending || 0;
          counts.supabase.accepted = accepted || 0;
          counts.supabase.rejected = rejected || 0;
          counts.supabase.total = (pending || 0) + (accepted || 0) + (rejected || 0);

          updateStats();
        } catch (e) {
          console.error('Error fetching Supabase stats:', e);
        }
      };

      fetchSupabaseCounts();

      // 2. Set up Firestore Listeners (Realtime)
      const pendingUnsub = onSnapshot(
        query(collection(db, 'organizationConnections'), where('status', '==', 'pending')),
        (snapshot) => {
          counts.firestore.pending = snapshot.size;
          updateStats();
        }
      );
      statsUnsubscribersRef.current.push(pendingUnsub);

      const acceptedUnsub = onSnapshot(
        query(collection(db, 'organizationConnections'), where('status', '==', 'accepted')),
        (snapshot) => {
          counts.firestore.accepted = snapshot.size;
          firestoreAcceptedDocs = snapshot.docs;
          updateStats();
        }
      );
      statsUnsubscribersRef.current.push(acceptedUnsub);

      const rejectedUnsub = onSnapshot(
        query(collection(db, 'organizationConnections'), where('status', '==', 'rejected')),
        (snapshot) => {
          counts.firestore.rejected = snapshot.size;
          updateStats();
        }
      );
      statsUnsubscribersRef.current.push(rejectedUnsub);

      const allUnsub = onSnapshot(
        collection(db, 'organizationConnections'),
        (snapshot) => {
          counts.firestore.total = snapshot.size;
          updateStats();
        }
      );
      statsUnsubscribersRef.current.push(allUnsub);

    } catch (err: any) {
      console.error('❌ Error setting up stats listeners:', err);
    }
  };

  const formatDate = (date: any): string => {
    if (!date) return 'N/A';
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString();
    }
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const getConnectionTypeLabel = (type: 'org_to_athlete' | 'athlete_to_org' | 'org_to_coach' | 'coach_to_org'): string => {
    switch (type) {
      case 'org_to_athlete':
        return 'Organization → Athlete';
      case 'athlete_to_org':
        return 'Athlete → Organization';
      case 'org_to_coach':
        return 'Organization → Coach';
      case 'coach_to_org':
        return 'Coach → Organization';
      default:
        return 'Unknown';
    }
  };

  const getSenderRoleIcon = (role?: 'organization' | 'coach' | 'athlete'): string => {
    if (role === 'coach') return '👨‍🏫';
    if (role === 'athlete') return '🏃';
    return '🏢'; // Default to organization
  };

  const getRecipientRoleIcon = (role?: 'athlete' | 'organization' | 'coach'): string => {
    if (role === 'athlete') return '🏃';
    if (role === 'coach') return '👨‍🏫';
    return '🏢'; // Default to organization
  };

  const getSourceBadge = (source?: 'current' | 'migrated'): string => {
    return source === 'migrated' ? '📦 Migrated' : '⭐ Current';
  };

  const getDisplayName = (conn: OrganizationConnection, type: 'sender' | 'recipient'): string => {
    if (type === 'sender') {
      return conn.senderName || conn.organizationName || 'Unknown';
    } else {
      return conn.recipientName || conn.athleteName || 'Unknown';
    }
  };

  const getStatusLabel = (status: string): string => {
    if (status === 'approved') return 'accepted';
    if (status?.includes('sent')) return 'pending';
    if (status?.includes('accepted')) return 'accepted';
    if (status?.includes('rejected')) return 'rejected';
    return status;
  };

  return (
    <div className="connection-requests-container">
      <h2>🔗 Connection Analytics Dashboard</h2>
      <p className="subtitle">Peer-to-peer connection requests - Recipients accept/reject directly, no admin approval required</p>

      {/* Statistics */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{stats.totalConnections}</div>
            <div className="stat-label">Total Connections</div>
          </div>
          <div className="stat-card pending">
            <div className="stat-number">{stats.totalPending}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card accepted">
            <div className="stat-number">{stats.totalAccepted}</div>
            <div className="stat-label">Accepted</div>
          </div>
          <div className="stat-card rejected">
            <div className="stat-number">{stats.totalRejected}</div>
            <div className="stat-label">Rejected</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.acceptanceRate}%</div>
            <div className="stat-label">Acceptance Rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.averageDaysToAccept}</div>
            <div className="stat-label">Avg Days to Accept</div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          📊 All Connections ({stats?.totalConnections || 0})
        </button>
        <button
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          📬 Pending ({stats?.totalPending || 0})
        </button>
        <button
          className={`tab ${activeTab === 'accepted' ? 'active' : ''}`}
          onClick={() => setActiveTab('accepted')}
        >
          ✅ Accepted ({stats?.totalAccepted || 0})
        </button>
        <button
          className={`tab ${activeTab === 'rejected' ? 'active' : ''}`}
          onClick={() => setActiveTab('rejected')}
        >
          ❌ Rejected ({stats?.totalRejected || 0})
        </button>
        <button
          className={`tab ${activeTab === 'org_to_athlete' ? 'active' : ''}`}
          onClick={() => setActiveTab('org_to_athlete')}
        >
          🏢→🏃 Org → Athlete
        </button>
        <button
          className={`tab ${activeTab === 'athlete_to_org' ? 'active' : ''}`}
          onClick={() => setActiveTab('athlete_to_org')}
        >
          🏃→🏢 Athlete → Org
        </button>
        <button
          className={`tab ${activeTab === 'org_to_coach' ? 'active' : ''}`}
          onClick={() => setActiveTab('org_to_coach')}
        >
          🏢→👨‍🏫 Org → Coach
        </button>
        <button
          className={`tab ${activeTab === 'coach_to_org' ? 'active' : ''}`}
          onClick={() => setActiveTab('coach_to_org')}
        >
          👨‍🏫→🏢 Coach → Org
        </button>
      </div>

      {/* Error Message */}
      {error && <div className="error-message">{error}</div>}

      {/* Loading State */}
      {loading && <div className="loading">Loading connections...</div>}

      {/* Connections Table */}
      {!loading && (
        <div className="table-container">
          {connections.length === 0 ? (
            <div className="empty-state">
              No connections found for this filter
            </div>
          ) : (
            <>
              <table className="requests-table">
                <thead>
                  <tr>
                    <th>Sender</th>
                    <th>Recipient</th>
                    <th>Connection Type</th>
                    <th>Status</th>
                    <th>Created Date</th>
                    <th>Response Date</th>
                  </tr>
                </thead>
                <tbody>
                  {connections.map(conn => {
                    const displayStatus = getStatusLabel(conn.status);
                    const displaySender = getDisplayName(conn, 'sender');
                    const displayRecipient = getDisplayName(conn, 'recipient');

                    return (
                      <tr key={conn.id} className={`status-${displayStatus}`}>
                        <td className="sender-cell">
                          <span className="sender-role">
                            {getSenderRoleIcon(conn.senderRole)}
                          </span>
                          {displaySender}
                        </td>
                        <td className="recipient-cell">
                          <span className="recipient-role">
                            {getRecipientRoleIcon(conn.recipientRole)}
                          </span>
                          {displayRecipient}
                        </td>
                        <td className="connection-type-cell">
                          {conn.connectionType ? getConnectionTypeLabel(conn.connectionType) : 'Organization → Athlete'}
                        </td>
                        <td className="status-cell">
                          <span className={`status-badge ${displayStatus}`}>
                            {displayStatus === 'pending' && '📬 Pending'}
                            {displayStatus === 'accepted' && '✅ Accepted'}
                            {displayStatus === 'rejected' && '❌ Rejected'}
                          </span>
                        </td>
                        <td className="date-cell">{formatDate(conn.createdAt)}</td>
                        <td className="date-cell">
                          {displayStatus === 'pending'
                            ? '-'
                            : formatDate(displayStatus === 'accepted' ? conn.acceptedAt : conn.rejectedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination Controls */}
              <div className="pagination-container">
                <button
                  className="btn btn-secondary"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  ← Previous
                </button>
                <span className="pagination-info">
                  Page {currentPage} | Showing {connections.length} connections
                </span>
                <button
                  className="btn btn-secondary"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={connections.length < pageSize}
                >
                  Next →
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionRequests;
