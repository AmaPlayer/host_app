import { supabase } from '../../lib/supabase';

/**
 * Username validation result
 */
export interface UsernameValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Username availability result with suggestions
 */
export interface UsernameAvailabilityResult {
  available: boolean;
  suggestions?: string[];
}

/**
 * Username validation service
 * Provides validation, availability checking, and username generation utilities
 */
class UsernameValidationService {

  // Username format regex: 3-20 characters, alphanumeric + underscores only
  private readonly USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
  private readonly MIN_LENGTH = 3;
  private readonly MAX_LENGTH = 20;

  /**
   * Validate username format
   * @param username - Username to validate
   * @returns Validation result with error message if invalid
   */
  validateUsernameFormat(username: string): UsernameValidationResult {
    if (!username || username.trim().length === 0) {
      return {
        valid: false,
        error: 'Username is required'
      };
    }

    const trimmed = username.trim();

    if (trimmed.length < this.MIN_LENGTH) {
      return {
        valid: false,
        error: `Username must be at least ${this.MIN_LENGTH} characters`
      };
    }

    if (trimmed.length > this.MAX_LENGTH) {
      return {
        valid: false,
        error: `Username cannot exceed ${this.MAX_LENGTH} characters`
      };
    }

    if (!/^[a-zA-Z]/.test(trimmed)) {
      return {
        valid: false,
        error: 'Username must start with a letter'
      };
    }

    if (!this.USERNAME_REGEX.test(trimmed)) {
      return {
        valid: false,
        error: 'Username can only contain letters, numbers, and underscores'
      };
    }

    return { valid: true };
  }

  /**
   * Check if username is available in database
   * @param username - Username to check
   * @param excludeUid - Optional Firebase UID to exclude (for updating own username)
   * @returns True if available, false if taken
   */
  async checkUsernameAvailability(username: string, excludeUid?: string): Promise<boolean> {
    try {
      const lowerUsername = username.toLowerCase().trim();

      let query = supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('username', lowerUsername);

      if (excludeUid) {
        query = query.neq('uid', excludeUid);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error checking username availability:', error);
        throw error;
      }

      return count === 0;
    } catch (error) {
      console.error('Error in checkUsernameAvailability:', error);
      throw error;
    }
  }

  /**
   * Generate alternative username suggestions when the desired username is taken
   * @param username - Base username
   * @param maxSuggestions - Maximum number of suggestions to generate (default: 5)
   * @returns Array of available username suggestions
   */
  async suggestAlternativeUsernames(username: string, maxSuggestions: number = 5): Promise<string[]> {
    const suggestions: string[] = [];
    const baseUsername = username.toLowerCase().trim();

    // Strategy 1: Add numbers (1-99)
    for (let i = 1; i <= 99 && suggestions.length < maxSuggestions; i++) {
      const suggestion = `${baseUsername}_${i}`;
      if (suggestion.length <= this.MAX_LENGTH) {
        const available = await this.checkUsernameAvailability(suggestion);
        if (available) {
          suggestions.push(suggestion);
        }
      }
    }

    // Strategy 2: Add random numbers (if still need more)
    if (suggestions.length < maxSuggestions) {
      for (let i = 0; i < 10 && suggestions.length < maxSuggestions; i++) {
        const randomNum = Math.floor(Math.random() * 900) + 100; // 3-digit number
        const suggestion = `${baseUsername}${randomNum}`;
        if (suggestion.length <= this.MAX_LENGTH) {
          const available = await this.checkUsernameAvailability(suggestion);
          if (available && !suggestions.includes(suggestion)) {
            suggestions.push(suggestion);
          }
        }
      }
    }

    // Strategy 3: Add year (if still need more)
    if (suggestions.length < maxSuggestions) {
      const currentYear = new Date().getFullYear();
      const suggestion = `${baseUsername}_${currentYear}`;
      if (suggestion.length <= this.MAX_LENGTH) {
        const available = await this.checkUsernameAvailability(suggestion);
        if (available && !suggestions.includes(suggestion)) {
          suggestions.push(suggestion);
        }
      }
    }

    return suggestions;
  }

  /**
   * Generate username from display name
   * Converts "John Doe" -> "johndoe"
   * @param displayName - User's display name
   * @returns Generated username
   */
  generateUsernameFromDisplayName(displayName: string): string {
    if (!displayName || displayName.trim().length === 0) {
      return '';
    }

    let username = displayName
      .toLowerCase()
      .trim()
      // Remove all non-alphanumeric characters except spaces
      .replace(/[^a-z0-9\s_]/g, '')
      // Replace spaces with underscores
      .replace(/\s+/g, '_')
      // Remove consecutive underscores
      .replace(/_+/g, '_')
      // Remove leading/trailing underscores
      .replace(/^_+|_+$/g, '');

    // Ensure starts with a letter
    if (username && !/^[a-z]/.test(username)) {
      // If starts with number or underscore, prepend 'user_'
      username = `user_${username}`;
    }

    // Truncate to max length
    if (username.length > this.MAX_LENGTH) {
      username = username.substring(0, this.MAX_LENGTH);
    }

    // Ensure minimum length (pad with numbers if needed)
    if (username.length < this.MIN_LENGTH) {
      const padding = Math.floor(Math.random() * 90) + 10; // 2-digit number
      username = `${username}${padding}`.substring(0, this.MAX_LENGTH);
    }

    return username;
  }

  /**
   * Check username availability with suggestions
   * @param username - Username to check
   * @param excludeUid - Optional Firebase UID to exclude
   * @returns Availability result with suggestions if taken
   */
  async checkUsernameAvailabilityWithSuggestions(
    username: string,
    excludeUid?: string
  ): Promise<UsernameAvailabilityResult> {
    const available = await this.checkUsernameAvailability(username, excludeUid);

    if (available) {
      return { available: true };
    }

    const suggestions = await this.suggestAlternativeUsernames(username);
    return {
      available: false,
      suggestions
    };
  }

  /**
   * Reserved usernames that cannot be used
   */
  private readonly RESERVED_USERNAMES = [
    'admin',
    'administrator',
    'system',
    'root',
    'api',
    'app',
    'support',
    'help',
    'info',
    'contact',
    'about',
    'terms',
    'privacy',
    'settings',
    'profile',
    'user',
    'users',
    'test',
    'undefined',
    'null',
    'me',
    'you'
  ];

  /**
   * Check if username is reserved
   * @param username - Username to check
   * @returns True if reserved, false otherwise
   */
  isReservedUsername(username: string): boolean {
    const lowerUsername = username.toLowerCase().trim();
    return this.RESERVED_USERNAMES.includes(lowerUsername);
  }

  /**
   * Comprehensive username validation (format + reserved check)
   * @param username - Username to validate
   * @returns Validation result
   */
  validateUsername(username: string): UsernameValidationResult {
    // First check format
    const formatResult = this.validateUsernameFormat(username);
    if (!formatResult.valid) {
      return formatResult;
    }

    // Check if reserved
    if (this.isReservedUsername(username)) {
      return {
        valid: false,
        error: 'This username is reserved and cannot be used'
      };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const usernameValidationService = new UsernameValidationService();

// Export class for testing
export default UsernameValidationService;
