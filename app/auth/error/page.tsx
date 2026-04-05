export default function AuthError() {
  return (
    <div className="max-w-[480px] mx-auto min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-3">
        <h1 className="font-serif font-bold text-2xl text-ink">
          Something went wrong
        </h1>
        <p className="font-sans text-sm text-ink/60">
          The magic link may have expired. Please try signing in again.
        </p>
        <a
          href="/"
          className="inline-block mt-4 px-4 py-2.5 rounded-[8px] bg-coral text-white text-sm font-sans font-medium hover:bg-coral/90 transition-colors"
        >
          Back to Accent
        </a>
      </div>
    </div>
  );
}
