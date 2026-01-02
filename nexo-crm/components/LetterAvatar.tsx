import React from 'react';

interface LetterAvatarProps {
    name: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const LetterAvatar: React.FC<LetterAvatarProps> = ({ name, size = 'md', className = '' }) => {
    const firstLetter = name.trim().charAt(0).toUpperCase();

    const sizeClasses = {
        xs: 'w-6 h-6 text-[10px]',
        sm: 'w-8 h-8 text-[12px]',
        md: 'w-10 h-10 text-[14px]',
        lg: 'w-12 h-12 text-[16px]',
        xl: 'w-24 h-24 text-[24px]'
    };

    return (
        <div
            className={`flex items-center justify-center rounded-full bg-[#121214] border border-zinc-800 shadow-lg shadow-black/20 font-bold text-zinc-100 uppercase tracking-tighter ${sizeClasses[size]} ${className}`}
            style={{
                boxShadow: size === 'xl' ? '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)' : undefined
            }}
        >
            {firstLetter}
        </div>
    );
};

export default LetterAvatar;
