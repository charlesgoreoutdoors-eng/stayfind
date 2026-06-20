export async function GET(request) {
  const html = `
<!DOCTYPE html>
<html>
<head><title>Connecting Gmail...</title></head>
<body>
<script>
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const error = params.get('error');
  if (window.opener) {
    if (code) {
      window.opener.postMessage({ type: 'gmail_code', code }, window.location.origin);
    } else {
      window.opener.postMessage({ type: 'gmail_error', error: error || 'cancelled' }, window.location.origin);
    }
  }
  window.close();
</script>
<p style="font-family:system-ui;text-align:center;margin-top:40px;color:#64748b;">Connecting your Gmail account...</p>
</body>
</html>`;
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}
