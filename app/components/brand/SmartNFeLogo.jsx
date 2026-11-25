import Image from 'next/image';

const SOURCES = {
  color: '/images/smartnfe-logo.png',
  white: '/images/smartnfe-logo-white.png',
};

export default function SmartNFeLogo({ variant = 'color', className = 'h-10 w-auto', priority = false }) {
  return (
    <Image
      src={SOURCES[variant] || SOURCES.color}
      alt="SmartNFe"
      width={640}
      height={140}
      priority={priority}
      className={className}
    />
  );
}
