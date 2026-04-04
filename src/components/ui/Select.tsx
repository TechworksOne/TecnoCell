export default function Select({ onValueChange, ...props }: any) {
  return (
    <select 
      className="border rounded-lg p-2 bg-white" 
      onChange={(e) => onValueChange?.(e.target.value)}
      {...props} 
    />
  );
}
