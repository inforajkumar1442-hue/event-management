import { useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '../api/axios';

export default function CouponInput({ eventId, onCouponApplied, onCouponRemoved }) {
  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);

  const handleApply = async () => {
    if (!code.trim()) return;
    setApplying(true);
    setResult(null);
    try {
      const { data } = await api.post('/coupons/validate', { code, eventId });
      setResult(data);
      if (data.valid) {
        onCouponApplied(data);
      }
    } catch {
      setResult({ valid: false, message: 'Failed to validate coupon' });
    } finally {
      setApplying(false);
    }
  };

  const handleRemove = () => {
    setCode('');
    setResult(null);
    onCouponRemoved();
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Have a coupon?</p>
      {result?.valid ? (
        <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{result.coupon.code}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              (-₹{result.discountAmount})
            </span>
          </div>
          <button onClick={handleRemove} className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter code"
            className="input text-sm py-2 flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          />
          <button
            onClick={handleApply}
            disabled={applying || !code.trim()}
            className="btn-secondary text-sm py-2 px-3"
          >
            {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
          </button>
        </div>
      )}
      {result && !result.valid && (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <XCircle className="w-3 h-3" /> {result.message}
        </p>
      )}
    </div>
  );
}
