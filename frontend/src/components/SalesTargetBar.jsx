import React from 'react';
import { motion } from 'framer-motion';
import { Target, Sparkles } from 'lucide-react';

// Contacts logged vs required — same look as the dashboard's revenue target
// bar. Green once the target is hit, amber when behind the pace the target
// calls for right now, red otherwise (on pace, still working towards it).
const SalesTargetBar = ({ label, done, target, expectedByNow, caption }) => {
  const percent = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
  const complete = target > 0 && done >= target;
  const behindPace = !complete && expectedByNow > 0 && done < expectedByNow;

  const fill = complete
    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
    : behindPace
      ? 'bg-gradient-to-r from-amber-500 to-amber-400'
      : 'bg-gradient-to-r from-red-600 to-red-500';

  return (
    <div className={`bg-white rounded-2xl p-4 md:p-5 border shadow-sm ${complete ? 'border-emerald-200' : 'border-gray-100'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${complete ? 'bg-emerald-50' : 'bg-red-50'}`}>
            {complete
              ? <Sparkles className="h-4 w-4 text-emerald-600" />
              : <Target className="h-4 w-4 text-red-600" />}
          </div>
          <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
        </div>
        <span className={`text-2xl font-bold tabular-nums ${complete ? 'text-emerald-600' : 'text-gray-900'}`}>
          {done}<span className="text-base font-medium text-gray-400"> / {target}</span>
        </span>
      </div>

      <div className="relative h-3.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className={`h-full rounded-full ${fill}`}
        />
        {!complete && expectedByNow > 0 && target > 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-gray-700/40"
            style={{ left: `${Math.min(100, (expectedByNow / target) * 100)}%` }}
            title="Where you should be by now"
          />
        )}
      </div>

      <p className={`text-xs mt-2 ${complete ? 'text-emerald-700 font-medium' : behindPace ? 'text-amber-700' : 'text-gray-500'}`}>
        {complete
          ? 'Target hit — nice work.'
          : caption || `${Math.max(0, target - done)} to go`}
      </p>
    </div>
  );
};

export default SalesTargetBar;
