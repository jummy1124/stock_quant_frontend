// src/components/auth/UserMenu.tsx
// 頂部列：顯示登入者 email + 登出鈕；未登入 / 載入中時不顯示登出。
import { useAuth } from "../../auth/AuthContext";
import { useT } from "../../i18n";

export function UserMenu() {
  const { status, user, logout } = useAuth();
  const t = useT();

  if (status === "loading") {
    return <div className="user-menu user-menu--loading" aria-hidden="true" />;
  }

  if (status !== "authenticated" || !user) {
    return <div className="user-menu user-menu--anon">{t("auth.anon")}</div>;
  }

  const label = user.displayName?.trim() || user.email;

  return (
    <div className="user-menu">
      <span className="user-menu__name" title={user.email}>
        {label}
      </span>
      <button className="user-menu__logout" onClick={() => void logout()}>
        {t("auth.logout")}
      </button>
    </div>
  );
}
