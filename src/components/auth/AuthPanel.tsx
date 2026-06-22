// src/components/auth/AuthPanel.tsx
// 切換登入 / 註冊的容器；未登入時於「我的紀錄」分頁顯示。
import { useState } from "react";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

export function AuthPanel() {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div className="auth-panel">
      <div className="auth-card">
        <p className="auth-card__lead">登入後即可保存你的個股紀錄（目標價 / 成本價），跨裝置同步。</p>
        {mode === "login" ? (
          <LoginForm onSwitch={() => setMode("register")} />
        ) : (
          <RegisterForm onSwitch={() => setMode("login")} />
        )}
      </div>
    </div>
  );
}
