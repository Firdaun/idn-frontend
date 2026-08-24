import { Link } from "react-router";

export default function Footer() {
    return (
        <footer className="bg-black border-t border-zinc-900 text-zinc-400 text-sm py-10 mt-auto">
            <div className="max-w-375 w-full mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                    <span className="font-semibold text-base text-zinc-200">IDN Live</span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-zinc-400 text-sm">Streaming & Analytics Platform</span>
                </div>

                <div className="flex items-center gap-6 text-sm text-zinc-400">
                    <Link to="/" className="hover:text-zinc-200 transition-colors">Home</Link>
                    <Link to="/streaming" className="hover:text-zinc-200 transition-colors">Streaming</Link>
                    <Link to="/analytics" className="hover:text-zinc-200 transition-colors">Analytics</Link>
                </div>

                <p className="text-xs text-zinc-500">
                    © {new Date().getFullYear()} IDN Live Companion
                </p>
            </div>
        </footer>
    );
}
