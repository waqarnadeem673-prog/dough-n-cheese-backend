import { Construction, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

type AdminPlaceholderProps = {
  title: string;
  description: string;
};

export default function AdminPlaceholder({ title, description }: AdminPlaceholderProps) {
  return (
    <div className="mx-auto max-w-4xl py-12 text-center">
      <div className="rounded-3xl border border-white/5 bg-ink-900/60 p-10 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-400 mb-6">
          <Construction className="h-8 w-8" />
        </div>

        <h1 className="text-2xl font-bold text-ink-50 sm:text-3xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-400 leading-relaxed">
          {description}
        </p>

        <div className="mt-8 flex justify-center">
          <Link
            to="/admin"
            className="btn-secondary text-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Overview</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
