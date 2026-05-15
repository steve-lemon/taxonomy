import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
}

export function ConfirmDeleteModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Delete' }: ConfirmDeleteModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-bg-base border border-border-subtle rounded-xl p-6 max-w-md w-full shadow-lg">
        <div className="flex items-center gap-3 text-red-500 mb-4">
          <AlertCircle className="w-6 h-6" />
          <h3 className="text-lg font-serif text-ink">{title}</h3>
        </div>
        <p className="text-sm text-ink-dim mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>
  );
}
