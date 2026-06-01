import { useState, useRef, useLayoutEffect, cloneElement, type ReactElement } from 'react';
import { cn } from '@/lib/utils';

export type NavItem = {
  id: string | number;
  icon: ReactElement<any>;
  label?: string;
  onClick?: () => void;
};

type LimelightNavProps = {
  items: NavItem[];
  defaultActiveIndex?: number;
  onTabChange?: (index: number) => void;
  className?: string;
};

export const LimelightNav = ({
  items,
  defaultActiveIndex = 0,
  onTabChange,
  className,
}: LimelightNavProps) => {
  const [activeIndex, setActiveIndex] = useState(defaultActiveIndex);
  const [isReady, setIsReady] = useState(false);
  const navItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const limelightRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (items.length === 0) return;
    const limelight = limelightRef.current;
    const activeItem = navItemRefs.current[activeIndex];
    if (limelight && activeItem) {
      const newLeft = activeItem.offsetLeft + activeItem.offsetWidth / 2 - limelight.offsetWidth / 2;
      limelight.style.left = `${newLeft}px`;
      if (!isReady) setTimeout(() => setIsReady(true), 50);
    }
  }, [activeIndex, isReady, items]);

  if (items.length === 0) return null;

  const handleClick = (index: number, itemOnClick?: () => void) => {
    setActiveIndex(index);
    onTabChange?.(index);
    itemOnClick?.();
  };

  return (
    <nav
      className={cn(
        'relative inline-flex items-center h-12 rounded-xl px-1',
        'bg-[rgba(10,15,28,0.75)] backdrop-blur-xl border border-white/[0.06]',
        'shadow-[0_4px_24px_rgba(0,0,0,0.4)]',
        className
      )}
    >
      {items.map(({ id, icon, label, onClick }, index) => (
        <button
          key={id}
          ref={el => { navItemRefs.current[index] = el; }}
          className={cn(
            'relative z-20 flex h-full items-center justify-center gap-2 px-5 cursor-pointer rounded-lg',
            'font-mono text-xs font-semibold tracking-widest transition-all duration-200 select-none',
            activeIndex === index ? 'text-white' : 'text-gray-600 hover:text-gray-400'
          )}
          onClick={() => handleClick(index, onClick)}
          aria-label={label}
        >
          {cloneElement(icon, {
            className: cn(
              'w-3.5 h-3.5 transition-all duration-200',
              activeIndex === index ? 'opacity-100' : 'opacity-40'
            ),
          })}
          {label && <span className="hidden sm:inline">{label}</span>}
        </button>
      ))}

      {/* Sliding limelight bar */}
      <div
        ref={limelightRef}
        className={cn(
          'absolute top-0 z-10 w-12 h-[2px] rounded-full',
          isReady ? 'transition-[left] duration-300 ease-in-out' : ''
        )}
        style={{
          left: '-999px',
          backgroundColor: 'var(--threat-primary)',
          boxShadow: '0 0 20px var(--threat-primary), 0 40px 25px color-mix(in srgb, var(--threat-primary) 15%, transparent)',
        }}
      >
        <div
          className="absolute left-[-40%] top-[2px] w-[180%] h-10 pointer-events-none"
          style={{
            clipPath: 'polygon(5% 100%, 22% 0, 78% 0, 95% 100%)',
            background: 'linear-gradient(to bottom, color-mix(in srgb, var(--threat-primary) 18%, transparent), transparent)',
          }}
        />
      </div>
    </nav>
  );
};
