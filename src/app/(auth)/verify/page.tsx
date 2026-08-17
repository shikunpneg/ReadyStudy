export default function VerifyPage() {
  return (
    <div className="rounded-md border bg-card p-8 text-center">
      <h1 className="mb-2 text-xl font-semibold">✉️ 请查收邮件</h1>
      <p className="text-sm text-muted-foreground">
        我们已向您的邮箱发送了一封登录邮件，点击邮件中的链接即可登录。
      </p>
    </div>
  );
}