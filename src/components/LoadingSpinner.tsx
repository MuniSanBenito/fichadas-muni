interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export default function LoadingSpinner({
  message = "Cargando...",
  size = "md",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div
        className={`animate-spin rounded-full border-b-2 border-[#b6c544] mb-4 ${sizeClasses[size]}`}
      ></div>
      <p className="text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
}
