import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-primary">リッチマンManage</h1>
          <p className="mt-2 text-text-muted">不動産管理システム - スタイルガイド適用版</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-border-default bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-primary">ボタンコンポーネント</h2>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button>プライマリ</Button>
                <Button variant="accent">アクセント</Button>
                <Button variant="outline">アウトライン</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm">小さいサイズ</Button>
                <Button>標準サイズ</Button>
                <Button size="lg">大きいサイズ</Button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border-default bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-primary">サービス一覧</h2>
            <ul className="space-y-2">
              <li className="flex items-center justify-between rounded p-2 transition-colors hover:bg-primary-light/10">
                <span>借入管理</span>
                <Link href="/loans">
                  <Button variant="outline" size="sm">
                    一覧を見る
                  </Button>
                </Link>
              </li>
              <li className="flex items-center justify-between rounded p-2 transition-colors hover:bg-primary-light/10">
                <span>物件管理</span>
                <Button variant="outline" size="sm" disabled>
                  準備中
                </Button>
              </li>
              <li className="flex items-center justify-between rounded p-2 transition-colors hover:bg-primary-light/10">
                <span>テナント管理</span>
                <Button variant="outline" size="sm" disabled>
                  準備中
                </Button>
              </li>
            </ul>
          </div>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
          <h2 className="mb-4 text-xl font-semibold text-primary">カラーパレット</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 rounded bg-primary"></div>
              <span className="mt-2 text-sm">Primary</span>
              <code className="text-xs">#295E4F</code>
            </div>
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 rounded bg-primary-light"></div>
              <span className="mt-2 text-sm">Primary Light</span>
              <code className="text-xs">#3F7B69</code>
            </div>
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 rounded bg-accent"></div>
              <span className="mt-2 text-sm">Accent</span>
              <code className="text-xs">#D4AF37</code>
            </div>
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 rounded bg-accent-light"></div>
              <span className="mt-2 text-sm">Accent Light</span>
              <code className="text-xs">#F4D06F</code>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
