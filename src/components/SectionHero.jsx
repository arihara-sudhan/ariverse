export default function SectionHero({
  heading,
  headingContent,
  description,
  imageUrl,
  fallbackHeading,
  children,
  descriptionAfterImageOnMobile = false,
}) {
  const resolvedHeading = heading || fallbackHeading;
  const shouldSeparateDescription = Boolean(description) && descriptionAfterImageOnMobile;
  return (
    <section
      className={`hero section-hero${descriptionAfterImageOnMobile ? ' description-after-image-mobile' : ''}`}
      aria-label="Section hero"
    >
      <section className="intro">
        <h1>
          {headingContent || <span className="intro-title-main">{resolvedHeading}</span>}
          {!shouldSeparateDescription && description ? <span className="intro-title-sub">{description}</span> : null}
        </h1>
        {shouldSeparateDescription ? <p className="intro-title-sub section-hero-mobile-after-image">{description}</p> : null}
        {children}
      </section>

      {imageUrl ? (
        <figure className="photo-block">
          <img loading="eager" fetchPriority="high" decoding="async" draggable={false} src={imageUrl} alt={resolvedHeading || 'Section hero'} />
        </figure>
      ) : null}
    </section>
  );
}
