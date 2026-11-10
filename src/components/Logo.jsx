export default function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Commons logo">
      <rect width="48" height="48" rx="13" fill="#ffffff" />
      <path d="M24 6c-7.2 0-13 5.6-13 12.6C11 28.4 24 42 24 42s13-13.6 13-23.4C37 11.6 31.2 6 24 6z" fill="#0f766e" />
      <circle cx="24" cy="18.5" r="7.5" fill="#f59e0b" />
      <path d="M20.2 18.8l2.8 2.8 5-5.4" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
