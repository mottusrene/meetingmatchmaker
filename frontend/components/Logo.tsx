import Link from 'next/link';

export default function Logo({ className = "", newTab = false }: { className?: string; newTab?: boolean }) {
  return (
    <Link
      href="/"
      className={`font-bold tracking-tight transition-colors ${className}`}
      {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      Meeting<span className="font-extrabold">Matches</span>
    </Link>
  );
}
