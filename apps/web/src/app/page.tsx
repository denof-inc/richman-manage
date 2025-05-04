import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="bg-background min-h-screen p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <h1 className="text-text-base text-4xl font-bold">リッチマンManage</h1>
        <p className="text-text-muted">スタイルガイドに基づいたUIコンポーネントのサンプル</p>

        <div className="space-y-4">
          <h2 className="text-text-base text-2xl font-semibold">ボタンコンポーネント</h2>
          <div className="flex flex-wrap gap-4">
            <Button>プライマリ</Button>
            <Button variant="accent">アクセント</Button>
            <Button variant="outline">アウトライン</Button>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button size="sm">小さい</Button>
            <Button size="md">標準</Button>
            <Button size="lg">大きい</Button>
          </div>
        </div>
      </div>
    </main>
  );
}
