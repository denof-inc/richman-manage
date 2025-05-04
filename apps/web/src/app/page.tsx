import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <h1 className="text-4xl font-bold text-text-base">リッチマンマネージ</h1>
        <p className="text-text-muted">スタイルガイドに基づいたUIコンポーネントのサンプルページ</p>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-text-base">ボタンコンポーネントのサンプル</h2>
          <div className="flex flex-wrap gap-4">
            <Button>プライマリボタン</Button>
            <Button variant="accent">アクセントボタン</Button>
            <Button variant="outline">アウトラインボタン</Button>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button size="sm">小さいサイズのボタン</Button>
            <Button size="md">標準サイズのボタン</Button>
            <Button size="lg">大きいサイズのボタン</Button>
          </div>
        </div>
      </div>
    </main>
  );
}
