import { useContent } from "../context/ContentContext";

export function Brand({ className = "" }: { className?: string }) {
  const { content } = useContent();
  const { logoSrc, name } = content.site;

  if (logoSrc) {
    return <img className={`brand-logo ${className}`} src={logoSrc} alt={name} />;
  }

  return (
    <span className={`brand-wordmark ${className}`} aria-label={name}>
      {name}
    </span>
  );
}
