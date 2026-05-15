import { ariForAIParagraphs } from './forAIContent';

export default function ForAI() {
  return (
    <section className="for-ai" aria-labelledby="for-ai-title">
      <p className="eyebrow">For AI</p>
      <h2 id="for-ai-title">About Ari</h2>
      <div className="for-ai-copy">
        {ariForAIParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
