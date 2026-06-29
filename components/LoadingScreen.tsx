interface LoadingScreenProps {
  message?: string;
  subtitle?: string;
}

export function LoadingScreen({
  message = "Loading your experience",
  subtitle = "Just a moment...",
}: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <div className="flex justify-center mb-4">
            <div className="animate-spin h-16 w-16 border-4 border-[#d4a348] border-t-transparent rounded-full" />
          </div>
          <h2 className="text-3xl text-[#1a0f0a] font-semibold">{message}</h2>
          <p className="text-lg text-[#1a0f0a] max-w-md mx-auto">{subtitle}</p>
        </div>
        <div className="pt-8">
          <div className="flex justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#d4a348] animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-[#d4a348] animate-pulse delay-100" />
            <div className="w-2 h-2 rounded-full bg-[#d4a348] animate-pulse delay-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
