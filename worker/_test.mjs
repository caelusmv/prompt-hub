const KEY = 'sk-DRCwwtVFRiQadqXDlk5sQC7M4cD34RW9fhSfAd63jwSFyKgK';
const body = {
  model: 'agnes-2.0-flash',
  messages: [{ role: 'user', content: '用一句话说你是谁' }]
};
const t0 = Date.now();
try {
  const r = await fetch('https://apihub.agnes-ai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY },
    body: JSON.stringify(body)
  });
  console.log('HTTP', r.status, '(' + (Date.now() - t0) + 'ms)');
  const text = await r.text();
  console.log('RAW:', text.slice(0, 800));
  try {
    const j = JSON.parse(text);
    console.log('CONTENT:', j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content);
  } catch (e) {}
} catch (e) {
  console.log('FETCH ERROR:', e.message);
}
