// Use the original SVG as a mask so functional icons inherit the surrounding text colour.
// Parent controls provide accessible labels; these icons are decorative.
export function UiIcon({ src, className = 'size-6' }: { src: string; className?: string }) {
  return <span aria-hidden="true" className={`inline-block shrink-0 bg-current [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] ${className}`} style={{ maskImage: `url("${src}")`, WebkitMaskImage: `url("${src}")` }} />
}
