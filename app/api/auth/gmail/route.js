export async function GET(request) {
  const html = `
<!DOCTYPE html>
<html>
<head><title>Connecting Gmail...</title></head>
<body>
<script>
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  const expiresIn = parseInt(params.get('expires_in') || '3600');
  if (token && window.opener) {
    window.opener.postMessage(
      { type: 'gmail_token', token, expiresIn },
      window.location.origin
    );
  }
  window.close();
</script>
<p style="font-family:system-ui;text-align:center;margin-top:40px;color:#64748b;">Connecting your Gmail account...</p>
</body>
</html>`;
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}
