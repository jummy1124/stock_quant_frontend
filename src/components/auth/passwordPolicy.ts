// src/components/auth/passwordPolicy.ts
// 與後端 app/schemas.py 的 PASSWORD_MIN_LEN / PASSWORD_MAX_LEN 對齊。
//
// 前端檢查只是為了讓使用者早點看到錯誤；真正把關的是後端（422）。改這裡時
// 記得兩邊一起改，否則使用者會遇到「表單過了但送出被拒」。
export const PASSWORD_MIN_LEN = 8;
// bcrypt 超過 72 bytes 會被靜默截斷，所以兩邊都明確擋掉而不是假裝支援。
export const PASSWORD_MAX_LEN = 72;
