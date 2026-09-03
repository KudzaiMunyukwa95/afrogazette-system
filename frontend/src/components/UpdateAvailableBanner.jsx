import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

// A rep who backgrounds the browser instead of closing it can keep running
// a build from days ago indefinitely — nothing about that tab ever asks
// the server for anything again until it's reloaded, so no amount of
// no-cache headers on index.html reaches it. This polls a tiny build-id
// file (regenerated on every deploy) and, on a mismatch, prompts a manual
// refresh rather than silently reloading — a silent reload mid-booking
// would just as easily discard whatever the rep was in the middle of
// typing.
const UpdateAvailableBanner = () => {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const knownBuildId = useRef(null);

    useEffect(() => {
        const checkVersion = async () => {
            try {
                const res = await fetch(`/build-id.txt?_=${Date.now()}`, { cache: 'no-store' });
                if (!res.ok) return;
                const buildId = (await res.text()).trim();
                if (!buildId) return;
                if (knownBuildId.current === null) {
                    knownBuildId.current = buildId;
                } else if (buildId !== knownBuildId.current) {
                    setUpdateAvailable(true);
                }
            } catch (err) {
                // Offline or a network hiccup — just skip this check, not worth surfacing.
            }
        };

        checkVersion();
        const interval = setInterval(checkVersion, CHECK_INTERVAL_MS);
        const onVisible = () => {
            if (document.visibilityState === 'visible') checkVersion();
        };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

    if (!updateAvailable) return null;

    return (
        <div className="fixed top-16 inset-x-0 z-[60] bg-gray-900 text-white px-4 py-2.5 flex items-center justify-center gap-3 shadow-lg text-sm">
            <span>A new version of AfroGazette is available.</span>
            <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg font-semibold tap-target"
            >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
        </div>
    );
};

export default UpdateAvailableBanner;
