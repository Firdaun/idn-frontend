import { useState } from 'react';

export default function UserAvatar({
    user,
    sizeClass = 'w-9 h-9 text-xs',
    borderClass = 'border-zinc-800'
}) {
    const [imgFailed, setImgFailed] = useState(false);
    const initial = (user?.userName || '?').charAt(0).toUpperCase();

    if (user?.userAvatar && !imgFailed) {
        return (
            <img
                src={user.userAvatar}
                alt={user.userName || 'User'}
                onError={() => setImgFailed(true)}
                className={`${sizeClass} rounded-full object-cover border ${borderClass} shrink-0 bg-zinc-800`}
                loading="lazy"
            />
        );
    }

    const charCode = initial.charCodeAt(0) || 0;
    const bgColors = [
        'from-rose-500 to-pink-600',
        'from-indigo-500 to-purple-600',
        'from-emerald-500 to-teal-600',
        'from-amber-500 to-orange-600',
        'from-cyan-500 to-blue-600',
        'from-violet-500 to-fuchsia-600'
    ];
    const colorClass = bgColors[charCode % bgColors.length];

    return (
        <div
            className={`${sizeClass} rounded-full bg-linear-to-br ${colorClass} border ${borderClass} flex items-center justify-center font-bold text-white shrink-0 shadow-inner`}
        >
            {initial}
        </div>
    );
}
