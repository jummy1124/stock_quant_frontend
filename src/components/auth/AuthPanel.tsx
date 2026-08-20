// src/components/auth/AuthPanel.tsx
// 切換登入 / 註冊 / 忘記密碼的容器；未登入時於「我的紀錄」分頁顯示。
import { useState } from "react";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { useT } from "../../i18n";

type Mode = "login" | "register" | "forgot";

export function AuthPanel() {
  const [mode, setMode] = useState<Mode>("login");
  const t = useT();

  return (
    <div className="auth-panel">
      <div className="auth-card">
        <p className="auth-card__lead">{t("auth.lead")}</p>
        {mode === "login" && (
          <LoginForm
            onSwitch={() => setMode("register")}
            onForgot={() => setMode("forgot")}
          />
        )}
        {mode === "register" && <RegisterForm onSwitch={() => setMode("login")} />}
        {mode === "forgot" && <ForgotPasswordForm onBack={() => setMode("login")} />}
      </div>
    </div>
  );
}
