import React from 'react';

interface UserAvatarProps {
    name?: string;
    email?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ name, email, size = 'md', className = '' }) => {
    const initial = (name || email || '?').charAt(0).toUpperCase();

    const sizeClasses = {
        sm: 'w-6 h-6 text-[10px]',
        md: 'w-9 h-9 text-xs',
        lg: 'w-12 h-12 text-sm',
        xl: 'w-32 h-32 text-4xl',
    };

    return (
        <div
            className={`
        ${sizeClasses[size]} 
        bg-black border border-zinc-800 
        flex items-center justify-center 
        rounded-full font-bold text-indigo-400 
        shadow-inner overflow-hidden shrink-0
        ${className}
      `}
        >
            {initial}
        </div>
    );
};

export default UserAvatar;
