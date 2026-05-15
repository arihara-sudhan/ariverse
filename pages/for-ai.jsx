import Header from '../src/components/Header';
import ForAI from '../src/components/ForAI/ForAI';

export default function ForAIPage() {
  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <ForAI />
      </main>
    </div>
  );
}
