import React from 'react';

interface ColorInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function ColorInput({ value, onChange }: ColorInputProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        className="w-9 h-9 p-0.5 bg-bg-base border border-border-subtle rounded cursor-pointer shrink-0"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        type="text"
        className="w-full bg-bg-base border border-border-subtle text-ink rounded-md p-2 text-[13px] font-mono uppercase focus:outline-none focus:ring-1 focus:ring-accent"
        placeholder="#HEX / Color..."
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
