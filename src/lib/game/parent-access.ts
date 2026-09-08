// A short-lived capability only in this tab's memory. Never persist it or the PIN.
let access: { token: string; expiresAt: number } | null = null;
export const getParentAccess = () => (access && access.expiresAt > Date.now() ? access : null);
export const setParentAccess = (value: typeof access) => {
  access = value;
};
