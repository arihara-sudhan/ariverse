import LikeButton from './LikeButton';

export default function ShelfCard({ item, likesCount = 0 }) {
  return (
    <article className="aris-shelf-card">
      <div className="aris-shelf-like-badge">
        <LikeButton
          endpoint="/api/content/reactions"
          entryId={item.id}
          initialCount={likesCount}
          storageNamespace="shelf"
          className="aris-shelf-like"
        />
      </div>
      <div className="aris-shelf-cover">
        <img src={item.imageUrl} alt={item.name || 'Shelf item'} loading="lazy" decoding="async" />
      </div>
      <h3>{item.name || 'Untitled Item'}</h3>
      <p>{item.subname || ''}</p>
    </article>
  );
}
