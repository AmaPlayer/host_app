import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import './DeleteAccountModal.css';

interface DeleteAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ isOpen, onClose }) => {
    const { deleteAccount, currentUser } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmText, setConfirmText] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const isEmailAuth = currentUser?.providerData.some(p => p.providerId === 'password');
    const CONFIRM_PHRASE = "delete my account";

    const handleDelete = async () => {
        if (confirmText.toLowerCase() !== CONFIRM_PHRASE) {
            setError(`Please type "${CONFIRM_PHRASE}" to confirm.`);
            return;
        }

        if (isEmailAuth && !password) {
            setError('Password is required.');
            return;
        }

        try {
            setIsDeleting(true);
            setError(null);
            await deleteAccount(password);
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to delete account.');
            setIsDeleting(false);
        }
    };

    return (
        <div className="delete-modal-overlay">
            <div className="delete-modal-content" role="dialog" aria-modal="true">
                <button className="delete-modal-close" onClick={onClose} aria-label="Close">
                    <X size={24} />
                </button>

                <div className="delete-modal-header">
                    <div className="delete-icon-wrapper">
                        <AlertTriangle size={32} />
                    </div>
                    <h2>Delete Account</h2>
                </div>

                <div className="delete-modal-body">
                    <div className="warning-box">
                        <h3>⚠️ This action is permanent!</h3>

                        {currentUser?.email && (
                            <div className="account-identity-warning" style={{
                                background: 'rgba(0,0,0,0.2)',
                                padding: '8px',
                                borderRadius: '4px',
                                margin: '10px 0',
                                textAlign: 'center',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                                <span style={{ fontSize: '0.9em', color: '#ccc' }}>Deleting account for:</span>
                                <div style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#fff', wordBreak: 'break-all' }}>
                                    {currentUser.email}
                                </div>
                            </div>
                        )}

                        <p>
                            Deleting your account will <strong>permanently remove</strong> all of your data, including:
                        </p>
                        <ul>
                            <li>Your profile and personal information</li>
                            <li>All of your posts, moments, and videos</li>
                            <li>Your comments, likes, and interactions</li>
                        </ul>
                        <p>You cannot undo this action.</p>
                    </div>

                    <div className="verification-section">
                        <p className="instruction-text">
                            To verify, please type <strong>{CONFIRM_PHRASE}</strong> below:
                        </p>
                        {/* Dummy inputs to trick browser autofill */}
                        <input style={{ display: 'none' }} type="text" name="fakeusernameremembered" />
                        <input style={{ display: 'none' }} type="password" name="fakepasswordremembered" />

                        <input
                            type="text"
                            name="delete_confirmation_phrase"
                            id="delete_confirmation"
                            className="confirm-input"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder={CONFIRM_PHRASE}
                            autoComplete="off"
                            data-lpignore="true"
                            data-form-type="other"
                        />

                        {isEmailAuth && (
                            <div className="password-field">
                                <p className="instruction-text">Enter your password to confirm:</p>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="confirm-input"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Current Password"
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {error && <div className="error-message">{error}</div>}
                </div>

                <div className="delete-modal-footer">
                    <button className="cancel-btn" onClick={onClose} disabled={isDeleting}>
                        Cancel
                    </button>
                    <button
                        className="delete-btn"
                        onClick={handleDelete}
                        disabled={isDeleting || confirmText.toLowerCase() !== CONFIRM_PHRASE}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete My Account'}
                        {!isDeleting && <Trash2 size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteAccountModal;
