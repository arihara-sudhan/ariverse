export default function ShelfCard({ item }) {
  return (
    <article className="aris-shelf-card">
      <div className="aris-shelf-cover">
        <img src={item.imageUrl} alt={item.name || 'Shelf item'} loading="lazy" decoding="async" />
      </div>
      <h3>{item.name || 'Untitled Item'}</h3>
      <p>{item.subname || ''}</p>
    </article>
  );
}
