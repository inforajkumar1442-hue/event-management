export default function ConfirmModal({ open, title, message, onConfirm, onCancel, confirmLabel, confirmClass }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100 mb-2">{title}</h3>
        <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className={confirmClass || 'btn-danger flex-1'}>{confirmLabel || 'Yes'}</button>
          <button onClick={onCancel} className="btn-secondary flex-1">No, Cancel</button>
        </div>
      </div>
    </div>
  );
}
