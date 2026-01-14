// Validation utilities for user input

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface CommentValidationOptions {
  minLength?: number;
  maxLength?: number;
  allowEmpty?: boolean;
  forbiddenWords?: string[];
  requireAlphanumeric?: boolean;
}

/**
 * Validate comment text input
 */
export const validateComment = (
  text: string,
  options: CommentValidationOptions = {}
): ValidationResult => {
  const {
    minLength = 1,
    maxLength = 500,
    allowEmpty = false,
    forbiddenWords = [],
    requireAlphanumeric = false
  } = options;

  // Trim whitespace for validation
  const trimmedText = text.trim();

  // Check if empty
  if (!allowEmpty && trimmedText.length === 0) {
    return {
      isValid: false,
      error: 'Comment cannot be empty'
    };
  }

  // Check minimum length
  if (trimmedText.length > 0 && trimmedText.length < minLength) {
    return {
      isValid: false,
      error: `Comment must be at least ${minLength} character${minLength > 1 ? 's' : ''} long`
    };
  }

  // Check maximum length
  if (trimmedText.length > maxLength) {
    return {
      isValid: false,
      error: `Comment cannot exceed ${maxLength} characters`
    };
  }

  // Check for forbidden words
  if (forbiddenWords.length > 0) {
    const lowerText = trimmedText.toLowerCase();
    const foundForbiddenWord = forbiddenWords.find(word =>
      lowerText.includes(word.toLowerCase())
    );

    if (foundForbiddenWord) {
      return {
        isValid: false,
        error: 'Comment contains inappropriate content'
      };
    }
  }

  // Check for alphanumeric requirement
  if (requireAlphanumeric && !/[a-zA-Z0-9]/.test(trimmedText)) {
    return {
      isValid: false,
      error: 'Comment must contain at least one letter or number'
    };
  }

  // Check for spam patterns (repeated characters)
  if (hasSpamPattern(trimmedText)) {
    return {
      isValid: false,
      error: 'Comment appears to be spam'
    };
  }

  return { isValid: true };
};

/**
 * Detect spam patterns in text
 */
const hasSpamPattern = (text: string): boolean => {
  // Check for excessive repeated characters (more than 5 in a row)
  if (/(.)\1{5,}/.test(text)) {
    return true;
  }

  // Check for excessive repeated words
  const words = text.toLowerCase().split(/\s+/);
  const wordCounts = words.reduce((acc, word) => {
    if (word.length > 2) { // Only count words longer than 2 characters
      acc[word] = (acc[word] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // If any word appears more than 3 times, consider it spam
  const maxWordCount = Math.max(...Object.values(wordCounts));
  if (maxWordCount > 3) {
    return true;
  }

  return false;
};

/**
 * Validate email address
 */
export const validateEmail = (email: string): ValidationResult => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email.trim()) {
    return {
      isValid: false,
      error: 'Email is required'
    };
  }

  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address'
    };
  }

  return { isValid: true };
};

/**
 * Password strength levels
 */
export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

/**
 * Password validation result with strength information
 */
export interface PasswordValidationResult extends ValidationResult {
  strength?: PasswordStrength;
  score?: number;
  suggestions?: string[];
  requirements?: {
    minLength: boolean;
    hasLowercase: boolean;
    hasUppercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
    startsWithUppercase?: boolean; // New requirement property
  };
}

/**
 * Password requirements configuration
 */
export interface PasswordRequirements {
  minLength: number;
  requireLowercase: boolean;
  requireUppercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
  requireStartsWithUppercase?: boolean; // New requirement
  forbiddenPatterns?: RegExp[];
}

/**
 * Default password requirements
 */
export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 10, // Updated to 10
  requireLowercase: true,
  requireUppercase: true,
  requireNumber: true,
  requireSpecialChar: true, // Enforce special char as well for security
  requireStartsWithUppercase: true, // New requirement
  forbiddenPatterns: [
    /(.)\1{2,}/, // No more than 2 consecutive identical characters
    /^(password|123456|qwerty|abc123|admin|user)$/i, // Common weak passwords
  ]
};

/**
 * Validate password strength with detailed feedback
 */
