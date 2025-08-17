export default function AuthCodeError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="card mx-auto max-w-md">
        <h1 className="mb-4 text-center text-2xl font-semibold text-red-600">認証エラー</h1>
        <p className="text-center text-text-base">
          認証コードの処理に問題が発生しました。
          <br />
          <a href="/login" className="text-primary hover:underline">
            ログインページ
          </a>
          に戻ってもう一度お試しください。
        </p>
      </div>
    </div>
  );
}
