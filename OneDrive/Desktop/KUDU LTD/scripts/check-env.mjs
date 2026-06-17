const required = ['VITE_ADMIN_INVITE_CODE'];
const missing = required.filter((key) => !String(process.env[key] || '').trim());

const isVercelBuild = Boolean(process.env.VERCEL);

if (missing.length && isVercelBuild) {
  console.error(
    `[env] Missing required env vars for deployment: ${missing.join(', ')}.`,
  );
  process.exit(1);
}

if (missing.length) {
  console.warn(
    `[env] Missing optional local env vars: ${missing.join(', ')}. Build continues for UI work.`,
  );
}
