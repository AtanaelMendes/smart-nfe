import { useEffect, useId, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faExternalLink } from '@fortawesome/free-solid-svg-icons';
import Button from '../buttons/Button';
import PillsBadge from '../buttons/PillsBadge';
import Fieldset, { fieldInputClass } from './Fieldset';

const CustomDropdown = ({ id: providedId, label, options = [], onSelect, placeholder, showIconLink, hint }) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    useEffect(() => {
        const closeOutside = (event) => { if (!dropdownRef.current?.contains(event.target)) setIsOpen(false); };
        document.addEventListener('mousedown', closeOutside);
        return () => document.removeEventListener('mousedown', closeOutside);
    }, []);
    return <div ref={dropdownRef} className="relative w-full" onKeyDown={(event) => { if (event.key === 'Escape') setIsOpen(false); }}>
        <Fieldset control id={id} label={label} hint={hint}>
            <Button id={id} buttonType="ghost" block aria-haspopup="menu" aria-expanded={isOpen} onClick={() => setIsOpen((previous) => !previous)}
                className={fieldInputClass({ className: 'flex justify-between gap-3 text-left font-normal tracking-normal hover:bg-transparent dark:hover:bg-transparent focus-visible:ring-0' })}>
                <span className="truncate">{placeholder || 'Selecione um item'}</span>
                <FontAwesomeIcon icon={showIconLink ? faExternalLink : faChevronDown} className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
            </Button>
        </Fieldset>
        {isOpen && <div role="menu" className="absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            {options.map((option) => <Button role="menuitem" key={option.value} buttonType="ghost" block onClick={() => { onSelect?.(option.value); setIsOpen(false); }} className="justify-between rounded-none px-4 py-2.5 text-left font-normal tracking-normal">
                <span>{option.label}</span><PillsBadge type="default" small className="ml-3">{option.count}</PillsBadge>
            </Button>)}
        </div>}
    </div>;
};
export default CustomDropdown;
