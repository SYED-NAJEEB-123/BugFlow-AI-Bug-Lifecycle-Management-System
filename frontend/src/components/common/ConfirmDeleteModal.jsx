import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Trash2 } from 'lucide-react';

export const ConfirmDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Confirmation',
  itemName = 'this item',
  isLoading = false
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="space-y-4 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <p className="text-xs font-semibold leading-relaxed">
            Warning: This action cannot be undone. All related data will be permanently removed.
          </p>
        </div>

        <p className="text-xs text-slate-300">
          Are you sure you want to delete <span className="font-bold text-rose-400">{itemName}</span>?
        </p>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="danger" icon={Trash2} isLoading={isLoading} onClick={onConfirm}>
            Delete Permanently
          </Button>
        </div>
      </div>
    </Modal>
  );
};
