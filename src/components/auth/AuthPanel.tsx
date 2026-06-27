// src/components/auth/AuthPanel.tsx
// 切換登入 / 註冊的容器；未登入時於「我的紀錄」分頁顯示。
import { useState } from "react";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { useT } from "../../i18n";

export function AuthPanel() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const t = useT();

  return (
    <div className="auth-panel">
      <div className="auth-card">
        <p className="auth-card__lead">{t("auth.lead")}</p>
        {mode === "login" ? (
          <LoginForm onSwitch={() => setMode("register")} />
        ) : (
          <RegisterForm onSwitch={() => setMode("login")} />
        )}
      </div>
    </div>
  );
}
