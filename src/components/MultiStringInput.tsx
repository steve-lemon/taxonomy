import React, { useState, KeyboardEvent, useRef } from 'react';
import { X } from 'lucide-react';

interface MultiStringInputProps {
  value: any[];
  onChange: (value: any[]) => void;
  placeholder?: string;
  type?: 'text' | 'number' | 'email' | 'url';
  isWarning?: (val: any) => boolean;
}

export function MultiStringInput({ value = [], onChange, placeholder, type = 'text', isWarning }: MultiStringInputProps) {
  const [inputValue, setInputValue] = useState('');
  
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Ignore events that are part of IME composition to avoid cutting off Korean/CJK typing mid-way
    if (e.nativeEvent.isComposing) return;

    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      if (type === 'number' && isNaN(Number(trimmed))) {
        return;
      }
      onChange([...value, type === 'number' ? Number(trimmed) : trimmed]);
      setInputValue('');
    }
  };

  const removeTag = (indexToRemove: number) => {
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  // Ensure value is an array
  const safeValue = Array.isArray(value) ? value : (value ? [value] : []);

  return (
    <div 
      className="flex flex-wrap items-center gap-2 w-full bg-bg-base border border-border-subtle rounded-md p-1.5 focus-within:ring-1 focus-within:ring-accent focus-within:border-accent transition-colors cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {safeValue.map((tag, index) => {
        const warning = isWarning ? isWarning(tag) : false;
        return (
          <span 
            key={index}
            className={`flex items-center gap-1 border px-2 py-0.5 rounded-md text-[13px] ${warning ? 'bg-orange-500/10 border-orange-500/30 text-orange-700' : 'bg-surface-light border-border-subtle text-ink'}`}
          >
            {String(tag)}
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(index); }}
              className={`rounded-full p-0.5 ${warning ? 'text-orange-500 hover:text-red-500 hover:bg-red-500/10' : 'text-ink-dim hover:text-red-500 hover:bg-red-500/10'}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        );
      })}
      <input
        ref={inputRef}
        type={type}
        className="flex-1 min-w-[120px] bg-transparent border-none focus:outline-none text-[13px] text-ink px-1 py-0.5"
        placeholder={safeValue.length === 0 ? placeholder : ''}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
      />
    </div>
  );
}
