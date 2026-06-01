// This route handles the OAuth redirect from Google
// It extracts the access token from the URL hash and closes the popup
export async function GET(request) {
  const html = `
<!DOCTYPE html>
<html>
<head><title>Connecting Gmail...</title></head>
<body>
<script>
  // The token comes back in the URL hash from Google's implicit flow
  // Pass it back to the opener window and close this popup
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  if (token && window.opener) {
    window.opener.postMessage({ type: 'gmail_token', token }, window.location.origin);
  }
  window.close();
</script>
<p style="font-family:system-ui;text-align:center;margin-top:40px;color:#64748b;">Connecting your Gmail account...</p>
</body>
</html>`;
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}
