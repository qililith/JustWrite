import { useState } from "react";
import { useAuthStore } from "./authStore";

export function AuthModal() {
  const open = useAuthStore((s) => s.modalOpen);
  const error = useAuthStore((s) => s.error);
  const notice = useAuthStore((s) => s.notice);
  const busy = useAuthStore((s) => s.busy);
  const configured = useAuthStore((s) => s.configured);
  const closeModal = useAuthStore((s) => s.closeModal);
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={closeModal}>
      <form
        className="modal"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          if (busy || !configured) return;
          void (mode === "in" ? signIn(email, password) : signUp(email, password));
        }}
      >
        <h2>{mode === "in" ? "登录" : "注册"}</h2>
        {!configured ? (
          <p className="error">未配置云同步。本地写作不受影响。</p>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        {notice ? <p className="notice">{notice}</p> : null}
        <label>
          邮箱
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          密码
          <input
            type="password"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <div className="modal-actions">
          <button
            type="button"
            className="linkish"
            onClick={() => setMode(mode === "in" ? "up" : "in")}
          >
            {mode === "in" ? "没有账号？注册" : "已有账号？登录"}
          </button>
          <button type="submit" className="primary" disabled={busy || !configured}>
            {busy ? "请稍候" : mode === "in" ? "登录" : "注册"}
          </button>
        </div>
      </form>
    </div>
  );
}
