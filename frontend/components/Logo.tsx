import Link from 'next/link';

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`font-bold tracking-tight transition-colors ${className}`}>
      Meeting<span className="font-extrabold">Matches</span>
    </Link>
  );
}
