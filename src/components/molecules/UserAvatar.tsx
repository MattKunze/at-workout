import { useState } from 'react';
import { UserCircleIcon } from "@heroicons/react/24/outline";

interface UserAvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  placeholder?: string; // e.g. "AB" for Alice Bob
}

export const UserAvatar = ({ src, alt, size = 'md', placeholder }: UserAvatarProps) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const containerClass = `${sizeClasses[size]} rounded-full overflow-hidden bg-base-300 flex items-center justify-center text-base-content font-bold`;

  if (!src || imageError) {
    if (placeholder) {
      return (
        <div className={containerClass}>
          {placeholder.slice(0, 2).toUpperCase()}
        </div>
      );
    }
    return (
      <div className={`${containerClass} bg-transparent`}>
        <UserCircleIcon className="w-full h-full" />
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <img
        src={src}
        alt={alt || 'User Avatar'}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />
    </div>
  );
};
