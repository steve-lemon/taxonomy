import React from 'react';
import { Status } from '../../types/taxonomy';

interface StatusToggleProps {
  status: Status;
  onChange: (status: Status) => void;
}

export function StatusToggle({ status, onChange }: StatusToggleProps) {
  const isActive = status === 'active';

  return (
    <label className="flex items-center cursor-pointer gap-2 shrink-0 group">
      <div className={`relative flex items-center h-[22px] rounded-full p-1 transition-colors ${isActive ? 'bg-accent/10 border border-accent/20' : 'bg-red-500/10 border border-red-500/20'}`}>
        <span className={`text-[10px] pl-1.5 pr-2 font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-accent' : 'text-red-500'}`}>
          {isActive ? 'Active' : 'Dep.'}
        </span>
        <div className="relative w-7 h-4">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={isActive}
            onChange={(e) => onChange(e.target.checked ? 'active' : 'deprecated')}
          />
          <div className={`w-full h-full rounded-full transition-colors ${isActive ? 'bg-accent' : 'bg-red-400'}`}></div>
          <div className={`absolute top-[2px] left-[2px] bg-white w-3 h-3 rounded-full transition-transform ${isActive ? 'translate-x-[12px]' : 'translate-x-0'}`}></div>
        </div>
      </div>
    </label>
  );
}
