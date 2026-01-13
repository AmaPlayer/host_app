import { supabase } from '../../lib/supabase';
import {
  OrganizationConnection,
  SendConnectionRequestData,
  AcceptConnectionRequestData,
  RejectConnectionRequestData,
  ConnectionType,
  ConnectionStatus
} from '../../types/models/organizationConnection';
import notificationService from '../notificationService';

class OrganizationConnectionService {

  async sendConnectionRequest(data: SendConnectionRequestData): Promise<OrganizationConnection> {
    try {
      const { data: sender } = await supabase.from('users').select('id').eq('uid', data.senderId).single();
      const { data: receiver } = await supabase.from('users').select('id, role').eq('uid', data.recipientId).single();
      if (!sender || !receiver) throw new Error('Users not found');

      const { data: connection, error } = await supabase
        .from('organization_connections')
        .insert({
          connection_type: data.connectionType,
          sender_id: sender.id,
          recipient_id: receiver.id,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Log Activity
      await supabase.from('connection_activity').insert({
        connection_id: connection.id,
        action: 'request_sent',
        actor_id: sender.id,
        target_id: receiver.id,
        sender_role: data.senderRole,
        receiver_role: receiver.role
      });

      // Notification
      await notificationService.sendConnectionRequestNotification(
        data.recipientId, data.senderName, data.senderRole as any, data.senderPhotoURL, data.connectionType
      );

      return this.mapToModel(connection, data);
    } catch (error) {
      console.error('Error sending connection request:', error);
      throw error;
    }
  }

  async getPendingRequestsForUser(userId: string): Promise<OrganizationConnection[]> {
    try {
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
      if (!user) return [];

      const { data, error } = await supabase
        .from('organization_connections')
        .select(`
          *,
          sender:users!sender_id (uid, display_name, photo_url, role)
        `)
        .eq('recipient_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      return (data || []).map(row => this.mapToModel(row));
    } catch (error) {
      return [];
    }
  }

  async acceptConnectionRequest(data: AcceptConnectionRequestData): Promise<void> {
    try {
      // Fetch connection with roles
      const { data: conn } = await supabase
        .from('organization_connections')
        .select(`
          *,
          sender:users!sender_id(role),
          recipient:users!recipient_id(role)
        `)
        .eq('id', data.connectionId)
        .single();

      if (!conn) throw new Error('Not found');

      // 1. Create Friendship
      const { data: friendship, error: fError } = await supabase
        .from('friendships')
        .insert({
          user1_id: conn.sender_id,
          user2_id: conn.recipient_id,
          status: 'active'
        })
        .select()
        .single();

      if (fError) throw fError;

      // 2. Update Connection
      await supabase
        .from('organization_connections')
        .update({ status: 'accepted', accepted_at: new Date().toISOString(), friendship_id: friendship.id })
        .eq('id', data.connectionId);

      // 3. Activity
      await supabase.from('connection_activity').insert({
        connection_id: data.connectionId,
        action: 'request_accepted',
        actor_id: conn.recipient_id,
        target_id: conn.sender_id,
        sender_role: conn.sender?.role,
        receiver_role: conn.recipient?.role
      });
    } catch (error) {
      console.error('Error accepting connection:', error);
      throw error;
    }
  }

  async checkConnectionExists(senderId: string, recipientId: string, type: ConnectionType): Promise<any> {
    try {
      const { data: u1 } = await supabase.from('users').select('id').eq('uid', senderId).single();
      const { data: u2 } = await supabase.from('users').select('id').eq('uid', recipientId).single();
      if (!u1 || !u2) return null;

      const { data } = await supabase
        .from('organization_connections')
        .select('*')
        .eq('sender_id', u1.id)
        .eq('recipient_id', u2.id)
        .eq('connection_type', type)
        .neq('status', 'rejected')
        .maybeSingle();

      return data ? this.mapToModel(data) : null;
    } catch (e) {
      return null;
    }
  }

  async cancelConnectionRequest(connectionId: string, userId: string): Promise<void> {
    // Note: userId is not used in delete logic unless we verify ownership
    await supabase.from('organization_connections').delete().eq('id', connectionId);
  }

  async rejectConnectionRequest(data: RejectConnectionRequestData): Promise<void> {
    const { error } = await supabase
      .from('organization_connections')
      .update({ status: 'rejected', rejected_at: new Date().toISOString(), rejection_reason: data.reason })
      .eq('id', data.connectionId);
    if (error) throw error;
  }

  async getIncomingPendingRequests(userId: string): Promise<OrganizationConnection[]> {
    return this.getPendingRequestsForUser(userId); // Re-use logic
  }

  async getAcceptedConnections(userId: string): Promise<OrganizationConnection[]> {
    try {
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
      if (!user) return [];

      const { data, error } = await supabase
        .from('organization_connections')
        .select(`*, sender:users!sender_id(uid, display_name, photo_url, role)`)
        .eq('recipient_id', user.id)
        .eq('status', 'accepted');

      if (error) throw error;
      return (data || []).map(row => this.mapToModel(row));
    } catch (error) {
      return [];
    }
  }

  async getConnectionStatusBetweenUsers(uid1: string, uid2: string): Promise<any> {
    try {
      const { data: u1 } = await supabase.from('users').select('id').eq('uid', uid1).single();
      const { data: u2 } = await supabase.from('users').select('id').eq('uid', uid2).single();
      if (!u1 || !u2) return 'none';

      const { data, error } = await supabase
        .from('organization_connections')
        .select('status')
        .or(`and(sender_id.eq.${u1.id},recipient_id.eq.${u2.id}),and(sender_id.eq.${u2.id},recipient_id.eq.${u1.id})`)
        .maybeSingle();

      return data?.status || 'none';
    } catch (e) {
      return 'none';
    }
  }

  private mapToModel(data: any, originalData?: any): OrganizationConnection {
    return {
      id: data.id,
      connectionType: data.connection_type,
      senderId: data.sender?.uid || originalData?.senderId,
      senderName: data.sender?.display_name || originalData?.senderName,
      senderPhotoURL: data.sender?.photo_url || originalData?.senderPhotoURL,
      recipientId: originalData?.recipientId || '',
      status: data.status,
      createdAt: data.created_at
    } as any;
  }
}

export const organizationConnectionService = new OrganizationConnectionService();
