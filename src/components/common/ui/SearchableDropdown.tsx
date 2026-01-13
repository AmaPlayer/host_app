import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import './SearchableDropdown.css';

interface Option {
    id: string;
    name: string;
}

interface SearchableDropdownProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    disabled?: boolean;
    error?: string;
    className?: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Select option',
    label,
    disabled = false,
    error,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Find selected option object
    const selectedOption = options.find(opt => opt.id === value);

    // Filter options based on search term
    const filteredOptions = options.filter(opt =>
        opt.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm(''); // Reset search when closing
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Focus search input when opening
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    const handleSelect = (optionId: string) => {
        onChange(optionId);
        setIsOpen(false);
        setSearchTerm('');
    };

    const toggleDropdown = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };

    return (
        <div
            className={`searchable-dropdown-container ${className} ${disabled ? 'disabled' : ''}`}
            ref={dropdownRef}
        >
            {label && <label className="dropdown-label">{label}</label>}

            <div
                className={`dropdown-trigger ${isOpen ? 'open' : ''} ${error ? 'error' : ''}`}
                onClick={toggleDropdown}
            >
                <span className={`selected-value ${!selectedOption ? 'placeholder' : ''}`}>
                    {selectedOption ? selectedOption.name : placeholder}
                </span>
                <ChevronDown size={16} className={`dropdown-arrow ${isOpen ? 'rotated' : ''}`} />
            </div>

            {isOpen && (
                <div className="dropdown-menu">
                    <div className="dropdown-search-container">
                        <Search size={14} className="search-icon" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="dropdown-search-input"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking input
                        />
                    </div>

                    <div className="dropdown-options-list">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.id}
                                    className={`dropdown-option ${option.id === value ? 'selected' : ''}`}
                                    onClick={() => handleSelect(option.id)}
                                >
                                    <span className="option-text">{option.name}</span>
                                    {option.id === value && <Check size={14} className="check-icon" />}
                                </div>
                            ))
                        ) : (
                            <div className="no-options">No options found</div>
                        )}
                    </div>
                </div>
            )}

            {error && <span className="dropdown-error-message">{error}</span>}
        </div>
    );
};

export default SearchableDropdown;
