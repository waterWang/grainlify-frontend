import { PRFilterType } from '../../types';
import { GlassDropdown } from '../../../../shared/components';

interface PRFilterDropdownProps {
  value: PRFilterType;
  onChange: (value: PRFilterType) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  /** Number of currently active filters (status filter, search...), shown as a
   * small count badge on the trigger button. Hidden when 0/undefined. */
  activeCount?: number;
}

const filterOptions: PRFilterType[] = ['All states', 'Open', 'Merged', 'Closed', 'Draft'];

export function PRFilterDropdown({ value, onChange, isOpen, onToggle, onClose, activeCount }: PRFilterDropdownProps) {
  return (
    <GlassDropdown
      value={value}
      onChange={onChange}
      options={filterOptions}
      isOpen={isOpen}
      onToggle={onToggle}
      onClose={onClose}
      badgeCount={activeCount}
    />
  );
}