export const validatePassword = (
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
): PasswordValidationResult => {
  const { minLength, requireLowercase, requireUppercase, requireNumber, requireSpecialChar, requireStartsWithUppercase, forbiddenPatterns } = requirements;

  // Check individual requirements
  const hasMinLength = password.length >= minLength;
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const startsWithUppercase = requireStartsWithUppercase ? /^[A-Z]/.test(password) : true;

  const requirementChecks = {
    minLength: hasMinLength,
    hasLowercase: hasLowercase,
    hasUppercase: hasUppercase,
    hasNumber: hasNumber,
    hasSpecialChar: hasSpecialChar,
    startsWithUppercase: startsWithUppercase,
  };

  // Calculate score and strength
  const { score, strength } = calculatePasswordStrength(password, requirements);

  // Generate error messages and suggestions
  const errors: string[] = [];
  const suggestions: string[] = [];

  if (!hasMinLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
    suggestions.push(`Add ${minLength - password.length} more characters`);
  }

  if (requireStartsWithUppercase && !startsWithUppercase) {
    errors.push('Password must start with a capital letter');
    suggestions.push('Capitalize the first letter');
  }

  if (requireLowercase && !hasLowercase) {
    errors.push('Password must contain at least one lowercase letter');
    suggestions.push('Add a lowercase letter (a-z)');
  }

  if (requireUppercase && !hasUppercase) {
    errors.push('Password must contain at least one uppercase letter');
    suggestions.push('Add an uppercase letter (A-Z)');
  }

  if (requireNumber && !hasNumber) {
    errors.push('Password must contain at least one number');
    suggestions.push('Add a number (0-9)');
  }

  if (requireSpecialChar && !hasSpecialChar) {
    errors.push('Password must contain at least one special character');
    suggestions.push('Add a special character (!@#$%^&*)');
  }

  // Check forbidden patterns
  if (forbiddenPatterns) {
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(password)) {
        errors.push('Password contains forbidden patterns');
        suggestions.push('Avoid common passwords and repeated characters');
        break;
      }
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    error: errors.length > 0 ? errors[0] : undefined,
    strength,
    score,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    // @ts-ignore - appending new property to requirementChecks which might need type update in interface if strictly typed elsewhere, but let's update interface below
    requirements: requirementChecks,
  };
};

/**
 * Calculate password strength score and level
 */
export const calculatePasswordStrength = (
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
): { score: number; strength: PasswordStrength } => {
  let score = 0;
  const { minLength, requireLowercase, requireUppercase, requireNumber, requireSpecialChar } = requirements;

  // Length scoring (0-30 points)
  if (password.length >= minLength) {
    score += Math.min(30, password.length * 2);
  }

  // Character variety scoring (0-40 points)
  if (requireLowercase && /[a-z]/.test(password)) score += 10;
  if (requireUppercase && /[A-Z]/.test(password)) score += 10;
  if (requireNumber && /\d/.test(password)) score += 10;
  if (requireSpecialChar && /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score += 10;

  // Bonus points for additional complexity (0-30 points)
  if (password.length >= 12) score += 10; // Long password bonus
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score += 10; // Special char bonus
  if (!/(.)\1{2,}/.test(password)) score += 10; // No repeated characters bonus

  // Determine strength level
  let strength: PasswordStrength;
  if (score >= 80) strength = 'strong';
  else if (score >= 60) strength = 'good';
  else if (score >= 40) strength = 'fair';
  else strength = 'weak';

  return { score: Math.min(100, score), strength };
};

/**
 * Get password strength color for UI display
 */
export const getPasswordStrengthColor = (strength: PasswordStrength): string => {
  switch (strength) {
    case 'weak': return '#ef4444'; // red-500
    case 'fair': return '#f97316'; // orange-500
    case 'good': return '#eab308'; // yellow-500
    case 'strong': return '#22c55e'; // green-500
    default: return '#6b7280'; // gray-500
  }
};

/**
 * Get password strength text for UI display
 */
export const getPasswordStrengthText = (strength: PasswordStrength): string => {
  switch (strength) {
    case 'weak': return 'Weak';
    case 'fair': return 'Fair';
    case 'good': return 'Good';
    case 'strong': return 'Strong';
    default: return 'Unknown';
  }
};

/**
 * Validate password confirmation match
 */
export const validatePasswordConfirmation = (
  password: string,
  confirmPassword: string
): ValidationResult => {
  if (!confirmPassword.trim()) {
    return {
      isValid: false,
      error: 'Please confirm your password'
    };
  }

  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: 'Passwords do not match'
    };
  }

  return { isValid: true };
};

/**
 * Check if password meets minimum requirements for login
 */
export const validatePasswordForLogin = (password: string): ValidationResult => {
  if (!password.trim()) {
    return {
      isValid: false,
      error: 'Password is required'
    };
  }

  if (password.length < 6) {
    return {
      isValid: false,
      error: 'Password must be at least 6 characters long'
    };
  }

  return { isValid: true };
};

/**
 * Validate username
 */
export const validateUsername = (username: string): ValidationResult => {
  const trimmedUsername = username.trim();

  if (trimmedUsername.length < 3) {
    return {
      isValid: false,
      error: 'Username must be at least 3 characters long'
    };
  }

  if (trimmedUsername.length > 30) {
    return {
      isValid: false,
      error: 'Username cannot exceed 30 characters'
    };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
    return {
      isValid: false,
      error: 'Username can only contain letters, numbers, underscores, and hyphens'
    };
  }

  if (/^[_-]|[_-]$/.test(trimmedUsername)) {
    return {
      isValid: false,
      error: 'Username cannot start or end with underscore or hyphen'
    };
  }

  return { isValid: true };
};

/**
 * Sanitize text input to prevent XSS
 */
export const sanitizeText = (text: string): string => {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Check if text contains only whitespace
 */
export const isWhitespaceOnly = (text: string): boolean => {
  return text.trim().length === 0;
};

/**
 * Get character count for display
 */
export const getCharacterCount = (text: string, maxLength: number): {
  count: number;
  remaining: number;
  isOverLimit: boolean;
} => {
  const count = text.length;
  const remaining = maxLength - count;
  const isOverLimit = count > maxLength;

  return {
    count,
    remaining,
    isOverLimit
  };
};